import { LIBRARY_URL } from './useUserLibrary'

/*
 * Photos found for catalogue models, shared through the library worker: a
 * photo found once (by the relay, or picked by a user) shows for everyone.
 * Only the address is shared; the picture stays on the maker's site.
 */

export async function fetchSharedPhotos(url = LIBRARY_URL): Promise<Record<string, string>> {
  if (!url) return {}
  try {
    const res = await fetch(`${url}/photos`, { cache: 'no-cache' })
    const all = res.ok ? ((await res.json()) as unknown) : {}
    if (!all || typeof all !== 'object') return {}
    return Object.fromEntries(Object.entries(all).filter((e): e is [string, string] => typeof e[1] === 'string' && /^https:\/\//.test(e[1])))
  } catch {
    return {}
  }
}

/** Offer a photo to everyone; replace only when a user picked it themselves. */
export async function sharePhoto(id: string, photo: string, replace = false, url = LIBRARY_URL): Promise<void> {
  if (!url || !/^https:\/\//.test(photo) || id.startsWith('custom-')) return
  try {
    await fetch(`${url}/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, url: photo, replace }) })
  } catch {
    // Offline or worker down: the photo stays in this browser.
  }
}
