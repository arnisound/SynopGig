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
  /** On the manufacturer's own site. */
  official: boolean
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

/** The chosen document: a PDF (read here, like a dropped file) or the text of a page. */
export async function loadDoc(doc: FoundDoc, model = ''): Promise<{ text: string; pdf?: File; images: string[] }> {
  const res = await post('/doc', { url: doc.url, model })
  if (!res.ok) throw await failure(res)
  if (/pdf/i.test(res.headers.get('Content-Type') ?? '')) {
    const name = decodeURIComponent(new URL(doc.url).pathname.split('/').pop() || 'fiche.pdf')
    const pdf = new File([await res.blob()], /\.pdf$/i.test(name) ? name : `${name}.pdf`, { type: 'application/pdf' })
    const { pdfToText } = await import('./pdfText')
    return { text: await pdfToText(pdf), pdf, images: [] }
  }
  const page = (await res.json()) as { title: string; text: string; images?: string[] }
  return { text: page.text, images: page.images ?? [] }
}
