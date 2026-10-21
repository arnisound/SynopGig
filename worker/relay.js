/*
 * SynopGig AI relay: a free Cloudflare Worker that reads data sheets with the
 * site owner's free AI key, so the public has nothing to set up and every
 * browser gets an answer in a couple of seconds. Setup in worker/README.md.
 *
 * Settings (Cloudflare > Worker > Settings > Variables and Secrets):
 *   GROQ_API_KEY     secret, recommended: very fast (console.groq.com/keys)
 *   GEMINI_API_KEY   secret, alternative or complement: also reads scanned PDFs
 *   ALLOWED_ORIGINS  optional, comma separated (default: the GitHub Pages site)
 *   GROQ_MODEL       optional (default llama-3.3-70b-versatile)
 *   GEMINI_MODEL     optional (default gemini-2.5-flash-lite)
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

async function askGroq(req, env) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0,
      max_completion_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${req.system}\nAnswer with a JSON object following this JSON schema:\n${JSON.stringify(req.schema)}` },
        { role: 'user', content: `Data sheet:\n${req.text}` },
      ],
    }),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, text: data.choices?.[0]?.message?.content }
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
  return { status: res.status, text: data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') }
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

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (request.method !== 'POST') return fail('Relais IA SynopGig : POST uniquement.', 405)
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

    let last = 0
    for (const ask of order) {
      const { status, text } = await ask(req, env).catch(() => ({ status: 502 }))
      if (status === 200 && text) return reply({ text })
      last = status
    }
    return fail(last === 429 ? 'Quota gratuit du jour atteint, réessayez demain.' : 'Erreur du service IA.', last === 429 ? 429 : 502)
  },
}
