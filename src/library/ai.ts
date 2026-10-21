import { CONNECTORS, SIGNALS } from '../data/connectors'
import { FAMILY_ORDER } from '../data/library'
import type { Category, ConnectorType, PortDirection, SignalType } from '../types'
import type { PortGroup } from './portGroups'

/*
 * Data sheet reading with a language model, free and with nothing to set up
 * for the public. The app picks the first engine available:
 * 1. the user's own Gemini key, if they chose to add one (advanced option);
 * 2. the SynopGig relay: a small free Cloudflare Worker holding the site
 *    owner's Gemini key (configured once at build time, see worker/README.md);
 * 3. the AI built into Chrome desktop (Gemini Nano, Prompt API): offline, free.
 * Every answer is checked again here before use.
 */

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'

/** Relay URL, set at build time from the AI_PROXY_URL repository variable. */
export const AI_PROXY_URL: string = import.meta.env.VITE_AI_PROXY_URL ?? ''

export type Engine = 'personal' | 'relay' | 'chrome'

export const ENGINE_LABELS: Record<Engine, string> = {
  personal: 'votre clé Gemini',
  relay: 'l’IA SynopGig',
  chrome: 'l’IA intégrée à Chrome',
}

export interface AiResult {
  brand?: string
  model?: string
  category: Category
  family?: string
  rackU?: number
  weight?: number
  groups: PortGroup[]
}

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Autre']
const DIRS: PortDirection[] = ['in', 'out', 'io']

export const SYSTEM_PROMPT = `You are a live sound, lighting and video technician. You receive the data sheet of a device.
Answer only with JSON describing the PHYSICAL connectors on the device (front and rear panels) and their exact count.
Rules:
- One group = one connector type in one direction. Example: "16 XLR mic inputs" = one group with count 16, connector "xlr3", dir "in".
- Do not invent anything. Ignore compatible formats, options, accessories and every measurement (gain, impedance, frequency response, noise, level).
- If the count is not written, use 1.
- Network ports (Ethernet, Dante, etherCON) and USB are "io". Mains power is an input with signal "power".
- An XLR/jack combo input is "xlr-combo". A headphone output is a "jack" or "minijack" output.
- label: short French name, e.g. "In", "Out", "Sortie HP", "Dante", "Secteur".
Connector codes: ${Object.entries(CONNECTORS).map(([k, v]) => `${k} = ${v}`).join('; ')}.
Signal codes: ${Object.entries(SIGNALS).map(([k, v]) => `${k} = ${v.label}`).join('; ')}.
Departments (category): ${CATEGORIES.join(', ')}.
Families (family, pick one if it fits): ${FAMILY_ORDER.join(', ')}.`

/** JSON schema of the answer (Gemini response schema, Chrome response constraint). */
export const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    brand: { type: 'string' },
    model: { type: 'string' },
    category: { type: 'string', enum: CATEGORIES },
    family: { type: 'string' },
    rackU: { type: 'integer' },
    weight: { type: 'number' },
    ports: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          count: { type: 'integer' },
          connector: { type: 'string', enum: Object.keys(CONNECTORS) },
          signal: { type: 'string', enum: Object.keys(SIGNALS) },
          dir: { type: 'string', enum: DIRS },
        },
        required: ['label', 'count', 'connector', 'signal', 'dir'],
      },
    },
  },
  required: ['model', 'category', 'ports'],
}

const CONNECTOR_BY_LABEL = new Map(Object.entries(CONNECTORS).map(([k, v]) => [v.toLowerCase(), k as ConnectorType]))

/** Never trust model output: keep only known codes and sane numbers. */
export function sanitizeAi(raw: unknown): AiResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  // eslint-disable-next-line no-control-regex -- strips control characters on purpose
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '')
  const ports = Array.isArray(r.ports) ? r.ports : []
  const merged = new Map<string, PortGroup>()
  for (const p of ports) {
    if (!p || typeof p !== 'object') continue
    const q = p as Record<string, unknown>
    const c = str(q.connector, 40)
    const connector = (Object.hasOwn(CONNECTORS, c) ? c : CONNECTOR_BY_LABEL.get(c.toLowerCase())) as ConnectorType | undefined
    const signal = (Object.hasOwn(SIGNALS, str(q.signal, 20)) ? q.signal : undefined) as SignalType | undefined
    if (!connector || !signal) continue
    const dir = DIRS.includes(q.dir as PortDirection) ? (q.dir as PortDirection) : 'in'
    const count = Math.max(1, Math.min(256, Math.round(Number(q.count) || 1)))
    const key = `${connector}|${signal}|${dir}`
    const cur = merged.get(key)
    if (cur) cur.count = Math.max(cur.count, count)
    else merged.set(key, { prefix: str(q.label, 40) || CONNECTORS[connector], count, connector, signal, dir })
  }
  const num = (v: unknown, max: number) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 && n <= max ? n : undefined
  }
  const rack = num(r.rackU, 48)
  return {
    brand: str(r.brand, 40) || undefined,
    model: str(r.model, 80) || undefined,
    category: CATEGORIES.includes(r.category as Category) ? (r.category as Category) : 'Son',
    family: str(r.family, 60) || undefined,
    rackU: rack && Math.round(rack),
    weight: num(r.weight, 2000),
    groups: [...merged.values()],
  }
}

const KEEP = /xlr|jack|trs|combo|speakon|nl[248]|rca|cinch|aes|madi|dante|ethercon|rj-?45|ethernet|lan\b|sdi|bnc|hdmi|usb|midi|dmx|powercon|iec|mains|secteur|alimentation|power|input|output|entrée|sortie|ports?|connect|antenn|fib(?:er|re)|sfp|optical|toslink|adat|phoenix|euroblock|db-?\d|gpio|rack|\bu\b|kg|weight|poids|dimension/i

/** Small models have a short context: keep the head and the connector lines. */
export function focusText(text: string, max = 6000) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const head = lines.slice(0, 15)
  const rest = lines.slice(15).filter((l) => KEEP.test(l) && l.length < 300)
  let out = ''
  for (const l of [...head, ...rest]) {
    if (out.length + l.length > max) break
    out += l + '\n'
  }
  return out
}

// ---- Gemini request (used by the relay and by a personal key)

/** Gemini wants upper-case OpenAPI types. */
function geminiSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(geminiSchema)
  if (!s || typeof s !== 'object') return s
  return Object.fromEntries(
    Object.entries(s as Record<string, unknown>).map(([k, v]) => [k, k === 'type' && typeof v === 'string' ? v.toUpperCase() : geminiSchema(v)]),
  )
}

export function geminiRequest(input: { text?: string; pdfBase64?: string }) {
  const parts: object[] = []
  if (input.pdfBase64) parts.push({ inline_data: { mime_type: 'application/pdf', data: input.pdfBase64 } })
  if (input.text) parts.push({ text: `Data sheet:\n${input.text.slice(0, 60000)}` })
  parts.push({ text: 'List the connectors of this device.' })
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: geminiSchema(RESULT_SCHEMA) },
  }
}

async function toBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

type GeminiReply = { error?: { message?: string }; candidates?: { content?: { parts?: { text?: string }[] } }[] }

async function readGemini(res: Response) {
  const data = (await res.json().catch(() => ({}))) as GeminiReply
  if (!res.ok) throw new Error(data.error?.message ?? `erreur ${res.status}`)
  const answer = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return sanitizeAi(JSON.parse(answer || '{}'))
}

export async function extractGemini(input: { text?: string; pdf?: File }, key: string, model = GEMINI_DEFAULT_MODEL): Promise<AiResult> {
  if (!key.trim()) throw new Error('Ajoutez votre clé Gemini dans les options avancées.')
  const body = geminiRequest({ text: input.pdf ? undefined : input.text, pdfBase64: input.pdf ? await toBase64(input.pdf) : undefined })
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
    body: JSON.stringify(body),
  })
  return readGemini(res)
}

/** The relay forwards to Gemini with the site owner's key, kept secret on the server. */
export async function extractRelay(input: { text?: string; pdf?: File }, url = AI_PROXY_URL): Promise<AiResult> {
  const body = geminiRequest({
    text: input.pdf ? undefined : focusText(input.text ?? '', 30000),
    pdfBase64: input.pdf && input.pdf.size < 8_000_000 ? await toBase64(input.pdf) : undefined,
  })
  if (!input.pdf && !input.text?.trim()) throw new Error('rien à analyser')
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return readGemini(res)
}

// ---- AI built into Chrome (Prompt API, Gemini Nano)

interface ChromeSession {
  prompt(input: string, options?: { responseConstraint?: object; omitResponseConstraintInput?: boolean }): Promise<string>
  destroy(): void
}
interface ChromeLanguageModel {
  availability(options?: object): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>
  create(options?: object): Promise<ChromeSession>
}

const languageModel = () => (globalThis as { LanguageModel?: ChromeLanguageModel }).LanguageModel
const CHROME_IO = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] }

/** 'missing' when the browser has no built-in AI at all. */
export async function chromeAiStatus(): Promise<'missing' | 'unavailable' | 'downloadable' | 'downloading' | 'available'> {
  const lm = languageModel()
  if (!lm) return 'missing'
  try {
    return await lm.availability(CHROME_IO)
  } catch {
    return 'unavailable'
  }
}

export async function extractChrome(text: string, onProgress: (msg: string) => void): Promise<AiResult> {
  const lm = languageModel()
  if (!lm) throw new Error('IA de Chrome absente')
  const session = await lm.create({
    ...CHROME_IO,
    initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
    monitor(m: EventTarget) {
      m.addEventListener('downloadprogress', (e) => {
        const loaded = (e as Event & { loaded?: number }).loaded ?? 0
        onProgress(`Chrome prépare son IA intégrée (une seule fois) : ${Math.round(loaded * 100)} %`)
      })
    },
  })
  try {
    onProgress('L’IA intégrée à Chrome lit la fiche…')
    const answer = await session.prompt(`Data sheet:\n${focusText(text, 4000)}`, { responseConstraint: RESULT_SCHEMA, omitResponseConstraintInput: true })
    return sanitizeAi(JSON.parse(answer))
  } finally {
    session.destroy()
  }
}

// ---- Automatic choice

export interface AutoOptions {
  text: string
  pdf?: File
  personalKey?: string
  personalModel?: string
  onProgress: (msg: string) => void
}

/** Engines usable right now, best first. */
export async function availableEngines(personalKey?: string): Promise<Engine[]> {
  const list: Engine[] = []
  if (personalKey?.trim()) list.push('personal')
  if (AI_PROXY_URL) list.push('relay')
  const chrome = await chromeAiStatus()
  if (chrome !== 'missing' && chrome !== 'unavailable') list.push('chrome')
  return list
}

/** Tries each available engine in turn; throws when none could answer. */
export async function extractAuto(o: AutoOptions): Promise<{ result: AiResult; engine: Engine }> {
  const engines = await availableEngines(o.personalKey)
  if (engines.length === 0) throw new Error('Aucune IA disponible sur cet appareil.')
  const errors: string[] = []
  for (const engine of engines) {
    try {
      if (engine === 'personal') {
        o.onProgress('Gemini lit la fiche…')
        return { result: await extractGemini({ text: o.text, pdf: o.pdf }, o.personalKey!, o.personalModel), engine }
      }
      if (engine === 'relay') {
        o.onProgress('L’IA SynopGig lit la fiche…')
        return { result: await extractRelay({ text: o.text, pdf: o.pdf }), engine }
      }
      if (!o.text.trim()) throw new Error('pas de texte lisible dans ce PDF')
      return { result: await extractChrome(o.text, o.onProgress), engine }
    } catch (e) {
      errors.push(`${ENGINE_LABELS[engine]} : ${(e as Error).message}`)
    }
  }
  throw new Error(errors.join(' · '))
}
