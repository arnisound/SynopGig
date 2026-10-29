import { CONNECTORS, SIGNALS } from '../data/connectors.ts'
import type { Category, ConnectorType, DeviceTemplate, PortDirection, ProductDoc, SignalType, Spec } from '../types.ts'
import { expandGroups, type PortGroup } from './portGroups.ts'

/*
 * The USER library: equipment shared by users for everyone. One click sends
 * it to the SynopGig library Worker (worker/library.js), which stores it with
 * the creator's pseudo; every copy of the app loads the list at start-up.
 */

export const USER_FAMILY = 'Bibliothèque USER'

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Autre']
const DIRS: PortDirection[] = ['in', 'out', 'io']

type GroupTuple = [prefix: string, count: number, connector: ConnectorType, signal: SignalType, dir: PortDirection]

/** Compact form sent to the relay. */
export interface SharedModel {
  v: 1
  brand?: string
  model: string
  category: Category
  family?: string
  rackU?: number
  weight?: number
  groups: GroupTuple[]
  description?: string
  url?: string
  /** [group, label, value, unit]. */
  specs?: [string, string, string, string][]
  /** [title, address]. */
  docs?: [string, string][]
}

export interface UserEntry extends Omit<SharedModel, 'v'> {
  id: string
  author: string
  createdAt: string
  /** A product photo is stored with it (served at <library>/img/<id>). */
  image?: boolean
}

export interface UserLibraryFile {
  version: 1
  entries: UserEntry[]
}

export function encodeShared(t: Pick<DeviceTemplate, 'brand' | 'model' | 'category' | 'family' | 'rackU' | 'weight' | 'description' | 'url' | 'specs' | 'docs'>, groups: PortGroup[]): SharedModel {
  return {
    v: 1,
    brand: t.brand,
    model: t.model,
    category: t.category,
    family: t.family,
    rackU: t.rackU,
    weight: t.weight,
    groups: groups.map((g) => [g.prefix, g.count, g.connector, g.signal, g.dir]),
    ...(t.description ? { description: t.description } : {}),
    ...(t.url ? { url: t.url } : {}),
    ...(t.specs?.length ? { specs: t.specs.map((s) => [s.group, s.label, s.value, s.unit ?? ''] as [string, string, string, string]) } : {}),
    ...(t.docs?.length ? { docs: t.docs.map((d) => [d.title, d.url] as [string, string]) } : {}),
  }
}

/** A public web address, or nothing. */
export const webUrl = (v: unknown) => {
  if (typeof v !== 'string' || v.length > 400) return undefined
  try {
    const u = new URL(v)
    return /^https?:$/.test(u.protocol) ? u.href : undefined
  } catch {
    return undefined
  }
}

/** Specifications and documents from outside: plain text, sane sizes, web addresses only. */
export function cleanInfo(r: Record<string, unknown>): { description?: string; url?: string; specs?: Spec[]; docs?: ProductDoc[] } {
  const specs = (Array.isArray(r.specs) ? r.specs : [])
    .slice(0, 40)
    .map((s): Spec | undefined => (Array.isArray(s) ? { group: text(s[0], 40), label: text(s[1], 60), value: text(s[2], 80), unit: text(s[3], 20) || undefined } : undefined))
    .filter((s): s is Spec => !!s && !!s.label && !!s.value)
  const docs = (Array.isArray(r.docs) ? r.docs : [])
    .slice(0, 10)
    .map((d): ProductDoc | undefined => (Array.isArray(d) ? { title: text(d[0], 120), url: webUrl(d[1]) ?? '' } : undefined))
    .filter((d): d is ProductDoc => !!d && !!d.url)
  return {
    description: text(r.description, 400) || undefined,
    url: webUrl(r.url),
    specs: specs.length ? specs : undefined,
    docs: docs.length ? docs : undefined,
  }
}

// Control characters are stripped on purpose from text coming from outside.
const text = (v: unknown, max: number) =>
  // eslint-disable-next-line no-control-regex
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : ''

const num = (v: unknown, min: number, max: number, int = false) => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < min || n > max) return undefined
  return int ? Math.round(n) : Math.round(n * 10) / 10
}

export function cleanPseudo(v: unknown) {
  return text(v, 40).replace(/[^\p{L}\p{N} ._-]/gu, '')
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

/** Strict check of anything coming from outside (network, file). */
export function validateShared(raw: unknown): Result<SharedModel> {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Bloc JSON absent ou illisible.' }
  const r = raw as Record<string, unknown>
  const model = text(r.model, 80)
  if (!model) return { ok: false, error: 'Le modèle est obligatoire.' }
  const category = CATEGORIES.includes(r.category as Category) ? (r.category as Category) : undefined
  if (!category) return { ok: false, error: `Département inconnu : ${String(r.category)}.` }
  if (!Array.isArray(r.groups) || r.groups.length > 64) return { ok: false, error: 'Liste de ports invalide (64 groupes maximum).' }
  const groups: GroupTuple[] = []
  let total = 0
  for (const g of r.groups) {
    if (!Array.isArray(g) || g.length !== 5) return { ok: false, error: 'Groupe de ports mal formé.' }
    const [prefix, count, connector, signal, dir] = g
    const c = num(count, 1, 256, true)
    if (!c) return { ok: false, error: `Quantité invalide : ${String(count)}.` }
    if (typeof connector !== 'string' || !Object.hasOwn(CONNECTORS, connector)) return { ok: false, error: `Connecteur inconnu : ${String(connector)}.` }
    if (typeof signal !== 'string' || !Object.hasOwn(SIGNALS, signal)) return { ok: false, error: `Signal inconnu : ${String(signal)}.` }
    if (!DIRS.includes(dir)) return { ok: false, error: `Sens inconnu : ${String(dir)}.` }
    total += c
    groups.push([text(prefix, 40) || 'Port', c, connector as ConnectorType, signal as SignalType, dir])
  }
  if (total > 512) return { ok: false, error: 'Trop de ports (512 maximum).' }
  return {
    ok: true,
    value: {
      v: 1,
      brand: text(r.brand, 40) || undefined,
      model,
      category,
      family: text(r.family, 60) || undefined,
      rackU: num(r.rackU, 1, 48, true),
      weight: num(r.weight, 0.01, 2000),
      groups,
      ...encodeInfo(cleanInfo(r)),
    },
  }
}

const encodeInfo = (i: ReturnType<typeof cleanInfo>) => ({
  ...(i.description ? { description: i.description } : {}),
  ...(i.url ? { url: i.url } : {}),
  ...(i.specs ? { specs: i.specs.map((s) => [s.group, s.label, s.value, s.unit ?? ''] as [string, string, string, string]) } : {}),
  ...(i.docs ? { docs: i.docs.map((d) => [d.title, d.url] as [string, string]) } : {}),
})

export function toGroups(tuples: GroupTuple[]): PortGroup[] {
  return tuples.map(([prefix, count, connector, signal, dir]) => ({ prefix, count, connector, signal, dir }))
}

/** A USER entry as a palette template; invalid entries are dropped. */
export function entryToTemplate(e: UserEntry, imageBase?: string): DeviceTemplate | undefined {
  const v = validateShared({ ...e, v: 1 })
  if (!v.ok || !/^user-\d+$/.test(String(e.id))) return undefined
  return {
    id: String(e.id),
    brand: v.value.brand,
    model: v.value.model,
    category: v.value.category,
    family: v.value.family,
    rackU: v.value.rackU,
    weight: v.value.weight,
    ports: expandGroups(toGroups(v.value.groups)),
    author: cleanPseudo(e.author) || 'anonyme',
    image: e.image === true && imageBase ? `${imageBase}${String(e.id)}` : undefined,
    ...cleanInfo(v.value as unknown as Record<string, unknown>),
  }
}
