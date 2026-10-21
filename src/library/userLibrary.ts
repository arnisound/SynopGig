// Shared by the app and by scripts/add-user-material.ts (run by a GitHub
// workflow): imports carry their .ts extension so Node can load them as-is.
import { CONNECTORS, SIGNALS } from '../data/connectors.ts'
import type { Category, ConnectorType, DeviceTemplate, PortDirection, SignalType } from '../types.ts'
import { expandGroups, type PortGroup } from './portGroups.ts'

/*
 * The USER library: equipment shared by users for everyone. A user opens a
 * pre-filled GitHub issue; a workflow validates it and appends it to
 * public/user-library.json, which every copy of the app loads at start-up.
 */

export const COMMUNITY_REPO = 'arnisound/SynopGig'
export const USER_LIBRARY_URL = `https://raw.githubusercontent.com/${COMMUNITY_REPO}/main/public/user-library.json`
export const ISSUE_PREFIX = '[Matériel USER]'
export const USER_FAMILY = 'Bibliothèque USER'

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Autre']
const DIRS: PortDirection[] = ['in', 'out', 'io']

type GroupTuple = [prefix: string, count: number, connector: ConnectorType, signal: SignalType, dir: PortDirection]

/** Compact form, small enough to travel in an issue URL. */
export interface SharedModel {
  v: 1
  brand?: string
  model: string
  category: Category
  family?: string
  rackU?: number
  weight?: number
  groups: GroupTuple[]
}

export interface UserEntry extends Omit<SharedModel, 'v'> {
  id: string
  author: string
  github?: string
  createdAt: string
  issue?: number
}

export interface UserLibraryFile {
  version: 1
  entries: UserEntry[]
}

export function encodeShared(t: Pick<DeviceTemplate, 'brand' | 'model' | 'category' | 'family' | 'rackU' | 'weight'>, groups: PortGroup[]): SharedModel {
  return {
    v: 1,
    brand: t.brand,
    model: t.model,
    category: t.category,
    family: t.family,
    rackU: t.rackU,
    weight: t.weight,
    groups: groups.map((g) => [g.prefix, g.count, g.connector, g.signal, g.dir]),
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

/** Strict check of anything coming from outside (issue, network, file). */
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
    },
  }
}

/** One entry per line: readable diffs in the repository history. */
export function serializeLibrary(lib: UserLibraryFile) {
  return `{"version":1,"entries":[\n${lib.entries.map((e) => JSON.stringify(e)).join(',\n')}\n]}\n`
}

export function toGroups(tuples: GroupTuple[]): PortGroup[] {
  return tuples.map(([prefix, count, connector, signal, dir]) => ({ prefix, count, connector, signal, dir }))
}

/** A USER entry as a palette template; invalid entries are dropped. */
export function entryToTemplate(e: UserEntry): DeviceTemplate | undefined {
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
  }
}

export function issueTitle(m: SharedModel) {
  return `${ISSUE_PREFIX} ${m.brand ? `${m.brand} ` : ''}${m.model}`
}

export function issueBody(m: SharedModel, pseudo: string) {
  return [
    `Pseudo: ${cleanPseudo(pseudo) || 'anonyme'}`,
    '',
    'Matériel proposé depuis SynopGig pour la bibliothèque USER.',
    'Ne modifiez pas le bloc ci-dessous : il est lu automatiquement.',
    '',
    '```json',
    JSON.stringify(m),
    '```',
  ].join('\n')
}

export function issueUrl(m: SharedModel, pseudo: string) {
  const q = new URLSearchParams({ title: issueTitle(m), body: issueBody(m, pseudo) })
  return `https://github.com/${COMMUNITY_REPO}/issues/new?${q.toString()}`
}

/** Reads an issue written by issueBody. */
export function parseIssue(body: string, login: string): Result<{ model: SharedModel; author: string }> {
  const block = body.match(/```json\s*([\s\S]*?)```/)
  if (!block) return { ok: false, error: 'Bloc ```json introuvable dans l’issue.' }
  let raw: unknown
  try {
    raw = JSON.parse(block[1])
  } catch {
    return { ok: false, error: 'Le bloc JSON est illisible.' }
  }
  const v = validateShared(raw)
  if (!v.ok) return v
  const pseudo = cleanPseudo(body.match(/^Pseudo\s*:\s*(.+)$/im)?.[1])
  return { ok: true, value: { model: v.value, author: pseudo || cleanPseudo(login) || 'anonyme' } }
}
