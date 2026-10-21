/*
 * SynopGig AI relay: a free Cloudflare Worker that forwards data sheet
 * analyses to Google Gemini with the site owner's key, so the public has
 * nothing to set up. Setup in worker/README.md.
 *
 * Settings (Cloudflare > Worker > Settings > Variables):
 *   GEMINI_API_KEY   secret, the free key from aistudio.google.com/apikey
 *   ALLOWED_ORIGINS  optional, comma separated (default: the GitHub Pages site)
 *   GEMINI_MODEL     optional (default gemini-2.5-flash)
 */

const DEFAULT_ORIGINS = 'https://arnisound.github.io,http://localhost:5173'
const MAX_TEXT = 60000
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

/** Only the shape SynopGig sends goes through: the key cannot be used for anything else. */
export function cleanRequest(body) {
  if (!body || typeof body !== 'object') return null
  const sys = body.systemInstruction?.parts?.[0]?.text
  const parts = body.contents?.[0]?.parts
  const config = body.generationConfig
  if (typeof sys !== 'string' || !sys.startsWith('You are a live sound, lighting and video technician')) return null
  if (!Array.isArray(parts) || parts.length < 1 || parts.length > 3) return null
  if (!config || config.responseMimeType !== 'application/json' || typeof config.responseSchema !== 'object') return null
  const clean = []
  for (const p of parts) {
    if (typeof p?.text === 'string' && p.text.length <= MAX_TEXT) clean.push({ text: p.text })
    else if (p?.inline_data?.mime_type === 'application/pdf' && typeof p.inline_data.data === 'string' && p.inline_data.data.length <= MAX_PDF_BASE64)
      clean.push({ inline_data: { mime_type: 'application/pdf', data: p.inline_data.data } })
    else return null
  }
  return {
    systemInstruction: { parts: [{ text: sys.slice(0, 20000) }] },
    contents: [{ role: 'user', parts: clean }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: config.responseSchema, maxOutputTokens: 4096 },
  }
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

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (request.method !== 'POST') return reply({ error: { message: 'Relais IA SynopGig : POST uniquement.' } }, 405)
    if (!origins.includes(origin)) return reply({ error: { message: 'Site non autorisé.' } }, 403)
    if (!env.GEMINI_API_KEY) return reply({ error: { message: 'Relais non configuré (clé manquante).' } }, 500)
    if (tooMany(request.headers.get('CF-Connecting-IP') || 'unknown')) {
      return reply({ error: { message: 'Trop d’analyses en une heure, réessayez plus tard.' } }, 429)
    }

    let body
    try {
      body = cleanRequest(await request.json())
    } catch {
      body = null
    }
    if (!body) return reply({ error: { message: 'Requête refusée.' } }, 400)

    const model = env.GEMINI_MODEL || 'gemini-2.5-flash'
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(body),
    })
    const data = await upstream.json().catch(() => ({}))
    if (!upstream.ok) {
      const quota = upstream.status === 429
      return reply({ error: { message: quota ? 'Quota gratuit du jour atteint, réessayez demain.' : 'Erreur du service IA.' } }, upstream.status)
    }
    return reply({ candidates: data.candidates?.slice(0, 1) ?? [] })
  },
}
