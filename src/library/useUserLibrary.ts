import { useCallback, useEffect, useState } from 'react'
import type { DeviceTemplate } from '../types'
import { entryToTemplate, type SharedModel, type UserEntry, type UserLibraryFile } from './userLibrary'

/** The USER library Worker (worker/library.js), independent from the AI relay. */
export const DEFAULT_LIBRARY_URL = 'https://synopgig-library.arnisound-tools.workers.dev'

/** VITE_LIBRARY_URL overrides it at build time; "off" disables sharing. */
const fromEnv = import.meta.env.VITE_LIBRARY_URL
export const LIBRARY_URL: string = (fromEnv === 'off' ? '' : fromEnv || DEFAULT_LIBRARY_URL).replace(/\/+$/, '')

// Keys that let this browser remove what it shared: { [entry id]: key }.
const KEYS = 'synopgig.sharedKeys'
const readKeys = (): Record<string, string> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEYS) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
const writeKeys = (keys: Record<string, string>) => {
  try {
    localStorage.setItem(KEYS, JSON.stringify(keys))
  } catch {
    // Storage blocked: the equipment stays shared, it just cannot be removed from here.
  }
}

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data?.error?.message ?? `erreur ${res.status}`), { status: res.status })
  return data
}

/** Shares a model with everyone; returns the stored entry and the key to remove it. */
export async function shareModel(model: SharedModel, pseudo: string, image?: string, url = LIBRARY_URL): Promise<{ entry: UserEntry; token: string }> {
  if (!url) throw new Error('le partage n’est pas disponible sur cette version.')
  return call(url, { method: 'POST', body: JSON.stringify({ model, pseudo, image: image?.startsWith('data:') ? image : undefined }) })
}

export async function unshareModel(id: string, token: string, url = LIBRARY_URL) {
  await call(`${url}/${encodeURIComponent(id)}`, { method: 'DELETE', body: JSON.stringify({ token }) }).catch((e) => {
    // Already gone: nothing left to remove.
    if (e.status !== 404) throw e
  })
}

const toTemplates = (entries: unknown) =>
  (Array.isArray(entries) ? (entries as UserEntry[]) : []).map((e) => entryToTemplate(e, LIBRARY_URL ? `${LIBRARY_URL}/img/` : undefined)).filter((t) => t !== undefined)

/**
 * Loads the USER library from its Worker (live: what users shared), else the
 * copy shipped with the site. Sharing and removing update the list at once.
 */
export function useUserLibrary() {
  const [templates, setTemplates] = useState<DeviceTemplate[]>([])
  const [status, setStatus] = useState<'loading' | 'live' | 'offline'>('loading')
  const [keys, setKeys] = useState(readKeys)

  useEffect(() => {
    let cancelled = false
    const load = async (url: string) => {
      const res = await fetch(url, { cache: 'no-cache' })
      if (!res.ok) throw new Error(String(res.status))
      return toTemplates(((await res.json()) as UserLibraryFile).entries)
    }
    const live = LIBRARY_URL
    ;(live ? load(live) : Promise.reject(new Error('no library server')))
      .then((list) => !cancelled && (setTemplates(list), setStatus('live')))
      .catch(() =>
        load(`${import.meta.env.BASE_URL}user-library.json`)
          .then((list) => !cancelled && (setTemplates(list), setStatus('offline')))
          .catch(() => !cancelled && setStatus('offline')),
      )
    return () => {
      cancelled = true
    }
  }, [])

  const share = useCallback(async (model: SharedModel, pseudo: string, image?: string) => {
    const { entry, token } = await shareModel(model, pseudo, image)
    // Shown at once with the local copy of the photo, before the server's address is cached.
    const t = entryToTemplate(entry, LIBRARY_URL ? `${LIBRARY_URL}/img/` : undefined)
    if (t && image) t.image = image
    if (!t) throw new Error('réponse illisible du serveur.')
    setTemplates((list) => [...list.filter((x) => x.id !== t.id), t])
    setKeys((k) => {
      const next = { ...k, [entry.id]: token }
      writeKeys(next)
      return next
    })
    return t
  }, [])

  const remove = useCallback(
    async (id: string) => {
      const token = keys[id]
      if (!token) throw new Error('ce matériel a été partagé depuis un autre navigateur.')
      await unshareModel(id, token)
      setTemplates((list) => list.filter((x) => x.id !== id))
      setKeys((k) => {
        const next = { ...k }
        delete next[id]
        writeKeys(next)
        return next
      })
    },
    [keys],
  )

  return { templates, status, share, remove, isMine: (id: string) => id in keys }
}

export type UserLibrary = ReturnType<typeof useUserLibrary>
