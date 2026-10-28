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

const DOC_ORDER: Record<string, number> = { manual: 0, datasheet: 1, quickstart: 2 }

/**
 * Reads the best documents among those found, by itself: up to two PDFs of
 * this exact model (user guide, data sheet, quick start: the drawings of the
 * panels are often in the quick start) and one product page (photos, and the
 * manuals it links to). A document that cannot be read makes way for the
 * next one; when none can, the error says why for each. `docs` can also be
 * one document the user picked.
 */
export async function research(docs: FoundDoc[], model: string, onStep: (msg: string) => void): Promise<Research> {
  const single = docs.length === 1
  const pdfs = docs
    .filter((d) => d.kind === 'pdf' && (d.exact || single))
    .sort((a, b) => (DOC_ORDER[a.doc ?? ''] ?? 3) - (DOC_ORDER[b.doc ?? ''] ?? 3))
  const pages = docs.filter((d) => d.kind === 'page' && (d.exact || single)).sort((a, b) => Number(b.official) - Number(a.official))

  const parts: string[] = []
  const used: Research['used'] = []
  const failed: string[] = []
  let pdf: File | undefined
  let images: string[] = []
  let linked: Page['docs'] = []

  // One product page: the maker's first, a shop's when the maker's cannot be read (shops list the specifications).
  for (const page of pages.slice(0, 3)) {
    try {
      onStep(`Lecture de la page ${page.host}…`)
      const got = await readUrl(page.url, model)
      if (!('page' in got) || !readable(got.page.text)) throw new Error('page vide')
      parts.push(`${got.page.title || page.title} (page produit) :\n${got.page.text}`)
      used.push({ title: page.title, url: page.url })
      images = got.page.images
      linked = got.page.docs
      break
    } catch (e) {
      failed.push(`${page.host} : ${(e as Error).message}`)
    }
  }
  // Up to two PDFs, the manual the page links to included.
  const fromPage = linked.filter((d) => d.pdf && !pdfs.some((p) => p.url === d.url)).map((d) => ({ url: d.url, title: d.title, doc: d.doc, host: new URL(d.url).hostname }))
  const candidates = [...pdfs, ...fromPage].sort((a, b) => (DOC_ORDER[a.doc ?? ''] ?? 3) - (DOC_ORDER[b.doc ?? ''] ?? 3))
  let read = 0
  for (const d of candidates.slice(0, 5)) {
    if (read >= 2) break
    try {
      onStep(`Lecture de « ${d.title} »…`)
      const r = await pdfText(d.url)
      parts.splice(read, 0, `${d.title} :\n${r.text}`)
      used.splice(read, 0, { title: d.title, url: d.url })
      pdf ??= r.pdf
      read++
    } catch (e) {
      failed.push(`${d.title} : ${(e as Error).message}`)
    }
  }
  if (!parts.length) throw new Error(failed.length ? `aucun document lisible (${failed.join(' ; ')})` : 'aucun document de ce modèle exact parmi les résultats')
  return { text: parts.join('\n\n'), pdf, images, used }
}
