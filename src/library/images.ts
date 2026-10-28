import { AI_PROXY_URL } from './ai'

/*
 * Product photos: shrunk to a small thumbnail kept in the project (a few kB
 * as a data URL), so it works offline, prints in the file and travels with
 * the model when it is shared.
 */

const MAX = 200

/** A picture (file or downloaded) as a small WebP (JPEG where WebP cannot be written). */
export async function shrink(blob: Blob, max = MAX): Promise<string> {
  const bmp = await createImageBitmap(blob)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * k))
  const h = Math.max(1, Math.round(bmp.height * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('image illisible')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const webp = canvas.toDataURL('image/webp', 0.85)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85)
}

/** A photo from another site, through the relay (browsers cannot read other sites' images). */
export async function fetchImage(url: string): Promise<string> {
  if (!AI_PROXY_URL) throw new Error('relais indisponible')
  const res = await fetch(`${AI_PROXY_URL.replace(/\/+$/, '')}/image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
  if (!res.ok) throw new Error(`image indisponible (${res.status})`)
  return shrink(await res.blob())
}

/** The product photos of a page, through the relay. */
export async function pageImages(url: string, model: string): Promise<string[]> {
  if (!AI_PROXY_URL) return []
  const res = await fetch(`${AI_PROXY_URL.replace(/\/+$/, '')}/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, model }) })
  if (!res.ok) return []
  return ((await res.json()) as { images?: string[] }).images ?? []
}
