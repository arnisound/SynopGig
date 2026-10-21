/*
 * SynopGig AI relay: a free Cloudflare Worker that reads data sheets with the
 * site owner's free AI key, so the public has nothing to set up and every
 * browser gets an answer in a couple of seconds. Setup in worker/README.md.
 *
 * Settings (Cloudflare > Worker > Settings > Variables and Secrets):
 *   GROQ_API_KEY     secret, recommended: very fast (console.groq.com/keys)
 *   GEMINI_API_KEY   secret, alternative or complement: also reads scanned PDFs
 *   ALLOWED_ORIGINS  optional, comma separated (default: the GitHub Pages site)
 *   GROQ_MODEL       optional (default: best model the account can use)
 *   GEMINI_MODEL     optional (default gemini-2.5-flash-lite)
 *
 * It also hosts the USER library (equipment shared by users, for everyone):
 *   LIBRARY          KV namespace binding (Settings > Bindings > KV namespace)
 *   GET /library       the shared equipment, for every copy of the app
 *   POST /library      share one piece of equipment, with the creator's pseudo
 *   DELETE /library/id remove it again (only with the key given to its creator)
 *
 * Open <worker address>/diagnostic in a browser to check the setup.
 */

const DEFAULT_ORIGINS = 'https://arnisound.github.io,http://localhost:5173'
const PROMPT_START = 'You are a live sound, lighting and video technician'
const MAX_TEXT = 20000
const MAX_PDF_BASE64 = 11_000_000
const PER_HOUR = 30

// Best-effort limit per visitor, per Worker instance.
const hits = new Map()

function tooMany(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > PER_HOUR
}

/** Only the data sheet analysis SynopGig sends goes through: the key cannot be used for anything else. */
export function cleanRequest(body) {
  if (!body || typeof body !== 'object' || body.v !== 2) return null
  const { system, schema, text, pdfBase64 } = body
  if (typeof system !== 'string' || !system.startsWith(PROMPT_START) || system.length > 20000) return null
  if (!schema || typeof schema !== 'object' || JSON.stringify(schema).length > 20000) return null
  const hasText = typeof text === 'string' && text.trim().length > 0 && text.length <= MAX_TEXT
  const hasPdf = typeof pdfBase64 === 'string' && pdfBase64.length > 0 && pdfBase64.length <= MAX_PDF_BASE64
  if (hasText === hasPdf) return null
  return { system, schema, text: hasText ? text : undefined, pdfBase64: hasPdf ? pdfBase64 : undefined }
}

/** The provider's own error message, short and without anything secret. */
const reason = (data, status) => String(data?.error?.message ?? data?.error ?? `HTTP ${status}`).slice(0, 200)

/** First JSON object of a reply, for models that wrap it in text. */
function extractJson(text) {
  if (!text) return undefined
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return undefined
  try {
    return JSON.stringify(JSON.parse(text.slice(start, end + 1)))
  } catch {
    return undefined
  }
}

// Groq renames and retires models: ask the account which ones it can use.
const GROQ_PREFERRED = [
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'moonshotai/kimi-k2-instruct',
  'llama-3.1-8b-instant',
]
const NOT_CHAT = /whisper|tts|guard|playai|orpheus|distil|compound|allam/i
// Remembered per key: a new key gets a fresh list.
let groqModels

async function groqAvailable(env) {
  if (groqModels?.key === env.GROQ_API_KEY) return groqModels.list
  const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` } })
  const data = await res.json().catch(() => ({}))
  const list = Array.isArray(data.data) ? data.data.filter((m) => m && m.active !== false).map((m) => String(m.id)) : []
  if (list.length) groqModels = { key: env.GROQ_API_KEY, list }
  return list
}

/** Up to two models: the configured one if available, else the best known ones. */
export async function pickGroqModels(env) {
  const available = await groqAvailable(env).catch(() => [])
  if (available.length === 0) return [env.GROQ_MODEL || 'openai/gpt-oss-20b', 'llama-3.1-8b-instant']
  const wanted = [env.GROQ_MODEL, ...GROQ_PREFERRED].filter((m) => m && available.includes(m))
  const others = available.filter((m) => !NOT_CHAT.test(m))
  return [...new Set([...wanted, ...others])].slice(0, 2)
}

async function groqCall(req, env, model, strictJson) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 2048,
      // Reasoning models: keep the thinking short, the task is simple.
      ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
      ...(strictJson ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: `${req.system}\nAnswer with a single JSON object following this JSON schema, nothing else:\n${JSON.stringify(req.schema)}` },
        { role: 'user', content: `Data sheet:\n${req.text}` },
      ],
    }),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, text: extractJson(data.choices?.[0]?.message?.content), error: res.ok ? undefined : reason(data, res.status) }
}

/** Best model in strict JSON mode, then without it, then the second model. */
async function askGroq(req, env) {
  const [main, second] = await pickGroqModels(env)
  const tries = [[main, true], [main, false], ...(second ? [[second, false]] : [])]
  let last
  for (const [model, strict] of tries) {
    last = await groqCall(req, env, model, strict)
    if (last.status === 200 && last.text) return last
    // A model that disappeared: list them again next time.
    if (last.status === 404) groqModels = undefined
    // A refused key will be refused again: no point retrying.
    if (last.status === 401 || last.status === 403) break
  }
  return { ...last, error: `Groq ${last.status} : ${last.error ?? 'réponse illisible'}` }
}

/** Gemini wants upper-case OpenAPI types. */
function geminiSchema(s) {
  if (Array.isArray(s)) return s.map(geminiSchema)
  if (!s || typeof s !== 'object') return s
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === 'type' && typeof v === 'string' ? v.toUpperCase() : geminiSchema(v)]))
}

async function askGemini(req, env) {
  const parts = req.pdfBase64
    ? [{ inline_data: { mime_type: 'application/pdf', data: req.pdfBase64 } }, { text: 'List the connectors of this device.' }]
    : [{ text: `Data sheet:\n${req.text}` }]
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: geminiSchema(req.schema),
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  const text = extractJson(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join(''))
  return { status: res.status, text, error: res.ok && text ? undefined : `Gemini ${res.status} : ${res.ok ? 'réponse illisible' : reason(data, res.status)}` }
}

/* ---------- USER library ---------- */

const CATEGORIES = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Autre']
const MAX_ENTRIES = 5000
const SHARES_PER_HOUR = 20
const shares = new Map()

// Control characters are stripped on purpose from text coming from outside.
const clean = (v, max) =>
  // eslint-disable-next-line no-control-regex
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : ''
const number = (v, min, max, int = false) => {
  const n = typeof v === 'number' ? v : Number(v)
  if (v === undefined || v === null || v === '' || !Number.isFinite(n) || n < min || n > max) return undefined
  return int ? Math.round(n) : Math.round(n * 10) / 10
}
export const cleanPseudo = (v) => clean(v, 40).replace(/[^\p{L}\p{N} ._-]/gu, '')

/**
 * Shape and size check of a shared model. Connector and signal codes are
 * checked again by the app, which drops anything it does not know.
 */
export function cleanShared(raw) {
  if (!raw || typeof raw !== 'object') return null
  const model = clean(raw.model, 80)
  if (!model || !CATEGORIES.includes(raw.category)) return null
  if (!Array.isArray(raw.groups) || raw.groups.length === 0 || raw.groups.length > 64) return null
  const groups = []
  let total = 0
  for (const g of raw.groups) {
    if (!Array.isArray(g) || g.length !== 5) return null
    const [prefix, count, connector, signal, dir] = g
    const c = number(count, 1, 256, true)
    const code = /^[a-z0-9-]{1,24}$/
    if (!c || !code.test(connector) || !code.test(signal) || !['in', 'out', 'io'].includes(dir)) return null
    total += c
    groups.push([clean(prefix, 40) || 'Port', c, connector, signal, dir])
  }
  if (total > 512) return null
  const out = { brand: clean(raw.brand, 40), model, category: raw.category, family: clean(raw.family, 60), rackU: number(raw.rackU, 1, 48, true), weight: number(raw.weight, 0.01, 2000), groups }
  for (const k of Object.keys(out)) if (out[k] === undefined || out[k] === '') delete out[k]
  return out
}

const sha256 = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Every entry lives under its own key; "all" is a snapshot rebuilt after each change, so a read costs one KV read. */
// KV listings can lag a few seconds behind a write: the change just made is applied by hand.
async function rebuildLibrary(kv, { add, remove } = {}) {
  const entries = add ? [add] : []
  let cursor
  do {
    const page = await kv.list({ prefix: 'entry:', cursor })
    const values = await Promise.all(page.keys.map((k) => kv.get(k.name, 'json')))
    for (const v of values) if (v?.entry && v.entry.id !== add?.id && v.entry.id !== remove) entries.push(v.entry)
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  entries.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
  await kv.put('all', JSON.stringify(entries))
  return entries
}

async function readLibrary(kv) {
  return (await kv.get('all', 'json')) ?? []
}

async function shareEntry(kv, body) {
  const model = cleanShared(body?.model)
  if (!model) return { status: 400, error: 'Matériel refusé : vérifiez le modèle, le département et les ports.' }
  const author = cleanPseudo(body?.pseudo)
  if (!author) return { status: 400, error: 'Indiquez votre pseudo.' }
  const current = await readLibrary(kv)
  if (current.length >= MAX_ENTRIES) return { status: 507, error: 'Bibliothèque USER pleine.' }
  const id = `user-${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
  const token = crypto.randomUUID()
  const entry = { id, ...model, author, createdAt: new Date().toISOString() }
  await kv.put(`entry:${id}`, JSON.stringify({ entry, tokenHash: await sha256(token) }))
  await rebuildLibrary(kv, { add: entry })
  return { status: 200, data: { entry, token } }
}

async function removeEntry(kv, id, token) {
  if (!/^user-\d+$/.test(id) || typeof token !== 'string') return { status: 400, error: 'Requête refusée.' }
  const stored = await kv.get(`entry:${id}`, 'json')
  if (!stored) return { status: 404, error: 'Ce matériel n’est plus partagé.' }
  if (stored.tokenHash !== (await sha256(token))) return { status: 403, error: 'Seul son créateur peut retirer ce matériel.' }
  await kv.delete(`entry:${id}`)
  await rebuildLibrary(kv, { remove: id })
  return { status: 200, data: { ok: true } }
}

async function library(request, env, path, reply, fail, allowed) {
  const kv = env.LIBRARY
  if (request.method === 'GET') return reply({ version: 1, entries: kv ? await readLibrary(kv) : [] })
  if (!allowed) return fail('Site non autorisé.', 403)
  if (!kv) return fail('Partage non configuré (stockage LIBRARY manquant sur le relais).', 503)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const now = Date.now()
  const recent = (shares.get(ip) ?? []).filter((t) => now - t < 3_600_000)
  if (recent.length >= SHARES_PER_HOUR) return fail('Trop de partages en une heure, réessayez plus tard.', 429)
  recent.push(now)
  shares.set(ip, recent)
  if (shares.size > 5000) shares.clear()
  let body
  try {
    body = await request.json()
  } catch {
    return fail('Requête refusée.', 400)
  }
  const r =
    request.method === 'POST' && path === '/library'
      ? await shareEntry(kv, body)
      : request.method === 'DELETE'
        ? await removeEntry(kv, path.slice('/library/'.length), body?.token)
        : { status: 405, error: 'Méthode non prise en charge.' }
  return r.data ? reply(r.data) : fail(r.error, r.status)
}

/** GET /diagnostic: tries each configured key on a tiny request, and refreshes the USER library list. */
async function diagnostic(env) {
  const req = { system: `${PROMPT_START}.`, schema: { type: 'object', properties: { ok: { type: 'boolean' } } }, text: 'Reply {"ok": true}.' }
  const out = { relais: 'SynopGig, en ligne', groq: 'pas de clé GROQ_API_KEY', gemini: 'pas de clé GEMINI_API_KEY' }
  if (env.GROQ_API_KEY) {
    groqModels = undefined
    const [model] = await pickGroqModels(env)
    const r = await groqCall(req, env, model, true).catch((e) => ({ status: 0, error: String(e) }))
    out.groq = r.status === 200 ? `OK (modèle ${model})` : `ERREUR ${r.status} : ${r.error}`
    out.groq_modeles_du_compte = (groqModels?.list ?? []).filter((m) => !NOT_CHAT.test(m))
  }
  if (env.GEMINI_API_KEY) {
    const r = await askGemini(req, env).catch((e) => ({ status: 0, error: String(e) }))
    out.gemini = r.status === 200 && r.text ? 'OK' : `ERREUR ${r.error}`
  }
  out.bibliotheque_user = env.LIBRARY
    ? await rebuildLibrary(env.LIBRARY).then((l) => `OK (${l.length} matériels partagés)`, (e) => `ERREUR ${String(e).slice(0, 100)}`)
    : 'pas de stockage LIBRARY (partage désactivé)'
  return out
}

export default {
  async fetch(request, env) {
    const origins = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map((o) => o.trim())
    const origin = request.headers.get('Origin') || ''
    const cors = {
      'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0],
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    }
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
    const fail = (message, status) => reply({ error: { message } }, status)

    const path = new URL(request.url).pathname.replace(/\/+$/, '')
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (path === '/library' || path.startsWith('/library/')) {
      return library(request, env, path, reply, fail, origins.includes(origin)).catch(() => fail('Erreur du stockage, réessayez.', 500))
    }
    if (request.method === 'GET' && path === '/diagnostic') {
      if (tooMany(request.headers.get('CF-Connecting-IP') || 'unknown')) return fail('Trop de diagnostics, réessayez plus tard.', 429)
      return new Response(JSON.stringify(await diagnostic(env), null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
    }
    if (request.method !== 'POST') return fail('Relais IA SynopGig : POST uniquement. Diagnostic : ouvrez /diagnostic.', 405)
    if (!origins.includes(origin)) return fail('Site non autorisé.', 403)
    if (!env.GROQ_API_KEY && !env.GEMINI_API_KEY) return fail('Relais non configuré (clé manquante).', 500)
    if (tooMany(request.headers.get('CF-Connecting-IP') || 'unknown')) return fail('Trop d’analyses en une heure, réessayez plus tard.', 429)

    let req
    try {
      req = cleanRequest(await request.json())
    } catch {
      req = null
    }
    if (!req) return fail('Requête refusée.', 400)

    // Groq is the fastest but only reads text; Gemini also reads scanned PDFs.
    const order = []
    if (env.GROQ_API_KEY && req.text) order.push(askGroq)
    if (env.GEMINI_API_KEY) order.push(askGemini)
    if (order.length === 0) return fail('PDF scanné : collez plutôt le texte des caractéristiques.', 422)

    const errors = []
    let quota = false
    for (const ask of order) {
      const r = await ask(req, env).catch((e) => ({ status: 502, error: `réseau : ${String(e).slice(0, 100)}` }))
      if (r.status === 200 && r.text) return reply({ text: r.text })
      quota ||= r.status === 429
      errors.push(r.error ?? `HTTP ${r.status}`)
    }
    return fail(quota ? `Quota gratuit atteint, réessayez plus tard (${errors.join(' · ')})` : errors.join(' · '), quota ? 429 : 502)
  },
}
