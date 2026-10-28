/*
 * SynopGig AI relay (SynopGig, an Arnisound tools app — arnisoundtools.com): a free Cloudflare Worker that reads data sheets with the
 * site owner's free AI key, so the public has nothing to set up and every
 * browser gets an answer in a couple of seconds. Setup in worker/README.md.
 *
 * Settings (Cloudflare > Worker > Settings > Variables and Secrets):
 *   GROQ_API_KEY     secret, recommended: very fast (console.groq.com/keys)
 *   MISTRAL_API_KEY  secret, recommended first: generous free tier (console.mistral.ai)
 *   CEREBRAS_API_KEY secret, optional: gpt-oss-120b with its own free quota (cloud.cerebras.ai)
 *   GEMINI_API_KEY   secret, alternative or complement: also reads scanned PDFs
 *   AI               binding (Settings > Bindings > Workers AI), no key: Cloudflare's
 *                    own open models, used last (small free daily allowance)
 *   ALLOWED_ORIGINS  optional, comma separated (default: the GitHub Pages site)
 *   GROQ_MODEL       optional (default: best model the account can use)
 *   GEMINI_MODEL     optional (default gemini-2.5-flash)
 *   MISTRAL_MODEL    optional (default: best model the account can use, medium first)
 *
 * Protection (nobody can use the keys up for everyone):
 *   LIMITS           optional KV namespace binding: daily counts kept across
 *                    every Cloudflare instance (without it, per instance only)
 *   PER_HOUR         analyses and searches per visitor and hour (default 20)
 *   PER_DAY          analyses and searches per visitor and day (default 60)
 *   DAILY_LIMIT      analyses and searches for everyone together per day (default 400)
 *
 * Open <worker address>/diagnostic in a browser to check the keys.
 * POST /page {url} reads a shop page (flight case, rack) and returns its useful lines.
 * POST /find {brand, model} finds a product's documentation; POST /doc {url} reads one;
 * POST /images {url} lists a page's product photos, POST /image {url} fetches one.
 *   GROQ_SEARCH_MODEL / GEMINI_SEARCH_MODEL  optional, models used to search the web
 *     (default: Groq's gpt-oss models with their built-in browser search)
 */

const DEFAULT_ORIGINS = 'https://arnisoundtools.com,https://www.arnisoundtools.com,https://arnisound.github.io,http://localhost:5173'
const PROMPT_START = 'You are a live sound, lighting and video technician'
const MAX_TEXT = 20000
const MAX_PDF_BASE64 = 11_000_000

/*
 * Two kinds of requests: "ia" ones spend the AI quotas (analysis, search),
 * "web" ones only read public pages (documents, photos: many per product).
 * Each visitor gets an hourly allowance per kind, kept by each Cloudflare
 * instance; the daily ones (per visitor and for everyone) are kept in the
 * LIMITS KV namespace when it is bound, so they hold everywhere.
 */
const HOURLY = { ia: 20, web: 200, diag: 10 }
const hits = new Map()

function tooManyThisHour(kind, ip, env) {
  const max = kind === 'ia' ? Number(env.PER_HOUR) || HOURLY.ia : HOURLY[kind]
  const key = `${kind}|${ip}`
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > max
}

// Without KV: the same daily counts, for this instance only.
const dayCounts = new Map()
const today = () => new Date().toISOString().slice(0, 10)

/** A visitor is known by a hash of their address, never the address itself. */
async function visitor(ip) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`synopgig|${ip}`))
  return [...new Uint8Array(bytes).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function count(env, key) {
  if (!env.LIMITS) {
    if (dayCounts.size > 5000) dayCounts.clear()
    const n = (dayCounts.get(key) ?? 0) + 1
    dayCounts.set(key, n)
    return n
  }
  const n = (Number(await env.LIMITS.get(key)) || 0) + 1
  await env.LIMITS.put(key, String(n), { expirationTtl: 172800 })
  return n
}

/** Why this AI request is refused, or undefined when it may go. */
export async function aiRefusal(ip, env) {
  if (tooManyThisHour('ia', ip, env)) return 'Trop d’analyses en une heure : réessayez un peu plus tard.'
  const day = today()
  const mine = await count(env, `d:${day}:${await visitor(ip)}`)
  if (mine > (Number(env.PER_DAY) || 60)) return 'Limite d’analyses du jour atteinte pour votre connexion : réessayez demain.'
  const all = await count(env, `d:${day}:all`)
  if (all > (Number(env.DAILY_LIMIT) || 400)) return 'Le service a atteint sa limite du jour pour tous les utilisateurs : réessayez demain, ou complétez la fiche à la main.'
  return undefined
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
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'moonshotai/kimi-k2-instruct',
  'qwen/qwen3-32b',
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
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

/**
 * Strict structured output (OpenAI style): every property listed as required,
 * the optional ones nullable, no extra keys.
 */
export function strictSchema(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return s
  if (s.type === 'array') return { ...s, items: strictSchema(s.items) }
  if (s.type !== 'object') return s
  const required = new Set(s.required ?? [])
  const properties = Object.fromEntries(
    Object.entries(s.properties ?? {}).map(([k, v]) => {
      const inner = strictSchema(v)
      if (required.has(k)) return [k, inner]
      return [k, { ...inner, type: [inner.type, 'null'], ...(inner.enum ? { enum: [...inner.enum, null] } : {}) }]
    }),
  )
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false }
}

/** Reasoning models think before answering: worth it, a sheet is full of traps. */
const thinks = (model) => model.startsWith('openai/gpt-oss') || /qwen3|deepseek/.test(model)

/**
 * The schema in a few words, for JSON mode: the long code lists are already
 * in the prompt, and the free tier counts every token per minute.
 */
export function shape(s) {
  if (!s || typeof s !== 'object') return 'any'
  if (s.enum) return s.enum.length > 8 ? 'code' : s.enum.map((v) => JSON.stringify(v)).join('|')
  if (s.type === 'array') return `[${shape(s.items)}, ...]`
  if (s.type === 'object') {
    const req = new Set(s.required ?? [])
    return `{${Object.entries(s.properties ?? {}).map(([k, v]) => `"${k}":${shape(v)}${req.has(k) ? '' : '?'}`).join(',')}}`
  }
  return String(s.type)
}

/** The messages of an analysis; in strict mode the schema is enforced already: spared tokens. */
const analysisMessages = (req, mode) => [
  { role: 'system', content: mode === 'schema' ? req.system : `${req.system}\nAnswer with a single JSON object of this shape, nothing else (? = optional):\n${shape(req.schema)}` },
  { role: 'user', content: `Data sheet extracts:\n${req.text}` },
]

/**
 * One analysis on an OpenAI-compatible service (Groq, Cerebras).
 * mode: 'schema' (strict structured output), 'json' (any JSON object) or 'plain'.
 */
async function openAiCall(url, key, req, env, model, mode) {
  const format =
    mode === 'schema'
      ? { response_format: { type: 'json_schema', json_schema: { name: 'device', strict: true, schema: strictSchema(req.schema) } } }
      : mode === 'json'
        ? { response_format: { type: 'json_object' } }
        : {}
  const big = model.includes('120b')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: thinks(model) ? 0.2 : 0,
      // The thinking counts in the tokens: room for it and for a long list.
      max_tokens: thinks(model) ? 6000 : 2500,
      // The best model thinks a little more; the spare one stays quick and cheap.
      ...(/gpt-oss/.test(model) ? { reasoning_effort: env.GROQ_REASONING || (big ? 'medium' : 'low') } : {}),
      ...(/qwen3|deepseek/.test(model) && url.includes('groq') ? { reasoning_format: 'hidden' } : {}),
      ...format,
      messages: analysisMessages(req, mode),
    }),
    signal: AbortSignal.timeout(60000),
  }).catch((e) => ({ ok: false, status: 504, json: async () => ({ error: { message: e.name === 'TimeoutError' ? 'trop lent' : String(e.message) } }) }))
  const data = await res.json().catch(() => ({}))
  const error = res.ok ? undefined : reason(data, res.status)
  // "Please try again in 7.5s": how long until the minute quota frees up.
  const wait = error && /try again in (?:(\d+)m)?([\d.]+)s/i.exec(error)
  return { status: res.status, text: extractJson(data.choices?.[0]?.message?.content), error, wait: wait ? Number(wait[1] ?? 0) * 60 + Number(wait[2]) : undefined }
}

const groqCall = (req, env, model, mode) => openAiCall('https://api.groq.com/openai/v1/chat/completions', env.GROQ_API_KEY, req, env, model, mode)

/*
 * Cerebras: same open models as Groq (gpt-oss-120b), its own free quota
 * (about a million tokens a day). Key at cloud.cerebras.ai.
 */
async function askCerebras(req, env) {
  const models = [...new Set([env.CEREBRAS_MODEL || 'gpt-oss-120b', 'llama-3.3-70b'])]
  const url = 'https://api.cerebras.ai/v1/chat/completions'
  let last
  for (const [model, mode] of models.flatMap((m) => [[m, 'schema'], [m, 'json']])) {
    last = await openAiCall(url, env.CEREBRAS_API_KEY, req, env, model, mode)
    if (last.status === 200 && last.text) return last
    if (last.status === 401 || last.status === 403) break
  }
  return { ...last, error: `Cerebras ${last.status} : ${last.error ?? 'réponse illisible'}` }
}

/** Text of a Workers AI answer, whatever its shape (plain, OpenAI chat or Responses). */
function workersText(out) {
  if (!out) return ''
  if (typeof out === 'string') return out
  if (typeof out.response === 'string') return out.response
  if (out.response && typeof out.response === 'object') return JSON.stringify(out.response)
  const chat = out.choices?.[0]?.message?.content
  if (typeof chat === 'string') return chat
  if (Array.isArray(out.output)) {
    return out.output
      .flatMap((o) => (Array.isArray(o.content) ? o.content : []))
      .map((c) => c.text ?? '')
      .join('')
  }
  return ''
}

/*
 * Cloudflare Workers AI: open models run by Cloudflare itself, no key at
 * all, only an "AI" binding on this Worker. Free daily allowance (10 000
 * "neurons" a day, shared by every model): kept for when the others are full.
 */
async function askWorkersAi(req, env) {
  const models = [...new Set([env.WORKERS_AI_MODEL || '@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'])]
  let last
  for (const model of models) {
    try {
      const out = await env.AI.run(model, {
        messages: analysisMessages(req, 'json'),
        max_tokens: 6000,
        temperature: 0.2,
        ...(model.includes('gpt-oss') ? { reasoning: { effort: 'medium' } } : {}),
      })
      const text = extractJson(workersText(out))
      if (text) return { status: 200, text }
      last = { status: 200, error: 'réponse illisible' }
    } catch (e) {
      const message = String(e?.message ?? e).slice(0, 200)
      // 4006: the daily free allowance is used up.
      last = { status: /4006|neuron|limit|capacity/i.test(message) ? 429 : 502, error: message }
      if (last.status === 429) break
    }
  }
  return { ...last, error: `Workers AI ${last.status} : ${last.error}` }
}

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000))
const MAX_WAIT = 20

/**
 * Best model with strict structured output, then plain JSON mode (a model or
 * account without structured outputs), then the second model. A model out of
 * its minute quota is not asked again; when all of them are, and the quota
 * frees up within a few seconds, the relay waits and asks once more.
 */
async function askGroq(req, env) {
  const [main, second] = await pickGroqModels(env)
  const tries = [[main, 'schema'], [main, 'json'], ...(second ? [[second, 'json'], [second, 'plain']] : [[main, 'plain']])]
  const busy = new Map()
  const notes = []
  let last
  for (const [model, mode] of tries) {
    if (busy.has(model)) continue
    last = await groqCall(req, env, model, mode)
    if (last.status === 200 && last.text) return last
    notes.push(`${model.replace(/^.*\//, '')} : ${last.status === 200 ? 'réponse illisible' : last.status}`)
    if (last.status === 429) busy.set(model, last.wait ?? Infinity)
    // A model that disappeared: list them again next time.
    if (last.status === 404) groqModels = undefined
    // A refused key will be refused again: no point retrying.
    if (last.status === 401 || last.status === 403) break
  }
  const soonest = [...busy.entries()].sort((a, b) => a[1] - b[1])[0]
  if (soonest && soonest[1] <= MAX_WAIT && busy.size === new Set(tries.map((t) => t[0])).size) {
    await sleep(soonest[1] + 0.5)
    const again = await groqCall(req, env, soonest[0], 'json')
    if (again.status === 200 && again.text) return again
    last = again
  }
  return { ...last, error: `Groq ${last.status} : ${last.error ?? 'réponse illisible'}${notes.length > 1 ? ` [${notes.join(', ')}]` : ''}` }
}

/*
 * Mistral (open models, French company): strict schema first, then plain
 * JSON mode, on the medium model then the small one.
 */
async function mistralCall(req, env, model, strict) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.MISTRAL_API_KEY}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 3000,
      response_format: strict ? { type: 'json_schema', json_schema: { name: 'device', strict: true, schema: strictSchema(req.schema) } } : { type: 'json_object' },
      messages: [
        { role: 'system', content: strict ? req.system : `${req.system}\nAnswer with a single JSON object of this shape, nothing else (? = optional):\n${shape(req.schema)}` },
        { role: 'user', content: `Data sheet extracts:\n${req.text}` },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  }).catch((e) => ({ ok: false, status: 504, json: async () => ({ message: e.name === 'TimeoutError' ? 'trop lent' : String(e.message) }) }))
  const data = await res.json().catch(() => ({}))
  const content = data.choices?.[0]?.message?.content
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((c) => c.text ?? '').join('') : ''
  return { status: res.status, text: extractJson(text), error: res.ok ? undefined : String(data.message ?? data.detail ?? reason(data, res.status)).slice(0, 200) }
}

// Free keys do not reach every model: ask the account which ones it has.
const MISTRAL_PREFERRED = ['mistral-medium-latest', 'mistral-large-latest', 'mistral-small-latest', 'magistral-medium-latest', 'ministral-8b-latest', 'open-mistral-nemo', 'ministral-3b-latest']
let mistralModels

export async function pickMistralModels(env) {
  if (mistralModels?.key !== env.MISTRAL_API_KEY) {
    const res = await fetch('https://api.mistral.ai/v1/models', { headers: { Authorization: `Bearer ${env.MISTRAL_API_KEY}` } }).catch(() => null)
    const data = res?.ok ? await res.json().catch(() => ({})) : {}
    const list = Array.isArray(data.data) ? data.data.filter((m) => m?.capabilities?.completion_chat !== false).map((m) => String(m.id)) : []
    if (list.length) mistralModels = { key: env.MISTRAL_API_KEY, list }
  }
  const available = mistralModels?.list ?? []
  if (available.length === 0) return [env.MISTRAL_MODEL || 'mistral-medium-latest', 'mistral-small-latest']
  return [env.MISTRAL_MODEL, ...MISTRAL_PREFERRED].filter((m) => m && available.includes(m)).slice(0, 2)
}

async function askMistral(req, env) {
  const models = await pickMistralModels(env)
  if (models.length === 0) return { status: 404, error: 'Mistral : aucun modèle de discussion sur ce compte' }
  const tries = models.flatMap((m) => [[m, true], [m, false]])
  const busy = new Set()
  let last
  for (const [model, strict] of tries) {
    if (busy.has(model)) continue
    last = await mistralCall(req, env, model, strict)
    if (last.status === 200 && last.text) return last
    if (last.status === 401 || last.status === 403) break
    // Out of quota: no use asking the same model without the schema; the small one has its own quota.
    if (last.status === 429) busy.add(model)
    if (last.status === 404) mistralModels = undefined
  }
  return { ...last, error: `Mistral ${last.status} : ${last.error ?? 'réponse illisible'}` }
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
    : [{ text: `Data sheet extracts:\n${req.text}` }]
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 6000,
        responseMimeType: 'application/json',
        responseSchema: geminiSchema(req.schema),
        // A short thinking pass: counts per channel, duplicates, options.
        thinkingConfig: { thinkingBudget: 1024 },
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  const text = extractJson(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join(''))
  return { status: res.status, text, error: res.ok && text ? undefined : `Gemini ${res.status} : ${res.ok ? 'réponse illisible' : reason(data, res.status)}` }
}

/* ---------- Shop pages (flight cases, racks) ---------- */

const MAX_PAGE = 3_000_000
const PAGE_LINES = /\d.*(?:cm|mm|kg|\bU\b|\bHE\b|\bRU\b|unit|dimension|abmessung|maße|taille|hauteur|largeur|profondeur|longueur|height|width|depth|length|höhe|breite|tiefe|länge|poids|weight|gewicht|19|rack)|roulette|wheel|castor|rollen|poignée|handle|griff|intérieur|interior|inner|innen|extérieur|exterior|outer|außen/i

/** Public http(s) addresses only: no local names, no IP literals, no odd ports. */
export function pageUrl(raw) {
  let u
  try {
    u = new URL(String(raw ?? '').trim())
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null
  if (u.port && !['80', '443'].includes(u.port)) return null
  const h = u.hostname.toLowerCase()
  if (!h.includes('.') || h.includes(':') || /^[\d.]+$/.test(h) || /(?:^|\.)(?:localhost|local|internal|lan|home)$/.test(h)) return null
  return u
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', uuml: 'ü', ouml: 'ö', auml: 'ä', szlig: 'ß', times: '×' }
const decode = (t) =>
  t.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m),
  )

/**
 * Title, product data (JSON-LD) and the useful lines of a page: by default
 * those about size, weight and wheels (cases); `lines: null` keeps every line
 * (data sheets, where the app picks the connector lines itself).
 */
export function pageText(html, { lines: filter = PAGE_LINES, max = 12000 } = {}) {
  const title = decode(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()
  const description = decode(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? '').trim()
  const products = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim())
    .filter((j) => /product/i.test(j))
    .map((j) => j.replace(/\s+/g, ' ').slice(0, 3000))
  const body = html
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(?:br|p|li|tr|div|h\d|dt|dd|section|article|table|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
  const seen = new Set()
  const lines = []
  for (const raw of decode(body).split('\n')) {
    const line = raw.replace(/\s+/g, ' ').replace(/(?:\s*\|\s*)+$/, '').trim()
    if (line.length < 3 || line.length > 300 || seen.has(line) || (filter && !filter.test(line))) continue
    seen.add(line)
    lines.push(line)
  }
  const text = [title && `Titre : ${title}`, description && `Description : ${description}`, ...products.map((p) => `Données produit : ${p}`), ...lines].filter(Boolean).join('\n')
  return { title, text: text.slice(0, max) }
}

const UA = 'Mozilla/5.0 (compatible; SynopGig/1.0 by Arnisound tools; +https://arnisoundtools.com)'

/** Downloads a public page or file, at most `limit` bytes. */
async function download(raw, limit) {
  const url = pageUrl(raw)
  if (!url) return { status: 400, error: 'Adresse refusée : collez le lien complet (https://…).' }
  let res
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5', 'Accept-Language': 'fr,en;q=0.8,de;q=0.6' },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    })
  } catch {
    return { status: 502, error: 'Site injoignable (ou trop lent).' }
  }
  if (!res.ok) return { status: 502, error: `Le site a refusé la lecture (${res.status}) : téléchargez le document vous-même et déposez-le.` }
  const reader = res.body.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > limit) {
      await reader.cancel()
      return { status: 413, error: 'Document trop lourd : téléchargez-le vous-même et déposez-le.' }
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer())
  const type = res.headers.get('Content-Type') ?? ''
  const pdf = /pdf/i.test(type) || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)
  return { status: 200, bytes, pdf, html: !pdf && /html|text/i.test(type) }
}

async function readPage(raw) {
  const r = await download(raw, MAX_PAGE)
  if (r.status !== 200) return r
  if (!r.html) return { status: 415, error: 'Ce lien n’est pas une page web.' }
  const page = pageText(new TextDecoder().decode(r.bytes))
  if (!page.text.trim()) return { status: 422, error: 'Rien de lisible sur cette page : copiez plutôt son texte.' }
  return { status: 200, data: page }
}

/* ---------- Finding a product's documentation ---------- */

const MAX_DOC = 15_000_000
const SHOPS = /amazon|ebay|thomann|woodbrass|musicstore|bax-shop|sweetwater|fnac|cdiscount|leboncoin|aliexpress|manualslib|manua\.ls|scribd|pinterest|facebook|youtube|reddit|gearspace|audiofanzine/i

const words = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/** Official site first, then data sheets (PDF) and pages that name the exact model; shops and forums last. */
export function rankDocs(found, brand, model) {
  const b = words(brand).split(' ').filter((w) => w.length >= 3)
  const m = words(model).replace(/ /g, '')
  const seen = new Set()
  const out = []
  for (const f of found) {
    const url = pageUrl(f.url)
    if (!url) continue
    const key = url.href.replace(/[#?].*$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    const host = url.hostname.replace(/^www\./, '')
    const hay = words(`${f.title ?? ''} ${url.pathname}`).replace(/ /g, '')
    const official = b.some((w) => host.replace(/[^a-z0-9]/g, '').includes(w)) && !SHOPS.test(host)
    const pdf = /\.pdf($|\?)/i.test(url.pathname) || f.pdf === true
    const exact = m.length >= 2 && hay.includes(m)
    const score = (official ? 4 : 0) + (exact ? 3 : 0) + (pdf ? 2 : 0) - (SHOPS.test(host) ? 3 : 0)
    out.push({ title: String(f.title || host).slice(0, 140), url: url.href, host, kind: pdf ? 'pdf' : 'page', official, score })
  }
  return out.sort((x, y) => y.score - x.score).slice(0, 8)
}

/** DuckDuckGo's HTML results (two addresses): no key, but it may turn robots away. */
async function searchDuckDuckGo(q) {
  const parse = (html) =>
    [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*class=['"]?result(?:__a|-link)['"]?[^>]*>([\s\S]*?)<\/a>|<a[^>]+class=['"]?result(?:__a|-link)['"]?[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((x) => {
      const u = decode(x[1] ?? x[3])
      const real = u.includes('uddg=') ? decodeURIComponent(u.split('uddg=')[1].split('&')[0]) : u.startsWith('//') ? `https:${u}` : u
      return { url: real, title: decode((x[2] ?? x[4]).replace(/<[^>]+>/g, '')).trim() }
    })
  let last = 'aucun résultat'
  for (const base of ['https://html.duckduckgo.com/html/', 'https://lite.duckduckgo.com/lite/']) {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Accept-Language': 'fr,en;q=0.8', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `q=${encodeURIComponent(q)}`,
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      last = `HTTP ${res.status}`
      continue
    }
    const found = parse(await res.text())
    if (found.length) return found
    last = 'page sans résultats (anti-robot)'
  }
  throw new Error(`DuckDuckGo : ${last}`)
}

const urlsIn = (text) => [...String(text).matchAll(/https?:\/\/[^\s"'<>\\)\]]+/g)].map((m) => m[0].replace(/[.,;:]+$/, ''))

/**
 * Groq searches the web itself: built-in "browser search" of the gpt-oss
 * models, or the compound models where the account has them.
 */
async function searchGroq(q, env) {
  const models = [env.GROQ_SEARCH_MODEL, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini'].filter(Boolean)
  const prompt = `Search the web for the official manufacturer documentation of this professional audio / lighting / video product: ${q}. Give the product page and the PDF data sheet or user manual on the manufacturer's website, one URL per line with its title. Only real URLs you found.`
  let last = 'aucun modèle'
  for (const model of [...new Set(models)]) {
    const compound = model.startsWith('groq/compound')
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        ...(compound ? {} : { tools: [{ type: 'browser_search' }], tool_choice: 'required', reasoning_effort: 'low' }),
      }),
      signal: AbortSignal.timeout(25000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      last = `${model} : ${reason(data, res.status)}`
      // A missing model or tool: try the next one; a refused key will be refused again.
      if (res.status === 401 || res.status === 403) break
      continue
    }
    const msg = data.choices?.[0]?.message ?? {}
    const tools = msg.executed_tools ?? []
    const fromTools = tools.flatMap((t) => t.search_results?.results ?? []).map((r) => ({ url: r.url, title: r.title }))
    const found = [...fromTools, ...urlsIn(JSON.stringify(tools)).map((url) => ({ url })), ...urlsIn(msg.content ?? '').map((url) => ({ url }))]
    if (found.length) return found
    last = `${model} : aucune adresse dans la réponse`
  }
  throw new Error(`Groq : ${last}`)
}

/** Gemini grounded on Google Search: the sources it read are the results. */
async function searchGemini(q, env) {
  const model = env.GEMINI_SEARCH_MODEL || 'gemini-2.5-flash'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `Find the official manufacturer documentation (product page and PDF data sheet or manual) of: ${q}. Give the URLs.` }] }],
      tools: [{ google_search: {} }],
    }),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  const cand = data.candidates?.[0] ?? {}
  const chunks = (cand.groundingMetadata?.groundingChunks ?? []).map((c) => c.web).filter(Boolean)
  // Google hands redirect links: follow each one to the real address.
  const real = await Promise.all(
    chunks.slice(0, 8).map(async (w) => {
      try {
        const r = await fetch(w.uri, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(5000) })
        return { url: r.headers.get('Location') || w.uri, title: w.title }
      } catch {
        return { url: w.uri, title: w.title }
      }
    }),
  )
  const text = (cand.content?.parts ?? []).map((p) => p.text ?? '').join('')
  return [...real, ...urlsIn(text).map((url) => ({ url }))]
}

/** POST /find {brand, model}: the documents found, best first. Nothing is read yet. */
async function findDocs(body, env) {
  const brand = String(body?.brand ?? '').trim().slice(0, 60)
  const model = String(body?.model ?? '').trim().slice(0, 80)
  if (!model) return { status: 400, error: 'Indiquez au moins le modèle.' }
  const q = `${brand} ${model}`.trim()
  const searches = [searchDuckDuckGo(`${q} datasheet specifications`), searchDuckDuckGo(`${q} pdf`)]
  if (env.GROQ_API_KEY) searches.push(searchGroq(q, env))
  if (env.GEMINI_API_KEY) searches.push(searchGemini(q, env))
  const found = (await Promise.allSettled(searches)).flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  const results = rankDocs(found, brand, model)
  if (results.length === 0) return { status: 404, error: 'Aucun document trouvé : vérifiez l’orthographe, ou déposez la fiche vous-même.' }
  return { status: 200, data: { results } }
}

/**
 * Product photos of a page, best first: the share image (og:image), the
 * product data (JSON-LD), then pictures whose name or caption cites the model.
 * Logos, icons and flags are left out.
 */
export function pageImages(html, base, model = '') {
  const abs = (u) => {
    try {
      const url = new URL(decode(u.trim()), base)
      return /^https?:$/.test(url.protocol) ? url.href : null
    } catch {
      return null
    }
  }
  const junk = /logo|icon|sprite|flag|badge|favicon|avatar|banner|placeholder|loader|pixel|\.svg($|\?)/i
  const m = words(model).replace(/ /g, '')
  const found = []
  for (const re of [/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]+content=["']([^"']+)/gi, /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi]) {
    for (const x of html.matchAll(re)) found.push(x[1])
  }
  for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const x of block[1].matchAll(/"image"\s*:\s*(\[[^\]]*\]|\{[^}]*\}|"[^"]+")/g)) for (const u of x[1].matchAll(/"(https?:[^"]+|\/[^"]+)"/g)) found.push(u[1].replace(/\\\//g, '/'))
  }
  for (const x of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = x[0]
    const src = tag.match(/\s(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i)?.[1]
    const alt = tag.match(/\salt=["']([^"']*)["']/i)?.[1] ?? ''
    if (!src || src.startsWith('data:')) continue
    if (m.length >= 2 && words(`${alt} ${src}`).replace(/ /g, '').includes(m)) found.push(src)
  }
  const out = []
  for (const u of found) {
    const a = abs(u)
    if (a && !junk.test(a) && !out.includes(a)) out.push(a)
  }
  return out.slice(0, 6)
}

/** POST /doc {url, model}: the PDF as is (the app reads it), or the text and photos of a page. */
async function readDoc(body) {
  const r = await download(body?.url, MAX_DOC)
  if (r.status !== 200) return r
  if (r.pdf) return { status: 200, pdf: r.bytes }
  if (!r.html) return { status: 415, error: 'Ce document n’est ni un PDF ni une page web.' }
  const html = new TextDecoder().decode(r.bytes)
  const page = pageText(html, { lines: null, max: 20000 })
  return { status: 200, data: { ...page, images: pageImages(html, body.url, body.model) } }
}

/** POST /images {url, model}: only the photos of a product page (when the document read was a PDF). */
async function readImages(body) {
  const r = await download(body?.url, MAX_PAGE)
  if (r.status !== 200) return r
  if (!r.html) return { status: 200, data: { images: [] } }
  return { status: 200, data: { images: pageImages(new TextDecoder().decode(r.bytes), body.url, body.model) } }
}

const MAX_IMAGE = 4_000_000
const IMAGE_TYPES = /^image\/(jpeg|png|webp|gif|avif)/i

/** POST /image {url}: one photo, for the app to shrink into a thumbnail. */
async function readImage(body) {
  const r = await download(body?.url, MAX_IMAGE)
  if (r.status !== 200) return r
  const b = r.bytes
  const type = b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : b[0] === 0x89 && b[1] === 0x50 ? 'image/png' : b[8] === 0x57 && b[9] === 0x45 ? 'image/webp' : b[0] === 0x47 && b[1] === 0x49 ? 'image/gif' : ''
  if (!type || !IMAGE_TYPES.test(type)) return { status: 415, error: 'Ce lien n’est pas une image.' }
  return { status: 200, image: b, type }
}

/** GET /diagnostic: tries each configured key on a tiny request. */
async function diagnostic(env) {
  const req = { system: `${PROMPT_START}.`, schema: { type: 'object', properties: { ok: { type: 'boolean' } } }, text: 'Reply {"ok": true}.' }
  const out = { relais: 'SynopGig, en ligne', mistral: 'pas de clé MISTRAL_API_KEY', groq: 'pas de clé GROQ_API_KEY', gemini: 'pas de clé GEMINI_API_KEY' }
  if (env.MISTRAL_API_KEY) {
    mistralModels = undefined
    const [model] = await pickMistralModels(env)
    const r = model ? await mistralCall(req, env, model, false).catch((e) => ({ status: 0, error: String(e) })) : { status: 404, error: 'aucun modèle' }
    out.mistral = r.status === 200 ? `OK (modèle ${model})` : `ERREUR ${r.status} : ${r.error}`
    out.mistral_modeles_du_compte = mistralModels?.list ?? []
  }
  if (env.CEREBRAS_API_KEY) {
    const r = await openAiCall('https://api.cerebras.ai/v1/chat/completions', env.CEREBRAS_API_KEY, req, env, env.CEREBRAS_MODEL || 'gpt-oss-120b', 'json').catch((e) => ({ status: 0, error: String(e) }))
    out.cerebras = r.status === 200 ? 'OK' : `ERREUR ${r.status} : ${r.error}`
  }
  if (env.AI) {
    const r = await askWorkersAi(req, env).catch((e) => ({ status: 0, error: String(e) }))
    out.workers_ai = r.status === 200 && r.text ? 'OK (sans clé)' : `ERREUR ${r.error}`
  } else out.workers_ai = 'pas de liaison AI (Settings > Bindings > Workers AI)'
  const day = today()
  const used = env.LIMITS ? Number(await env.LIMITS.get(`d:${day}:all`)) || 0 : undefined
  out.protection = {
    par_visiteur: `${Number(env.PER_HOUR) || HOURLY.ia} par heure, ${Number(env.PER_DAY) || 60} par jour`,
    pour_tous: `${Number(env.DAILY_LIMIT) || 400} par jour`,
    compteurs: env.LIMITS ? `KV LIMITS relié (${used} analyses et recherches aujourd’hui)` : 'sans KV LIMITS : comptés par instance seulement (moins fiable)',
  }
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
  // Documentation search: which sources answer from this Worker.
  const probe = async (fn) => {
    try {
      const r = await fn()
      return r.length ? `OK (${r.length} résultats)` : 'aucun résultat'
    } catch (e) {
      return `ERREUR ${String(e?.message ?? e).slice(0, 160)}`
    }
  }
  out.recherche_duckduckgo = await probe(() => searchDuckDuckGo('Shure SM58 datasheet'))
  if (env.GROQ_API_KEY) out.recherche_groq = await probe(() => searchGroq('Shure SM58', env))
  if (env.GEMINI_API_KEY) out.recherche_gemini = await probe(() => searchGemini('Shure SM58', env))
  return out
}

export default {
  async fetch(request, env) {
    const origins = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map((o) => o.trim())
    const origin = request.headers.get('Origin') || ''
    const cors = {
      'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    }
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
    const fail = (message, status) => reply({ error: { message } }, status)

    const path = new URL(request.url).pathname.replace(/\/+$/, '')
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    if (request.method === 'GET' && path === '/diagnostic') {
      if (tooManyThisHour('diag', ip, env)) return fail('Trop de diagnostics, réessayez plus tard.', 429)
      return new Response(JSON.stringify(await diagnostic(env), null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
    }
    if (request.method !== 'POST') return fail('Relais IA SynopGig : POST uniquement. Diagnostic : ouvrez /diagnostic.', 405)
    if (!origins.includes(origin)) return fail('Site non autorisé.', 403)
    if (['/page', '/find', '/doc', '/images', '/image'].includes(path)) {
      // Searching spends the AI quota; reading pages and photos does not.
      const refused = path === '/find' ? await aiRefusal(ip, env) : tooManyThisHour('web', ip, env) ? 'Trop de lectures en une heure, réessayez plus tard.' : undefined
      if (refused) return fail(refused, 429)
      const body = await request.json().catch(() => null)
      const r =
        path === '/page'
          ? await readPage(body?.url)
          : path === '/find'
            ? await findDocs(body, env)
            : path === '/doc'
              ? await readDoc(body)
              : path === '/images'
                ? await readImages(body)
                : await readImage(body)
      if (r.pdf) return new Response(r.pdf, { headers: { ...cors, 'Content-Type': 'application/pdf' } })
      if (r.image) return new Response(r.image, { headers: { ...cors, 'Content-Type': r.type } })
      return r.data ? reply(r.data) : fail(r.error, r.status)
    }
    if (!env.MISTRAL_API_KEY && !env.GROQ_API_KEY && !env.CEREBRAS_API_KEY && !env.GEMINI_API_KEY && !env.AI) return fail('Relais non configuré (clé manquante).', 500)

    let req
    try {
      req = cleanRequest(await request.json())
    } catch {
      req = null
    }
    if (!req) return fail('Requête refusée.', 400)
    // Counted only once the request is a real analysis.
    const refused = await aiRefusal(ip, env)
    if (refused) return fail(refused, 429)

    // Mistral has the largest free quota, Groq is the fastest (both read text only); Gemini also reads scanned PDFs.
    const order = []
    if (env.MISTRAL_API_KEY && req.text) order.push(askMistral)
    if (env.GROQ_API_KEY && req.text) order.push(askGroq)
    if (env.CEREBRAS_API_KEY && req.text) order.push(askCerebras)
    if (env.GEMINI_API_KEY) order.push(askGemini)
    // No key at all: Cloudflare's own models, last because their daily allowance is small.
    if (env.AI && req.text) order.push(askWorkersAi)
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
