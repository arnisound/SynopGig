import { CONNECTORS, SIGNALS } from '../data/connectors'
import { FAMILY_ORDER } from '../data/library'
import type { Category, ConnectorType, PortDirection, SignalType } from '../types'
import type { PortGroup } from './portGroups'

/*
 * Data sheet reading with a language model, free and with nothing to set up
 * for the public. The app picks the first engine available:
 * 1. the user's own Gemini key, if they chose to add one (advanced option);
 * 2. the SynopGig relay: a small free Cloudflare Worker holding the site
 *    owner's Groq or Gemini key (configured once, see worker/README.md);
 *    works in every browser and answers in a couple of seconds;
 * 3. the AI built into Chrome desktop (Gemini Nano), only if the user turns
 *    it on: free and offline but slow.
 * Only the useful lines of the sheet are sent, which keeps answers fast.
 * Every answer is checked again here before use.
 */

/** Fast and generous free tier; thinking is turned off in the request. */
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-lite'

/** The SynopGig relay (worker/relay.js), wherever the app is hosted. */
export const DEFAULT_AI_PROXY_URL = 'https://synopgig-ia.arnisound-tools.workers.dev'

/** VITE_AI_PROXY_URL overrides the relay at build time; "off" disables it. */
const proxyFromEnv = import.meta.env.VITE_AI_PROXY_URL
export const AI_PROXY_URL: string = proxyFromEnv === 'off' ? '' : proxyFromEnv || DEFAULT_AI_PROXY_URL

export type Engine = 'personal' | 'relay' | 'chrome'

export const ENGINE_LABELS: Record<Engine, string> = {
  personal: 'votre clé Gemini',
  relay: 'l’IA SynopGig',
  chrome: 'l’IA intégrée à Chrome',
}

export interface AiGroup extends PortGroup {
  /** Passage of the sheet the model read the group from. */
  quote?: string
}

export interface AiResult {
  brand?: string
  model?: string
  category: Category
  family?: string
  rackU?: number
  weight?: number
  groups: AiGroup[]
}

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Autre']
const DIRS: PortDirection[] = ['in', 'out', 'io']

export const SYSTEM_PROMPT = `You are a live sound, lighting and video technician. You receive extracts of the data sheet or manual of ONE device. List its PHYSICAL connectors (front and rear panels) with their exact count, as a technician patching it would see them.
Method:
1. If a "Device:" line names the device, describe only that one: the sheet may cover several models, versions or optional cards. Keep the standard version.
2. Read the connection sections (rear panel, front panel, connections, inputs / outputs, technical data) and count each connector.
3. For every group, copy into "quote" the short passage of the sheet (at most 100 characters, its exact words) that shows the connector and its count.
Counting:
- One group = one connector type, one signal, one direction. "16 XLR mic inputs" gives count 16. "Inputs 1-8" gives 8. "2 x NL4" gives 2.
- Per channel connectors are multiplied: "4 channels, each with XLR input and XLR link output" gives XLR in x4 and XLR out x4.
- Link, thru and loop outputs are their own output group.
- A connector described both in a table and in a panel description is counted once.
- If the count is really not written, use 1.
- Never invent. Leave out options and expansion cards that are not fitted, accessories, compatible formats, wireless links, internal buses and network audio channels ("64 Dante channels" on two ports is 2 connectors, not 64).
- Ignore every measurement (gain, impedance, frequency response, level, noise).
Types:
- Ethernet, Dante, AES67, AVB and USB ports are "io". etherCON is "ethercon", a plain RJ45 is "rj45". Primary + secondary Dante = 2 ports.
- Mains power is an input with signal "power" (IEC, powerCON, powerCON TRUE1...). A mains link output is an output with signal "power".
- An XLR/jack combo is "xlr-combo". A headphone output is a "jack" or "minijack" output. Speaker outputs (Speakon, binding posts, terminal blocks) use signal "speaker".
- label: short French name, e.g. "Entrée", "Sortie", "Link", "Sortie HP", "Dante", "Secteur", "Casque".
Also give brand, model, category, family, rackU (height in rack units, only for 19 inch rack devices) and weight in kg, when written.
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
          quote: { type: 'string' },
        },
        required: ['label', 'count', 'connector', 'signal', 'dir', 'quote'],
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
  const groups: AiGroup[] = []
  for (const p of ports) {
    if (!p || typeof p !== 'object') continue
    const q = p as Record<string, unknown>
    const c = str(q.connector, 40)
    const connector = (Object.hasOwn(CONNECTORS, c) ? c : CONNECTOR_BY_LABEL.get(c.toLowerCase())) as ConnectorType | undefined
    const signal = (Object.hasOwn(SIGNALS, str(q.signal, 20)) ? q.signal : undefined) as SignalType | undefined
    if (!connector || !signal) continue
    const dir = DIRS.includes(q.dir as PortDirection) ? (q.dir as PortDirection) : 'in'
    const count = Math.max(1, Math.min(256, Math.round(Number(q.count) || 1)))
    const quote = str(q.quote, 160) || undefined
    // The same connector given twice (spec table, then panel description): kept once.
    const twin = groups.find((g) => g.connector === connector && g.signal === signal && g.dir === dir && (g.count === count || (!!quote && words(g.quote ?? '') === words(quote))))
    if (twin) {
      twin.count = Math.max(twin.count, count)
      continue
    }
    groups.push({ prefix: str(q.label, 40) || CONNECTORS[connector], count, connector, signal, dir, ...(quote ? { quote } : {}) })
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
    groups,
  }
}

// ---- Checking an answer against the sheet

/** Lower case, no accents, words only: for comparing passages. */
const words = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10, twelve: 12, sixteen: 16, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, huit: 8, douze: 12, seize: 16, zwei: 2, vier: 4, acht: 8, dual: 2, quad: 4, single: 1 }

/** Can this passage justify that count? A number, a range, a word or a product (4 channels x 2). */
export function quoteHasCount(quote: string, count: number) {
  if (count <= 1) return true
  const q = quote.toLowerCase()
  const nums = [...q.matchAll(/\d+/g)].map((m) => Number(m[0]))
  for (const w of words(q).split(' ')) if (NUMBER_WORDS[w]) nums.push(NUMBER_WORDS[w])
  if (nums.includes(count)) return true
  for (const m of q.matchAll(/(\d+)\s*(?:-|–|to|à|bis)\s*(\d+)/g)) if (Number(m[2]) - Number(m[1]) + 1 === count) return true
  return nums.some((a, i) => nums.some((b, j) => i !== j && a * b === count))
}

/** Is the passage really in the sheet? Exact, or nearly all its words. */
export function quoteInSheet(quote: string, sheet: string) {
  const q = words(quote)
  if (!q) return false
  const all = words(sheet)
  if (all.includes(q)) return true
  const known = new Set(all.split(' '))
  const list = q.split(' ').filter((w) => w.length > 1)
  return list.length > 0 && list.filter((w) => known.has(w)).length / list.length >= 0.85
}

export interface CheckedGroup extends AiGroup {
  /** Why the row needs a look; empty when the sheet confirms it. */
  doubts: string[]
}

/**
 * Every group of an answer checked against the sheet itself: the passage
 * must be in it and must carry the count, and the rule-based reading
 * (independent of the AI) must not read another number.
 */
export function checkAnswer(groups: AiGroup[], sheet: string, rules: { connector: ConnectorType; dir: PortDirection; count: number; guessed?: boolean }[] = []): CheckedGroup[] {
  return groups.map((g) => {
    const doubts: string[] = []
    if (!g.quote) doubts.push('aucun passage cité')
    else if (!quoteInSheet(g.quote, sheet)) doubts.push('passage introuvable dans la fiche')
    else if (!quoteHasCount(g.quote, g.count)) doubts.push(`quantité ${g.count} non écrite dans le passage`)
    const same = rules.filter((r) => !r.guessed && r.connector === g.connector && (r.dir === g.dir || r.dir === 'io' || g.dir === 'io'))
    if (same.length && !same.some((r) => r.count === g.count)) doubts.push(`l’analyse rapide lit ${[...new Set(same.map((r) => r.count))].join(' ou ')}`)
    if (g.count > 32) doubts.push('nombre élevé')
    return { ...g, doubts }
  })
}

// ---- Choosing what the model reads

const CONNECTOR_WORDS =
  /xlr|jack|trs|combo|speakon|\bnl[248]\b|rca|cinch|\baes|madi|dante|ethercon|rj-?45|ethernet|\blan\b|\bsdi\b|bnc|hdmi|usb|midi|dmx|powercon|true ?1|\biec\b|c1[349]\b|mains|secteur|phoenix|euroblock|terminal|bornier|\bdb-?\d|d-?sub|gpio|antenn|fib(?:er|re)|sfp|optical|toslink|adat|word ?clock|lemo|displayport|\bdvi\b|\bvga\b|thunderbolt|schuko|\bpoe\b|binding post/i
const IO_WORDS =
  /\b(?:inputs?|outputs?|thru|through|link|loop|entrées?|sorties?|eingang|eingänge|ausgang|ausgänge|ports?|channels?|canaux|voies|kanäle|connect(?:ions?|ors?|ivity)|connectique|anschlüsse|rear|front|arrière|i\/o|in\/out)\b/i
const SIZE_WORDS = /\brack|\b\d+\s*(?:u|he|ru)\b|\bkg\b|\bweight|\bpoids|\bgewicht|\bdimension/i
const SECTION = /connect|anschl|rear panel|front panel|back panel|face (?:avant|arrière)|panneau|inputs?\s*(?:\/|&|and)\s*outputs?|\bi\/o\b|specifications?|caractéristiques|technische daten|technical data|spécifications/i
const JUNK =
  /warning|caution|danger|avertissement|warrant|garantie|liability|conformity|conformité|declaration|recycl|dispos(?:al|e of)|déchets|lightning|moisture|\brain\b|humidité|qualified (?:service )?personnel|copyright|all rights reserved|trademark|marque déposée|do not (?:open|remove|expose)/i

/** Lines short enough to read: long ones are cut at separators. */
function sheetLines(text: string) {
  const out: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line) continue
    if (line.length <= 240) {
      out.push(line)
      continue
    }
    let rest = line
    while (rest.length > 240) {
      const cut = Math.max(rest.lastIndexOf(' | ', 240), rest.lastIndexOf('. ', 240), rest.lastIndexOf('; ', 240), rest.lastIndexOf(' • ', 240))
      const at = cut > 80 ? cut + 1 : 240
      out.push(rest.slice(0, at).trim())
      rest = rest.slice(at).trim()
    }
    if (rest) out.push(rest)
  }
  return out
}

/**
 * What the model reads: the head of the sheet (name, model) and the
 * connection passages with the lines around them (a table often puts the
 * label on one short line and the number on the next), best first when the sheet
 * is too long, then put back in the order of the sheet. Safety, warranty
 * and legal text is left out, and so are lines repeated word for word.
 */
export function focusText(text: string, max = 6000, device = '') {
  const lines = sheetLines(text)
  const target = words(device)
    .split(' ')
    .filter((w) => w.length > 2 && /\d/.test(w))
  const score = new Array<number>(lines.length).fill(0)
  let section = 0
  lines.forEach((l, i) => {
    if (l.length < 60 && SECTION.test(l)) section = 30
    else if (section > 0) section--
    if (JUNK.test(l)) {
      score[i] = -1
      return
    }
    let s = 0
    if (CONNECTOR_WORDS.test(l)) s += 3
    if (IO_WORDS.test(l)) s += 2
    if (SIZE_WORDS.test(l)) s += 2
    if (s && /\d/.test(l)) s += 1
    if (target.some((w) => words(l).includes(w))) s += 1
    if (section > 0 && s > 0) s += 1
    score[i] = s
  })
  const keep = new Map<number, number>()
  lines.slice(0, 10).forEach((_, i) => score[i] >= 0 && keep.set(i, 100))
  lines.forEach((_, i) => {
    if (score[i] < 2) return
    for (const j of [i - 1, i, i + 1]) if (j >= 0 && j < lines.length && score[j] >= 0 && (j === i || score[j] > 0 || lines[j].length <= 32)) keep.set(j, Math.max(keep.get(j) ?? 0, j === i ? score[i] : score[i] - 1))
  })
  const seen = new Set<string>()
  const chosen = new Set<number>()
  let size = 0
  for (const [i] of [...keep.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])) {
    const w = words(lines[i])
    if (seen.has(w) || size + lines[i].length + 1 > max) continue
    seen.add(w)
    chosen.add(i)
    size += lines[i].length + 1
  }
  return [...chosen].sort((a, b) => a - b).map((i) => lines[i]).join('\n') + '\n'
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
  if (input.text) parts.push({ text: `Data sheet extracts:\n${input.text.slice(0, 60000)}` })
  parts.push({ text: 'List the connectors of this device.' })
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: geminiSchema(RESULT_SCHEMA),
      // A short thinking pass: counts per channel, duplicates and options are traps.
      thinkingConfig: { thinkingBudget: 1024 },
    },
  }
}

/** Names the device for sheets covering a whole range. */
const deviceLine = (device?: string) => (device?.trim() ? `Device: ${device.trim()}\n` : '')

/** A PDF with no text layer (scan) has to be read by the model itself. */
export const isReadable = (text: string) => text.replace(/\s/g, '').length > 200

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

export async function extractGemini(input: { text?: string; pdf?: File; device?: string }, key: string, model = GEMINI_DEFAULT_MODEL): Promise<AiResult> {
  if (!key.trim()) throw new Error('Ajoutez votre clé Gemini dans les options avancées.')
  const text = input.text ?? ''
  const scan = !!input.pdf && !isReadable(text)
  const body = geminiRequest({ text: scan ? deviceLine(input.device) : deviceLine(input.device) + focusText(text, 12000, input.device), pdfBase64: scan ? await toBase64(input.pdf!) : undefined })
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
    body: JSON.stringify(body),
  })
  return readGemini(res)
}

/** What the relay accepts: the prompt, the schema and the useful lines (or a scanned PDF). */
export function relayRequest(input: { text?: string; pdfBase64?: string }) {
  return { v: 2, system: SYSTEM_PROMPT, schema: RESULT_SCHEMA, text: input.text, pdfBase64: input.pdfBase64 }
}

/** The relay forwards to Groq or Gemini with the site owner's key, kept secret on the server. */
export async function extractRelay(input: { text?: string; pdf?: File; device?: string }, url = AI_PROXY_URL): Promise<AiResult> {
  const text = input.text ?? ''
  const scan = !!input.pdf && !isReadable(text)
  if (!scan && !text.trim()) throw new Error('rien à analyser')
  if (scan && input.pdf!.size > 8_000_000) throw new Error('PDF scanné trop lourd : collez le texte des caractéristiques')
  const body = relayRequest(scan ? { pdfBase64: await toBase64(input.pdf!) } : { text: deviceLine(input.device) + focusText(text, 12000, input.device) })
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } }
  if (!res.ok) throw new Error(data.error?.message ?? `erreur ${res.status}`)
  return sanitizeAi(JSON.parse(data.text || '{}'))
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

export async function extractChrome(text: string, onProgress: (msg: string) => void, device?: string): Promise<AiResult> {
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
    const answer = await session.prompt(`Data sheet extracts:\n${deviceLine(device)}${focusText(text, 4000, device)}`, { responseConstraint: RESULT_SCHEMA, omitResponseConstraintInput: true })
    return sanitizeAi(JSON.parse(answer))
  } finally {
    session.destroy()
  }
}

// ---- Automatic choice

export interface AutoOptions {
  text: string
  pdf?: File
  /** Brand and model looked for, when the sheet was found by name. */
  device?: string
  personalKey?: string
  personalModel?: string
  /** The AI built into Chrome is slow: only used when the user turns it on. */
  allowChrome?: boolean
  onProgress: (msg: string) => void
}

/** Engines usable right now, best first. */
export async function availableEngines(personalKey?: string, allowChrome = false): Promise<Engine[]> {
  const list: Engine[] = []
  if (personalKey?.trim()) list.push('personal')
  if (AI_PROXY_URL) list.push('relay')
  if (allowChrome) {
    const chrome = await chromeAiStatus()
    if (chrome !== 'missing' && chrome !== 'unavailable') list.push('chrome')
  }
  return list
}

/** Tries each available engine in turn; throws when none could answer. */
export async function extractAuto(o: AutoOptions): Promise<{ result: AiResult; engine: Engine }> {
  const engines = await availableEngines(o.personalKey, o.allowChrome)
  if (engines.length === 0) throw new Error('Aucune IA disponible sur cet appareil.')
  const errors: string[] = []
  for (const engine of engines) {
    try {
      if (engine === 'personal') {
        o.onProgress('Gemini lit la fiche…')
        return { result: await extractGemini({ text: o.text, pdf: o.pdf, device: o.device }, o.personalKey!, o.personalModel), engine }
      }
      if (engine === 'relay') {
        o.onProgress('L’IA SynopGig lit la fiche…')
        return { result: await extractRelay({ text: o.text, pdf: o.pdf, device: o.device }), engine }
      }
      if (!o.text.trim()) throw new Error('pas de texte lisible dans ce PDF')
      return { result: await extractChrome(o.text, o.onProgress, o.device), engine }
    } catch (e) {
      errors.push(`${ENGINE_LABELS[engine]} : ${(e as Error).message}`)
    }
  }
  throw new Error(errors.join(' · '))
}
