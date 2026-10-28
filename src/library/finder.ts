import { AI_PROXY_URL } from './ai'

/*
 * "Le chercher pour vous", done by itself: the relay searches the web for
 * the product's documents (/find), the best ones are picked (the user guide
 * of this very model describes every socket of the panels), read here with
 * pdf.js, then analysed: their text, and their panel pages as images.
 */

export interface FoundDoc {
  title: string
  url: string
  host: string
  kind: 'pdf' | 'page'
  /** On the manufacturer's own site (or its group's file server). */
  official: boolean
  /** Names this very model, not only its range. */
  exact?: boolean
  /** What kind of document it is, when its name says it. */
  doc?: 'manual' | 'datasheet' | 'quickstart'
}

interface Page {
  title: string
  text: string
  url: string
  images: string[]
  docs: { url: string; title: string; pdf: boolean; doc?: FoundDoc['doc'] }[]
}

export async function relay(path: string, body: unknown) {
  if (!AI_PROXY_URL) throw new Error('le relais SynopGig n’est pas disponible sur cette version.')
  const res = await fetch(`${AI_PROXY_URL.replace(/\/+$/, '')}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? `erreur ${res.status}`)
  return res
}

export async function findDocs(brand: string, model: string): Promise<FoundDoc[]> {
  return ((await (await relay('/find', { brand, model })).json()) as { results: FoundDoc[] }).results
}

/** A web address read by the relay: a page, or a file (PDF, image). */
export async function readUrl(url: string, model = ''): Promise<{ page: Page } | { file: Blob; type: string }> {
  const res = await relay('/read', { url, model })
  const type = res.headers.get('Content-Type') ?? ''
  return /json/i.test(type) ? { page: (await res.json()) as Page } : { file: await res.blob(), type }
}

const readable = (t: string) => t.replace(/\s/g, '').length > 200

// The relay's OCR refused once (not in the plan, or out of quota): not asked again this visit.
let ocrRefused = false

/**
 * A PDF, read here with pdf.js (its panel pages then go to the AI as
 * images); a scan without text is read by the relay's OCR when it has one.
 */
export async function pdfText(url: string): Promise<{ text: string; pdf: File }> {
  const got = await readUrl(url)
  if (!('file' in got) || !/pdf/i.test(got.type)) throw new Error('ce lien ne mène pas à un PDF')
  const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'fiche.pdf')
  const pdf = new File([got.file], /\.pdf$/i.test(name) ? name : `${name}.pdf`, { type: 'application/pdf' })
  const { pdfToText } = await import('./pdfText')
  const text = await pdfToText(pdf)
  if (readable(text) || ocrRefused) return { text, pdf }
  try {
    const ocr = (await (await relay('/ocr', { url })).json()) as { text: string }
    return { text: ocr.text, pdf }
  } catch {
    ocrRefused = true
    return { text, pdf }
  }
}

export interface Research {
  /** What the analysis reads: the documents one after the other. */
  text: string
  /** The main PDF, whose panel pages the AI sees as images. */
  pdf?: File
  /** Product photos found on the way. */
  images: string[]
  /** The documents read, for the user to check. */
  used: { title: string; url: string }[]
}

/**
 * Reads the best documents among those found, by itself: the user guide of
 * this exact model, else its data sheet, plus its product page (photos, and
 * the manuals it links to when the search found none). `docs` can also be
 * one document the user picked.
 */
export async function research(docs: FoundDoc[], model: string, onStep: (msg: string) => void): Promise<Research> {
  const pdfs = docs.filter((d) => d.kind === 'pdf')
  const best = (kind?: FoundDoc['doc']) => pdfs.find((d) => d.exact && d.doc === kind)
  const chosen = [best('manual') ?? best('datasheet'), best('manual') ? best('datasheet') : undefined].filter((d) => d !== undefined)
  if (!chosen.length && pdfs[0] && docs.length === 1) chosen.push(pdfs[0])
  const page = docs.find((d) => d.kind === 'page' && d.official && d.exact) ?? docs.find((d) => d.kind === 'page' && (d.official || docs.length === 1))

  const parts: string[] = []
  const used: Research['used'] = []
  let pdf: File | undefined
  let images: string[] = []
  let linked: Page['docs'] = []

  if (page) {
    try {
      onStep(`Lecture de la page ${page.host}…`)
      const got = await readUrl(page.url, model)
      if ('page' in got) {
        parts.push(`${got.page.title || page.title} (page produit) :\n${got.page.text}`)
        used.push({ title: page.title, url: page.url })
        images = got.page.images
        linked = got.page.docs
      }
    } catch {
      // The documents alone, then.
    }
  }
  // The manual the page links to, when the search found none for this model.
  const fromPage = !chosen.some((d) => d.doc === 'manual') ? linked.find((d) => d.pdf && d.doc === 'manual') : undefined
  const toRead = [...chosen.map((d) => ({ url: d.url, title: d.title })), ...(fromPage ? [{ url: fromPage.url, title: fromPage.title }] : [])].slice(0, 2)
  for (const d of toRead) {
    try {
      onStep(`Lecture de « ${d.title} »…`)
      const r = await pdfText(d.url)
      parts.unshift(`${d.title} :\n${r.text}`)
      used.unshift({ title: d.title, url: d.url })
      pdf ??= r.pdf
    } catch {
      // Unreadable: the next document.
    }
  }
  if (!parts.length) throw new Error('aucun des documents trouvés n’a pu être lu')
  return { text: parts.join('\n\n'), pdf, images, used }
}
