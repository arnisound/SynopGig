import type { ProductDoc } from '../types'
import { findDocs, type FoundDoc } from './finder'
import { fetchImage, pageImages } from './images'

/*
 * Photos and documents found for a model, kept in this browser by model id:
 * a photo picked once for an X32 shows on every X32 of every project.
 */

const PHOTOS = 'synopgig.photos'
const DOCS = 'synopgig.docs'

function read<T>(key: string): Record<string, T> {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // Storage full or blocked: kept on this device only.
  }
}

export const savedPhotos = () => read<string>(PHOTOS)
export const savedDocs = () => read<ProductDoc[]>(DOCS)

export function savePhoto(templateId: string, image?: string) {
  const all = savedPhotos()
  if (image) all[templateId] = image
  else delete all[templateId]
  write(PHOTOS, all)
}
export function saveDocs(templateId: string, docs: ProductDoc[]) {
  write(DOCS, { ...savedDocs(), [templateId]: docs })
}

/** The maker's pages first, those naming this very model first. */
const rank = (d: FoundDoc) => (d.official ? 0 : 2) + (d.exact ? 0 : 1)

/** Candidate photos from the maker's product pages, as small thumbnails. */
export async function findPhotos(brand: string, model: string): Promise<string[]> {
  const pages = (await findDocs(brand, model)).filter((d) => d.kind === 'page').sort((a, b) => rank(a) - rank(b)).slice(0, 3)
  const urls = [...new Set((await Promise.all(pages.map((p) => pageImages(p.url, model)))).flat())].slice(0, 8)
  const got = await Promise.allSettled(urls.map(fetchImage))
  return got.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
}

const DOC_NAME: Record<NonNullable<FoundDoc['doc']>, string> = { manual: 'Mode d’emploi', datasheet: 'Fiche technique', quickstart: 'Guide de démarrage' }

/** The model's documents found on the web: user guide, data sheet, product page. */
export async function findDocuments(brand: string, model: string): Promise<ProductDoc[]> {
  const found = (await findDocs(brand, model)).filter((d) => d.exact !== false).sort((a, b) => rank(a) - rank(b))
  const out: ProductDoc[] = []
  for (const d of found) {
    const title = d.doc ? `${DOC_NAME[d.doc]} (${d.host})` : d.kind === 'pdf' ? `Document PDF (${d.host})` : `${d.official ? 'Page du fabricant' : 'Page produit'} (${d.host})`
    if (!out.some((o) => o.url === d.url)) out.push({ title, url: d.url })
    if (out.length >= 5) break
  }
  return out
}
