import { AI_PROXY_URL } from '../library/ai'
import { readUrl } from '../library/finder'
import type { CaseKind, FlightCase } from '../types'

/*
 * Recreates a flight case or a rack case from a shop page: the relay reads
 * the page (browsers cannot, other sites block them), the AI picks the sizes,
 * and simple rules fill in what it misses or stand in when it is offline.
 */

export interface CaseSpec {
  name?: string
  kind?: CaseKind
  rackU?: number
  /** Outside dimensions, cm. */
  width?: number
  height?: number
  depth?: number
  /** Empty case, kg. */
  weight?: number
  wheels?: boolean
  handles?: number
  source?: string
}

const KINDS: CaseKind[] = ['rack', 'malle', 'valise', 'console']

const clamp = (v: unknown, min: number, max: number, int = false) => {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || n < min || n > max) return undefined
  return int ? Math.round(n) : Math.round(n * 10) / 10
}

/** Keeps only sane values, whatever produced them. */
export function cleanSpec(raw: Record<string, unknown>): CaseSpec {
  const name = typeof raw.name === 'string' ? raw.name.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) : ''
  return {
    name: name || undefined,
    kind: KINDS.includes(raw.kind as CaseKind) ? (raw.kind as CaseKind) : undefined,
    rackU: clamp(raw.rackU, 1, 48, true),
    width: clamp(raw.width, 10, 300),
    height: clamp(raw.height, 5, 300),
    depth: clamp(raw.depth, 5, 300),
    weight: clamp(raw.weight, 0.1, 500),
    wheels: typeof raw.wheels === 'boolean' ? raw.wheels : undefined,
    handles: clamp(raw.handles, 0, 8, true),
  }
}

const NUM = String.raw`(\d+(?:[.,]\d+)?)`
const toCm = (v: string, unit?: string) => {
  const n = Number(v.replace(',', '.'))
  const u = unit?.toLowerCase()
  if (u === 'mm') return n / 10
  if (u === 'm') return n * 100
  if (u === 'cm') return n
  // No unit: shops write millimetres for big numbers.
  return n > 250 ? n / 10 : n
}

/** Inside sizes are a fallback only: the case is drawn from its outside. */
const INSIDE = /int[ée]rieur|interior|inner|innen|inside|utile|nutz/i

const AXES: { key: 'width' | 'height' | 'depth'; re: RegExp }[] = [
  { key: 'width', re: /\b(?:largeur|width|breite|larg\.?)\b/i },
  { key: 'height', re: /\b(?:hauteur|height|höhe|haut\.?)\b/i },
  { key: 'depth', re: /\b(?:profondeur|depth|tiefe|prof\.?|longueur|length|länge)\b/i },
]

/** Letter order of "(l x h x p)", "(W x H x D)", "(B x H x T)". */
function axisOrder(line: string): ('width' | 'height' | 'depth')[] {
  const m = line.match(/\(?\b([a-z])\s*[x×*]\s*([a-z])\s*[x×*]\s*([a-z])\b\)?/i)
  if (!m) return ['width', 'height', 'depth']
  const letters = [m[1], m[2], m[3]]
  // French "L x l x H": length, width, height.
  if (letters[0] === 'L' && letters[1] === 'l') return ['width', 'depth', 'height']
  return letters.map((c) => (/[hH]/.test(c) ? 'height' : /[pPdDtT]/.test(c) ? 'depth' : 'width'))
}

/** Rule-based reading of the page text. */
export function parseCaseText(text: string, title = ''): CaseSpec {
  const lines = text.split('\n')
  const found: Record<string, unknown> = {}
  const inside: Record<string, unknown> = {}

  const all = `${title}\n${text}`
  const u = all.match(/\b(\d{1,2})\s*(?:U|HE|RU|unités?|units?)\b(?!\s*\/)/)
  if (u) found.rackU = Number(u[1])

  const triple = new RegExp(`${NUM}\\s*(mm|cm|m)?\\s*[x×*]\\s*${NUM}\\s*(mm|cm|m)?\\s*[x×*]\\s*${NUM}\\s*(mm|cm|m)\\b`, 'i')
  for (const line of lines) {
    const target = INSIDE.test(line) ? inside : found
    const t = line.match(triple)
    if (t && target.width === undefined) {
      const unit = t[6]
      const order = axisOrder(line)
      ;[t[1], t[3], t[5]].forEach((v, i) => (target[order[i]] = toCm(v, [t[2], t[4], unit][i] ?? unit)))
      continue
    }
    for (const axis of AXES) {
      if (target[axis.key] !== undefined || !axis.re.test(line)) continue
      const m = line.match(new RegExp(`${axis.re.source}[^\\d\\n]{0,30}${NUM}\\s*(mm|cm|m)?\\b`, 'i'))
      if (m) target[axis.key] = toCm(m[1], m[2])
    }
    if (found.weight === undefined) {
      const w = line.match(new RegExp(`(?:poids|weight|gewicht)[^\\d\\n]{0,25}${NUM}\\s*(kg|g)\\b`, 'i'))
      if (w) found.weight = Number(w[1].replace(',', '.')) / (w[2].toLowerCase() === 'g' ? 1000 : 1)
    }
  }
  for (const k of ['width', 'height', 'depth']) if (found[k] === undefined) found[k] = inside[k]
  if (found.weight === undefined) {
    const w = all.match(new RegExp(`${NUM}\\s*kg\\b`, 'i'))
    if (w) found.weight = Number(w[1].replace(',', '.'))
  }

  if (/sans roulettes|without (?:wheels|castors)|ohne rollen/i.test(all)) found.wheels = false
  else if (/roulettes?|wheels?|castors?|rollen\b|wheelboard/i.test(all)) found.wheels = true
  const h = all.match(/\b(\d)\s*(?:poignées|handles|griffe)/i)
  if (h) found.handles = Number(h[1])

  found.kind = found.rackU
    ? 'rack'
    : /console|mixer|mischpult|table de mixage|capot|dome/i.test(all)
      ? 'console'
      : /valise|briefcase|koffer|attach[ée]/i.test(all)
        ? 'valise'
        : 'malle'
  // "Flyht Pro Rack 8U - Thomann" → "Flyht Pro Rack 8U".
  found.name = title.split(/\s+[|–—-]\s+/)[0]
  return cleanSpec(found)
}

export const CASE_PROMPT = `You are a live sound, lighting and video technician. You receive the text of an online shop page for a flight case or a 19" rack case.
Answer only with JSON describing the case itself (not the gear it is made for):
- name: brand and model, short.
- kind: "rack" for a 19" rack case, "console" for a mixing desk case, "valise" for a small briefcase, otherwise "malle".
- rackU: rack units of a rack case (e.g. 8 for "8U" or "8 HE").
- width, height, depth: OUTSIDE dimensions in centimetres (convert mm). Use inside sizes only if outside ones are missing.
- weight: empty weight in kg. wheels: true if it has castors or a wheel board. handles: number of handles.
Do not invent anything: leave out what the page does not say.`

export const CASE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    kind: { type: 'string', enum: KINDS },
    rackU: { type: 'integer' },
    width: { type: 'number' },
    height: { type: 'number' },
    depth: { type: 'number' },
    weight: { type: 'number' },
    wheels: { type: 'boolean' },
    handles: { type: 'integer' },
  },
  required: ['name', 'kind'],
}

async function post(path: string, body: unknown, base = AI_PROXY_URL) {
  if (!base) throw new Error('le relais SynopGig n’est pas disponible sur cette version.')
  const res = await fetch(`${base.replace(/\/+$/, '')}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message ?? `erreur ${res.status}`)
  return data
}

/** Lines of a shop page about a case: sizes, weight, wheels, handles, inside and outside. */
const CASE_LINES =
  /\d.*(?:cm|mm|kg|\bU\b|\bHE\b|\bRU\b|unit|dimension|abmessung|maße|taille|hauteur|largeur|profondeur|longueur|height|width|depth|length|höhe|breite|tiefe|länge|poids|weight|gewicht|19|rack)|roulette|wheel|castor|rollen|poignée|handle|griff|intérieur|interior|inner|innen|extérieur|exterior|outer|außen/i

/** The relay downloads the page; the title, the product data and the lines about size and weight are kept. */
export async function fetchPage(url: string): Promise<{ title: string; text: string }> {
  const got = await readUrl(url)
  if (!('page' in got)) throw new Error('ce lien n’est pas une page web')
  const lines = got.page.text.split('\n').filter((l) => /^(?:Titre|Description|Données produit) : /.test(l) || CASE_LINES.test(l))
  return { title: got.page.title, text: lines.join('\n').slice(0, 12000) }
}

export async function extractCaseAi(text: string): Promise<CaseSpec> {
  const data = await post('', { v: 2, system: CASE_PROMPT, schema: CASE_SCHEMA, text: text.slice(0, 12000) })
  return cleanSpec(JSON.parse(data.text || '{}'))
}

/** AI first, rules for whatever it left out; rules alone if the AI does not answer. */
export async function readCase(input: { url?: string; text?: string }, onProgress?: (m: string) => void): Promise<{ spec: CaseSpec; ai: boolean; note?: string }> {
  let { text = '' } = input
  let title = ''
  if (input.url?.trim() && !text.trim()) {
    onProgress?.('Lecture de la page…')
    const page = await fetchPage(input.url.trim())
    text = page.text
    title = page.title
  }
  if (!title) title = text.match(/^Titre : (.+)$/m)?.[1] ?? text.split('\n').find((l) => l.trim())?.trim() ?? ''
  const rules = parseCaseText(text, title)
  const source = input.url?.trim() || undefined
  try {
    onProgress?.('Analyse par l’IA…')
    const ai = await extractCaseAi(text)
    const spec = { ...rules, ...Object.fromEntries(Object.entries(ai).filter(([, v]) => v !== undefined)), source }
    if (spec.kind !== 'rack') delete spec.rackU
    return { spec, ai: true }
  } catch (e) {
    return { spec: { ...rules, source }, ai: false, note: e instanceof Error ? e.message : String(e) }
  }
}

/** A new case shaped like the spec; what is unknown keeps the defaults. */
export function applySpec(fc: FlightCase, spec: CaseSpec): FlightCase {
  const kind = spec.kind ?? fc.kind
  return {
    ...fc,
    name: spec.name ?? fc.name,
    kind,
    rackU: kind === 'rack' ? (spec.rackU ?? fc.rackU) : fc.rackU,
    width: Math.round(spec.width ?? fc.width),
    height: Math.round(spec.height ?? fc.height),
    depth: Math.round(spec.depth ?? fc.depth),
    wheels: spec.wheels ?? fc.wheels,
    handles: spec.handles ?? fc.handles,
    emptyWeight: spec.weight ?? fc.emptyWeight,
    source: spec.source ?? fc.source,
  }
}

/** What was understood, for the status line. */
export function describeSpec(s: CaseSpec) {
  return [
    s.kind === 'rack' && s.rackU ? `${s.rackU}U` : s.kind,
    s.width && s.height && s.depth ? `${s.width} × ${s.height} × ${s.depth} cm` : undefined,
    s.weight ? `${s.weight} kg à vide` : undefined,
    s.wheels ? 'roulettes' : undefined,
  ]
    .filter(Boolean)
    .join(' · ')
}
