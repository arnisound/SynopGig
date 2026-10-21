import { CONNECTORS, SIGNALS } from '../data/connectors'
import { FAMILY_ORDER } from '../data/library'
import type { Category, ConnectorType, PortDirection, SignalType } from '../types'
import type { PortGroup } from './portGroups'

/*
 * Data sheet reading with a language model, two free options:
 * - a small model running in the browser (WebLLM, WebGPU): no account, private;
 * - Google Gemini with the user's own free API key: better, reads the PDF itself.
 * Both answer with the same JSON, checked again here before use.
 */

export type AiMode = 'rules' | 'local' | 'gemini'

export const LOCAL_MODELS = [
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen 2.5 · 1,5 B (≈ 1 Go, recommandé)' },
  { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', label: 'Qwen 2.5 · 3 B (≈ 2 Go, plus précis, PC costaud)' },
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', label: 'Qwen 2.5 · 0,5 B (≈ 400 Mo, petit PC, moins fiable)' },
]

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'

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

export const SYSTEM_PROMPT = `Tu es technicien son, lumière et vidéo de spectacle. On te donne la fiche technique d'un appareil.
Réponds uniquement en JSON avec la connectique PHYSIQUE présente sur l'appareil (faces avant et arrière) et son nombre exact.
Règles :
- Un groupe = un type de connecteur dans un sens. Exemple : « 16 entrées micro XLR » = un groupe count 16, connector "xlr3", dir "in".
- N'invente rien. Ignore les formats compatibles, options, accessoires et toutes les mesures (gain, impédance, réponse, bruit, niveau, fréquence).
- Si le nombre n'est pas écrit, mets 1.
- Les ports réseau (Ethernet, Dante, etherCON) et USB sont "io". L'alimentation secteur est une entrée de signal "power".
- Une entrée combo XLR/jack est "xlr-combo". Une sortie casque est une sortie "jack" ou "minijack".
- label : nom court en français (ex. "In", "Out", "Sortie HP", "Dante", "Secteur").
Codes connecteur : ${Object.entries(CONNECTORS).map(([k, v]) => `${k} = ${v}`).join(' ; ')}.
Codes signal : ${Object.entries(SIGNALS).map(([k, v]) => `${k} = ${v.label}`).join(' ; ')}.
Départements : ${CATEGORIES.join(', ')}.
Familles possibles : ${FAMILY_ORDER.join(', ')}.`

/** JSON schema of the answer (WebLLM grammar and Gemini response schema). */
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
  return {
    brand: str(r.brand, 40) || undefined,
    model: str(r.model, 80) || undefined,
    category: CATEGORIES.includes(r.category as Category) ? (r.category as Category) : 'Son',
    family: str(r.family, 60) || undefined,
    rackU: num(r.rackU, 48) && Math.round(num(r.rackU, 48)!),
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

// ---- Local model (WebLLM)

type Engine = Awaited<ReturnType<typeof import('@mlc-ai/web-llm').CreateWebWorkerMLCEngine>>
let engine: { id: string; promise: Promise<Engine> } | undefined

export async function hasWebGPU() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu) return false
  try {
    return !!(await gpu.requestAdapter())
  } catch {
    return false
  }
}

export async function extractLocal(text: string, modelId: string, onProgress: (msg: string) => void): Promise<AiResult> {
  if (!(await hasWebGPU())) {
    throw new Error('Ce navigateur n’a pas WebGPU : utilisez Chrome ou Edge récent sur ordinateur, ou l’option Gemini.')
  }
  if (!engine || engine.id !== modelId) {
    const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm')
    const worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' })
    engine = {
      id: modelId,
      promise: CreateWebWorkerMLCEngine(worker, modelId, {
        initProgressCallback: (p) => onProgress(`Préparation de l’IA locale : ${Math.round(p.progress * 100)} % — ${p.text}`),
      }),
    }
    engine.promise.catch(() => (engine = undefined))
  }
  const llm = await engine.promise
  onProgress('L’IA locale lit la fiche…')
  const reply = await llm.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Fiche technique :\n${focusText(text)}` },
    ],
    temperature: 0,
    max_tokens: 1500,
    response_format: { type: 'json_object', schema: JSON.stringify(RESULT_SCHEMA) },
  })
  return sanitizeAi(JSON.parse(reply.choices[0]?.message?.content ?? '{}'))
}

// ---- Google Gemini (free API key)

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
  if (input.text) parts.push({ text: `Fiche technique :\n${input.text.slice(0, 60000)}` })
  parts.push({ text: 'Extrais la connectique de cet appareil.' })
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

export async function extractGemini(input: { text?: string; pdf?: File }, key: string, model = GEMINI_DEFAULT_MODEL): Promise<AiResult> {
  if (!key.trim()) throw new Error('Ajoutez votre clé Gemini gratuite dans les réglages.')
  const body = geminiRequest({ text: input.pdf ? undefined : input.text, pdfBase64: input.pdf ? await toBase64(input.pdf) : undefined })
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string }
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  if (!res.ok) throw new Error(`Gemini : ${data.error?.message ?? `erreur ${res.status}`}`)
  const answer = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return sanitizeAi(JSON.parse(answer || '{}'))
}
