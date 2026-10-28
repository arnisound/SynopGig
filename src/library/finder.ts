import { AI_PROXY_URL } from './ai'

/*
 * "Le chercher pour vous": the relay looks for a product's documentation
 * (worker/relay.js, /find), the user picks the right document, then the relay
 * fetches it (/doc) and the usual analysis builds the sheet.
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

async function post(path: string, body: unknown) {
  if (!AI_PROXY_URL) throw new Error('la recherche n’est pas disponible sur cette version.')
  return fetch(`${AI_PROXY_URL.replace(/\/+$/, '')}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

const failure = async (res: Response) => new Error(((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? `erreur ${res.status}`)

export async function findDocs(brand: string, model: string): Promise<FoundDoc[]> {
  const res = await post('/find', { brand, model })
  if (!res.ok) throw await failure(res)
  return ((await res.json()) as { results: FoundDoc[] }).results
}

async function readPdf(res: Response, url: string) {
  const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'fiche.pdf')
  const pdf = new File([await res.blob()], /\.pdf$/i.test(name) ? name : `${name}.pdf`, { type: 'application/pdf' })
  const { pdfToText } = await import('./pdfText')
  return { pdf, text: await pdfToText(pdf) }
}

export interface LoadedDoc {
  text: string
  pdf?: File
  images: string[]
  /** The manual the product page linked to, read with it. */
  manual?: { url: string; title: string }
}

/**
 * The chosen document: a PDF (read here, like a dropped file) or the text of
 * a page. A product page rarely describes the panels; the user guide or data
 * sheet it links to does: it is read too, and the two texts go together.
 */
export async function loadDoc(doc: FoundDoc, model = '', onStep?: (msg: string) => void, companions: FoundDoc[] = []): Promise<LoadedDoc> {
  const res = await post('/doc', { url: doc.url, model })
  if (!res.ok) throw await failure(res)
  if (/pdf/i.test(res.headers.get('Content-Type') ?? '')) {
    const sheet = await readPdf(res, doc.url)
    // A data sheet or quick start rarely lists every socket: the manual found with it is read too.
    if (doc.doc !== 'manual') {
      for (const c of companions.filter((c) => c.kind === 'pdf' && c.url !== doc.url).slice(0, 1)) {
        try {
          onStep?.(`Lecture de « ${c.title} » en complément…`)
          const r = await post('/doc', { url: c.url, model })
          if (!r.ok || !/pdf/i.test(r.headers.get('Content-Type') ?? '')) continue
          const more = await readPdf(r, c.url)
          if (more.text.replace(/\s/g, '').length < 200) continue
          return { text: `${sheet.text}\n\n${c.title} :\n${more.text}`, pdf: more.pdf, images: [], manual: { url: c.url, title: c.title } }
        } catch {
          // The sheet alone, then.
        }
      }
    }
    return { ...sheet, images: [] }
  }
  const page = (await res.json()) as { title: string; text: string; images?: string[]; docs?: { url: string; title: string }[] }
  // The documents the page links to, then the manuals the search found for this model.
  const linked = [...(page.docs ?? []).slice(0, 2), ...companions.filter((c) => c.kind === 'pdf' && !(page.docs ?? []).some((d) => d.url === c.url)).slice(0, 1)]
  for (const d of linked) {
    try {
      onStep?.(`Lecture de « ${d.title} » trouvé sur la page…`)
      const r = await post('/doc', { url: d.url, model })
      if (!r.ok || !/pdf/i.test(r.headers.get('Content-Type') ?? '')) continue
      const { pdf, text } = await readPdf(r, d.url)
      if (text.replace(/\s/g, '').length < 200) continue
      return { text: `${page.text}\n\n${d.title} :\n${text}`, pdf, images: page.images ?? [], manual: d }
    } catch {
      // That document could not be read: the page alone, or the next one.
    }
  }
  return { text: page.text, images: page.images ?? [] }
}
