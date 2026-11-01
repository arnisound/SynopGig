import { useSyncExternalStore } from 'react'
import type { Party, Project } from '../types'

/*
 * The user's settings, kept in this browser: their organisation (name,
 * logo, who signs the documents) and their clients. A project copies its
 * client and the organisation, so its documents print the same anywhere.
 */

export interface Settings {
  org: Party & { author?: string }
  clients: Party[]
}

const KEY = 'synopgig.settings'
const EMPTY: Settings = { org: { id: 'org', name: '' }, clients: [] }

function read(): Settings {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Settings> | null
    return { org: { ...EMPTY.org, ...v?.org }, clients: Array.isArray(v?.clients) ? v.clients : [] }
  } catch {
    return EMPTY
  }
}

let current = read()
const listeners = new Set<() => void>()

export function saveSettings(next: Settings) {
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage full or blocked: kept for this visit.
  }
  listeners.forEach((f) => f())
}

export const getSettings = () => current
export const useSettings = () =>
  useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => listeners.delete(f)
    },
    () => current,
  )

/** Who makes the project's documents: its own copy, else the settings. */
export const orgOf = (p: Project): Party | undefined => (p.info?.org?.name || p.info?.org?.logo ? p.info.org : current.org.name || current.org.logo ? current.org : undefined)

/** Who signs: the project's author, else the default one. */
export const authorOf = (p: Project) => p.info?.author || current.org.author || ''
