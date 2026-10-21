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
 * Open <worker address>/diagnostic in a browser to check the keys.
 * POST /page {url} reads a shop page (flight case, rack) and returns its useful lines.
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

/** Title, product data (JSON-LD) and the lines that talk about size, weight and wheels. */
export function pageText(html) {
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
    if (line.length < 3 || line.length > 300 || seen.has(line) || !PAGE_LINES.test(line)) continue
    seen.add(line)
    lines.push(line)
  }
  const text = [title && `Titre : ${title}`, description && `Description : ${description}`, ...products.map((p) => `Données produit : ${p}`), ...lines].filter(Boolean).join('\n')
  return { title, text: text.slice(0, 12000) }
}

async function readPage(raw) {
  const url = pageUrl(raw)
  if (!url) return { status: 400, error: 'Adresse refusée : collez le lien complet de la page produit (https://…).' }
  let res
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SynopGig/1.0; +https://arnisound.github.io/SynopGig/)', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'fr,en;q=0.8,de;q=0.6' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    return { status: 502, error: 'Site injoignable (ou trop lent).' }
  }
  if (!res.ok) return { status: 502, error: `Le site a refusé la lecture (${res.status}) : copiez plutôt le texte de la page.` }
  if (!/html|text/i.test(res.headers.get('Content-Type') ?? '')) return { status: 415, error: 'Ce lien n’est pas une page web.' }
  const reader = res.body.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_PAGE) {
      await reader.cancel()
      break
    }
    chunks.push(value)
  }
  const page = pageText(new TextDecoder().decode(await new Blob(chunks).arrayBuffer()))
  if (!page.text.trim()) return { status: 422, error: 'Rien de lisible sur cette page : copiez plutôt son texte.' }
  return { status: 200, data: page }
}

/** GET /diagnostic: tries each configured key on a tiny request. */
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
    if (request.method === 'GET' && path === '/diagnostic') {
      if (tooMany(request.headers.get('CF-Connecting-IP') || 'unknown')) return fail('Trop de diagnostics, réessayez plus tard.', 429)
      return new Response(JSON.stringify(await diagnostic(env), null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
    }
    if (request.method !== 'POST') return fail('Relais IA SynopGig : POST uniquement. Diagnostic : ouvrez /diagnostic.', 405)
    if (!origins.includes(origin)) return fail('Site non autorisé.', 403)
    if (path === '/page') {
      if (tooMany(request.headers.get('CF-Connecting-IP') || 'unknown')) return fail('Trop de lectures en une heure, réessayez plus tard.', 429)
      const body = await request.json().catch(() => null)
      const r = await readPage(body?.url)
      return r.data ? reply(r.data) : fail(r.error, r.status)
    }
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
