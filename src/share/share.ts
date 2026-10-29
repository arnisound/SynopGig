import { LIBRARY_URL } from '../library/useUserLibrary'
import type { Project } from '../types'

/*
 * Read-only links: a copy of the project is published on the SynopGig
 * library server (worker/library.js); anyone with the link opens it without
 * an account. The key that allows updating or removing it stays in the
 * creator's browser.
 */

const KEYS = 'synopgig.shareKeys'
const SHARED = 'synopgig.shared.'

/** What a link opens straight away: a flight case, or a device on the synoptic (labels' QR codes). */
export type ShareTarget = { kind: 'case' | 'device'; id: string }

export const shareLink = (id: string, target?: ShareTarget) => `${location.origin}${location.pathname}#/p/${id}${target ? `/${target.kind}/${encodeURIComponent(target.id)}` : ''}`
const HASH = /^#\/p\/([A-Za-z0-9]{10})(?:\/(case|device)\/([^/]+))?$/
export const sharedIdFromHash = (hash = location.hash) => HASH.exec(hash)?.[1]
export const sharedTargetFromHash = (hash = location.hash): ShareTarget | undefined => {
  const m = HASH.exec(hash)
  return m?.[2] ? { kind: m[2] as ShareTarget['kind'], id: decodeURIComponent(m[3]) } : undefined
}

const store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(k)
      return v ? (JSON.parse(v) as T) : d
    } catch {
      return d
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {
      // Storage full or blocked: the link still works, only this browser forgets.
    }
  },
}

export const shareKey = (id: string): string | undefined => store.get<Record<string, string>>(KEYS, {})[id]

async function call(path: string, init: RequestInit) {
  if (!LIBRARY_URL) throw new Error('le partage n’est pas disponible sur cette version.')
  const res = await fetch(`${LIBRARY_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json' } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message ?? `erreur ${res.status}`)
  return data
}

/** What is published: the project without the selection or this browser's share id. */
function publishable(p: Project): Project {
  const copy: Project = {
    ...p,
    nodes: p.nodes.map((n) => ({ ...n, selected: false })),
    edges: p.edges.map((e) => ({ ...e, selected: false })),
  }
  delete copy.share
  return copy
}

/** Creates the link, or updates it when this browser created it. */
export async function publish(p: Project): Promise<{ id: string; updatedAt: string }> {
  const id = p.share?.id
  const token = id ? shareKey(id) : undefined
  if (id && token) return call(`/projects/${id}`, { method: 'PUT', body: JSON.stringify({ project: publishable(p), token }) })
  const r = await call('/projects', { method: 'POST', body: JSON.stringify({ project: publishable(p) }) })
  store.set(KEYS, { ...store.get<Record<string, string>>(KEYS, {}), [r.id]: r.token })
  return { id: r.id, updatedAt: r.updatedAt }
}

export async function unpublish(id: string) {
  await call(`/projects/${id}`, { method: 'DELETE', body: JSON.stringify({ token: shareKey(id) }) })
}

type Stored = { project: Project; updatedAt: string }

/** A shared project; the last copy read stays in this browser, for use without network. */
export async function fetchShared(id: string): Promise<Stored> {
  const r = (await call(`/projects/${id}`, { method: 'GET' })) as Stored
  store.set(SHARED + id, r)
  return r
}
export const cachedShared = (id: string) => store.get<Stored | null>(SHARED + id, null)

/** The technician's own ticks in the guide of a shared project. */
export const sharedProgress = (id: string) => store.get<Project['progress']>(`${SHARED}${id}.progress`, {})
export const saveSharedProgress = (id: string, progress: Project['progress']) => store.set(`${SHARED}${id}.progress`, progress)
