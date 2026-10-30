import { useSyncExternalStore } from 'react'
import { LIBRARY } from '../data/library'

/*
 * The photo of each model, wherever it comes from: picked in this browser
 * first, then the catalogue's, then one shared by other users. Devices
 * without a photo of their own show their model's.
 */

const photos = new Map(LIBRARY.filter((t) => t.image).map((t) => [t.id, t.image as string]))
const listeners = new Set<() => void>()

/** Add photos by model id; mine replace the others, shared ones only fill the gaps. */
export function addModelPhotos(found: Record<string, string>, mine = false) {
  let changed = false
  for (const [id, url] of Object.entries(found)) {
    if (!url || (!mine && photos.has(id)) || photos.get(id) === url) continue
    photos.set(id, url)
    changed = true
  }
  if (changed) listeners.forEach((f) => f())
}

export const modelPhoto = (id?: string) => (id ? photos.get(id) : undefined)

const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}
export const useModelPhoto = (id?: string) => useSyncExternalStore(subscribe, () => modelPhoto(id))
