/*
 * SynopGig relay — an Arnisound tools app (arnisoundtools.com).
 *
 * A free Cloudflare Worker that does for the app what a browser cannot: it
 * keeps the AI keys secret, searches the web, and reads pages and files of
 * other sites. Setup in worker/README.md.
 *
 *   POST /          analysis of a data sheet {v: 2, system, schema, text, fullText?, pdfBase64?, single?}
 *   POST /find      {brand, model} → the product's documents, best first
 *   POST /read      {url} → a PDF or an image as is; a web page as {title, text, images, docs}
 *   POST /ocr       {url} → the text of a PDF, tables kept (Mistral OCR)
 *   GET  /diagnostic
 *
 * Secrets (any of them): GROQ_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY, ZAI_API_KEY.
 * Optional: LIMITS (KV binding), ALLOWED_ORIGINS, PER_HOUR, PER_DAY, DAILY_LIMIT,
 * GROQ_MODEL, GEMINI_MODEL, MISTRAL_MODEL, ZAI_MODEL.
 */

const DEFAULT_ORIGINS = 'https://arnisoundtools.com,https://www.arnisoundtools.com,https://arnisound.github.io,http://localhost:5173'
const PROMPT_START = 'You are a live sound, lighting and video technician'
const UA = 'Mozilla/5.0 (compatible; SynopGig/1.0 by Arnisound tools; +https://arnisoundtools.com)'

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000))
const words = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
/** The provider's own error message, short and without anything secret. */
const reason = (data, status) => String(data?.error?.message ?? data?.message ?? data?.detail ?? data?.error ?? `HTTP ${status}`).slice(0, 200)

/* ---------- Limits: nobody can use the keys up for everyone ---------- */

// Per visitor and hour, per Cloudflare instance. "ai" spends AI quotas, "web" only reads pages.
const HOURLY = { ai: 60, web: 300, diag: 30 }
const hits = new Map()

function tooManyThisHour(kind, ip, env) {
  const max = kind === 'ai' ? Number(env.PER_HOUR) || HOURLY.ai : HOURLY[kind]
  const key = `${kind}|${ip}`
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > max
}

const today = () => new Date().toISOString().slice(0, 10)
const dayCounts = new Map()

/** Daily counts, kept in the LIMITS KV namespace when bound (else per instance). */
async function count(env, key) {
  if (!env.LIMITS) {
    if (dayCounts.size > 5000) dayCounts.clear()
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
    return dayCounts.get(key)
  }
  const n = (Number(await env.LIMITS.get(key)) || 0) + 1
  await env.LIMITS.put(key, String(n), { expirationTtl: 172800 })
  return n
}

/** A visitor is known by a hash of their address, never the address itself. */
async function visitor(ip) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`synopgig|${ip}`))
  return [...new Uint8Array(bytes).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Why this AI request is refused, or undefined when it may go. Analyses
 * also count per day (kept in KV); searches and OCR per hour only.
 */
export async function aiRefusal(ip, env, daily = true) {
  if (tooManyThisHour('ai', ip, env)) return 'Trop de demandes en une heure : réessayez un peu plus tard.'
  if (!daily) return undefined
  const day = today()
  if ((await count(env, `d:${day}:${await visitor(ip)}`)) > (Number(env.PER_DAY) || 60)) return 'Limite d’analyses du jour atteinte pour votre connexion : réessayez demain.'
  if ((await count(env, `d:${day}:all`)) > (Number(env.DAILY_LIMIT) || 400)) return 'Le service a atteint sa limite du jour pour tous les utilisateurs : réessayez demain, ou complétez la fiche à la main.'
  return undefined
}

/* ---------- Reading other sites ---------- */

/** Only public web addresses: no local network, IP address or odd port. */
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

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', deg: '°', copy: '©', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', uuml: 'ü', ouml: 'ö', auml: 'ä', szlig: 'ß', times: '×' }
const decode = (t) =>
  t.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m),
  )

const MAX_FILE = 15_000_000

/** Downloads a public page or file, at most MAX_FILE bytes. */
async function download(raw) {
  const url = pageUrl(raw)
  if (!url) return { status: 400, error: 'Adresse refusée : collez le lien complet (https://…).' }
  let res
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,image/*;q=0.8,*/*;q=0.5', 'Accept-Language': 'fr,en;q=0.8,de;q=0.6' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    return { status: 502, error: 'Site injoignable (ou trop lent).' }
  }
  if (!res.ok) return { status: 502, error: `Le site a refusé la lecture (${res.status}) : téléchargez le document vous-même et déposez-le.` }
  if (Number(res.headers.get('Content-Length')) > MAX_FILE) return { status: 413, error: 'Document trop lourd : téléchargez-le vous-même et déposez-le.' }
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.length > MAX_FILE) return { status: 413, error: 'Document trop lourd : téléchargez-le vous-même et déposez-le.' }
  return { status: 200, bytes, type: res.headers.get('Content-Type') ?? '', url: res.url || url.href }
}

/** What a file really is, from its first bytes (servers often say "octet-stream"). */
function sniff(b) {
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf'
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50) return 'image/png'
  if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  if (b[0] === 0x47 && b[1] === 0x49) return 'image/gif'
  return ''
}

/** Every line of a page worth reading: title, description, product data, then the text. */
export function pageText(html) {
  const title = decode(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()
  const description = decode(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? '').trim()
  const products = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim())
    .filter((j) => /product/i.test(j))
    .map((j) => j.replace(/\s+/g, ' ').slice(0, 3000))
  const body = html
    .replace(/<(script|style|noscript|svg|template|iframe|nav|footer|header)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(?:br|p|li|tr|div|h\d|dt|dd|section|article|table|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
  const seen = new Set()
  const lines = []
  for (const raw of decode(body).split('\n')) {
    const line = raw.replace(/\s+/g, ' ').replace(/(?:\s*\|\s*)+$/, '').trim()
    if (line.length < 3 || line.length > 400 || seen.has(line)) continue
    seen.add(line)
    lines.push(line)
  }
  const text = [title && `Titre : ${title}`, description && `Description : ${description}`, ...products.map((p) => `Données produit : ${p}`), ...lines].filter(Boolean).join('\n')
  return { title, text: text.slice(0, 40000) }
}

/**
 * Product photos of a page, best first: the share image (og:image), the
 * product data (JSON-LD), then pictures whose name or caption cites the model.
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
    const src = x[0].match(/\s(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i)?.[1]
    const alt = x[0].match(/\salt=["']([^"']*)["']/i)?.[1] ?? ''
    if (src && !src.startsWith('data:') && m.length >= 2 && words(`${alt} ${src}`).replace(/ /g, '').includes(m)) found.push(src)
  }
  const out = []
  for (const u of found) {
    const a = abs(u)
    if (a && !junk.test(a) && !out.includes(a)) out.push(a)
  }
  return out.slice(0, 6)
}

const MANUAL = /user'?s? ?(?:guide|manual)|owner'?s? manual|instruction manual|reference manual|operation manual|bedienungsanleitung|mode d.emploi|manuel|handbuch|notice|\bmanual\b|\bguide\b/i
const SHEET = /data ?sheet|spec(?:ification)?s?(?: sheet)?|fiche technique|datenblatt|technical data/i
const QUICK = /quick ?start|\bqsg\b|getting started/i
const NOT_DOC = /firmware|driver|software|update|warranty|garantie|declaration|conformity|safety|sicherheit|rohs|weee|recall|catalog|brochure|press|news/i
const docKind = (label) => (QUICK.test(label) ? 'quickstart' : MANUAL.test(label) ? 'manual' : SHEET.test(label) ? 'datasheet' : undefined)

/** The documents a page links to (user guide, data sheet…); firmware, drivers and legal papers left out. */
export function pageDocs(html, base) {
  const out = []
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    let url
    try {
      url = new URL(decode(m[1].trim()), base)
    } catch {
      continue
    }
    const both = `${label} ${decodeURIComponent(url.pathname)}`
    const pdf = /\.pdf($|\?)/i.test(url.pathname)
    if (!/^https?:$/.test(url.protocol) || out.some((d) => d.url === url.href) || NOT_DOC.test(both)) continue
    // A manual link that is not a PDF must say so in its label (it may lead to a viewer page).
    if (!(pdf ? docKind(both) || /\.pdf/i.test(url.pathname) : docKind(label))) continue
    out.push({ url: url.href, title: label.slice(0, 120) || url.pathname.split('/').pop(), pdf, doc: docKind(both) })
  }
  const rank = (d) => (d.doc === 'manual' ? 6 : d.doc === 'datasheet' ? 4 : d.doc === 'quickstart' ? 2 : 0) + (d.pdf ? 1 : 0)
  return out.sort((a, b) => rank(b) - rank(a)).slice(0, 5)
}

/** POST /read {url, model?}: a PDF or an image as it is; a page as its text, photos and documents. */
async function read(body) {
  const r = await download(body?.url)
  if (r.status !== 200) return r
  const type = sniff(r.bytes) || (/html|text/i.test(r.type) ? 'text/html' : '')
  if (type === 'application/pdf' || type.startsWith('image/')) return { status: 200, file: r.bytes, type }
  if (type !== 'text/html') return { status: 415, error: 'Ce lien n’est ni une page web, ni un PDF, ni une image.' }
  const html = new TextDecoder().decode(r.bytes)
  return { status: 200, data: { ...pageText(html), url: r.url, images: pageImages(html, r.url, body.model), docs: pageDocs(html, r.url) } }
}

/* ---------- Finding a product's documents ---------- */

const SHOPS = /amazon|ebay|thomann|woodbrass|musicstore|bax-shop|sweetwater|fnac|cdiscount|leboncoin|aliexpress|manualslib|manua\.ls|scribd|pinterest|facebook|youtube|reddit|gearspace|audiofanzine|reverb\.com|newegg/i
// Where brand groups keep their brands' manuals (Alto and Akai at inMusic, Behringer and Midas at Music Tribe…).
const MAKER_FILES = /inmusicbrands|musictribe|harman|yamaha|steinberg|sennheiser|shure|allen-heath|audio-technica|roland|pioneerdj|alphatheta|adamhall|dbaudio|l-acoustics|nexo-sa|robe|claypaky|chauvet|focusrite|presonus|qsc|electro-voice|bosch|rcf|digico|soundcraft|akg|bss/i

/**
 * Best first: the maker's own site or file server, the exact model, the
 * user guide (it describes every socket) above the data sheet above the
 * quick start, PDF above page. Shops, forums and other models last.
 */
export function rankDocs(found, brand, model) {
  const b = words(brand).split(' ').filter((w) => w.length >= 3)
  const m = words(model).replace(/ /g, '')
  const out = []
  for (const f of found) {
    const url = pageUrl(f.url)
    if (!url) continue
    const key = url.href.replace(/[#?].*$/, '')
    if (out.some((o) => o.key === key)) continue
    const host = url.hostname.replace(/^www\./, '')
    const label = `${f.title ?? ''} ${decodeURIComponent(url.pathname)}`
    const pdf = /\.pdf($|\?)/i.test(url.pathname)
    const exact = m.length >= 2 && words(label).replace(/ /g, '').includes(m)
    const shop = SHOPS.test(host)
    const official = !shop && (b.some((w) => host.replace(/[^a-z0-9]/g, '').includes(w)) || (pdf && exact && MAKER_FILES.test(host)))
    const doc = docKind(label)
    const score = (official ? 4 : 0) + (exact ? 4 : pdf ? -3 : 0) + (pdf ? 2 : 0) + (doc === 'manual' ? 3 : doc === 'datasheet' ? 2 : doc === 'quickstart' ? 1 : 0) - (shop ? 4 : 0)
    out.push({ key, title: String(f.title || host).slice(0, 140), url: url.href, host, kind: pdf ? 'pdf' : 'page', official, exact, ...(doc ? { doc } : {}), score })
  }
  return out
    .sort((x, y) => y.score - x.score)
    .slice(0, 8)
    .map(({ key: _key, ...d }) => d)
}

/** Bing's RSS results: no key needed. */
async function searchBing(q) {
  const res = await fetch(`https://www.bing.com/search?format=rss&setlang=en&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Bing : HTTP ${res.status}`)
  const clean = (t) => decode(t.replace(/<!\[CDATA\[|\]\]>/g, '').trim())
  const found = [...(await res.text()).matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/g)].map((m) => ({ url: clean(m[2]), title: clean(m[1]) }))
  if (!found.length) throw new Error('Bing : aucun résultat')
  return found
}

/** DuckDuckGo's HTML results: no key needed, but it may turn robots away. */
async function searchDuckDuckGo(q) {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `q=${encodeURIComponent(q)}`,
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`DuckDuckGo : HTTP ${res.status}`)
  const found = [...(await res.text()).matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<a[^>]+href="([^"]+)"[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/g)].map((x) => {
    const u = decode(x[1] ?? x[3])
    return { url: u.includes('uddg=') ? decodeURIComponent(u.split('uddg=')[1].split('&')[0]) : u.startsWith('//') ? `https:${u}` : u, title: decode((x[2] ?? x[4]).replace(/<[^>]+>/g, '')).trim() }
  })
  if (!found.length) throw new Error('DuckDuckGo : page sans résultats (anti-robot)')
  return found
}

/** Groq's gpt-oss models search the web themselves (built-in browser search). */
async function searchGroq(q, env) {
  const model = (await modelsOf(SERVICES.groq, env)).find((m) => m.startsWith('openai/gpt-oss')) ?? 'openai/gpt-oss-120b'
  const res = await fetch(SERVICES.groq.chat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      reasoning_effort: 'low',
      tools: [{ type: 'browser_search' }],
      tool_choice: 'required',
      messages: [
        {
          role: 'user',
          content: `Find the official documents of this product: ${q}. Give the PDF user guide (owner's manual), the PDF data sheet and the product page, on the manufacturer's website or file server. One URL per line with its title. Only URLs you found.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Groq : ${reason(data, res.status)}`)
  const msg = data.choices?.[0]?.message ?? {}
  const fromTools = (msg.executed_tools ?? []).flatMap((t) => t.search_results?.results ?? []).map((r) => ({ url: r.url, title: r.title }))
  const inText = [...String(msg.content ?? '').matchAll(/https?:\/\/[^\s"'<>\\)\]]+/g)].map((m) => ({ url: m[0].replace(/[.,;:]+$/, '') }))
  return [...fromTools, ...inText]
}

/** POST /find {brand, model}: the documents found, best first. */
async function find(body, env) {
  const brand = String(body?.brand ?? '').trim().slice(0, 60)
  const model = String(body?.model ?? '').trim().slice(0, 80)
  if (!model) return { status: 400, error: 'Indiquez au moins le modèle.' }
  const q = `${brand} ${model}`.trim()
  const searches = [searchBing(`${q} user guide pdf`), searchBing(`${q} specifications`), searchDuckDuckGo(`${q} user guide pdf`)]
  if (env.GROQ_API_KEY) searches.push(searchGroq(q, env))
  const found = (await Promise.allSettled(searches)).flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  const results = rankDocs(found, brand, model)
  if (!results.length) return { status: 404, error: 'Aucun document trouvé : vérifiez l’orthographe, ou déposez la fiche vous-même.' }
  return { status: 200, data: { results } }
}

/* ---------- Reading a PDF with its tables: Mistral OCR ---------- */

/** POST /ocr {url}: the PDF read by Mistral OCR, as Markdown (tables kept), first 30 pages. */
async function ocr(body, env) {
  if (!env.MISTRAL_API_KEY) return { status: 501, error: 'OCR indisponible (pas de clé Mistral).' }
  const url = pageUrl(body?.url)
  if (!url) return { status: 400, error: 'Adresse refusée.' }
  const ask = () =>
    fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.MISTRAL_API_KEY}` },
      body: JSON.stringify({ model: 'mistral-ocr-latest', document: { type: 'document_url', document_url: url.href }, pages: Array.from({ length: 30 }, (_, i) => i) }),
      signal: AbortSignal.timeout(90000),
    })
  let res = await ask()
  // One request a second on the free plan.
  if (res.status === 429) {
    await sleep(2)
    res = await ask()
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { status: res.status === 429 ? 429 : 502, error: `OCR : ${reason(data, res.status)}` }
  const text = (data.pages ?? []).map((p) => p.markdown ?? '').join('\n\n').slice(0, 150000)
  return text.trim() ? { status: 200, data: { text, pages: (data.pages ?? []).length } } : { status: 422, error: 'OCR : document vide.' }
}

/* ---------- Data sheet analysis ---------- */

/** Only the data sheet analyses SynopGig builds go through: the keys cannot be used for anything else. */
export function cleanRequest(body) {
  if (!body || typeof body !== 'object' || body.v !== 2) return null
  const { system, schema, text, fullText, pdfBase64 } = body
  if (typeof system !== 'string' || !system.startsWith(PROMPT_START) || system.length > 20000) return null
  if (!schema || typeof schema !== 'object' || JSON.stringify(schema).length > 20000) return null
  const hasText = typeof text === 'string' && text.trim().length > 0 && text.length <= 24000
  const hasPdf = typeof pdfBase64 === 'string' && pdfBase64.length > 0 && pdfBase64.length <= 11_000_000
  if (!hasText && !hasPdf) return null
  // Gemini reads far more per minute than the others: it may get a longer extract.
  const long = typeof fullText === 'string' && fullText.length <= 150_000 ? fullText : undefined
  return { system, schema, text: hasText ? text : undefined, fullText: long, pdfBase64: hasPdf ? pdfBase64 : undefined, single: body.single === true }
}

/** First JSON object of a reply, for models that wrap it in text. */
function extractJson(text) {
  if (typeof text !== 'string') return undefined
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return undefined
  try {
    return JSON.stringify(JSON.parse(text.slice(start, end + 1)))
  } catch {
    return undefined
  }
}

/** Strict structured output: every property required, the optional ones nullable, no extra key. */
export function strictSchema(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return s
  if (s.type === 'array') return { ...s, items: strictSchema(s.items) }
  if (s.type !== 'object') return s
  const required = new Set(s.required ?? [])
  const properties = Object.fromEntries(
    Object.entries(s.properties ?? {}).map(([k, v]) => {
      const inner = strictSchema(v)
      return [k, required.has(k) ? inner : { ...inner, type: [inner.type, 'null'], ...(inner.enum ? { enum: [...inner.enum, null] } : {}) }]
    }),
  )
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false }
}

/** The schema in a few words, for plain JSON mode (the code lists are already in the prompt). */
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

/*
 * The text services, all OpenAI-compatible. Each account lists its own
 * models (free plans do not reach all of them): the best available ones are
 * used, in the order below.
 */
export const SERVICES = {
  groq: {
    name: 'groq',
    key: 'GROQ_API_KEY',
    chat: 'https://api.groq.com/openai/v1/chat/completions',
    models: 'https://api.groq.com/openai/v1/models',
    preferred: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'moonshotai/kimi-k2-instruct', 'qwen/qwen3-32b', 'openai/gpt-oss-20b'],
    strict: true,
  },
  mistral: {
    name: 'mistral',
    key: 'MISTRAL_API_KEY',
    chat: 'https://api.mistral.ai/v1/chat/completions',
    models: 'https://api.mistral.ai/v1/models',
    preferred: ['mistral-medium-latest', 'mistral-large-latest', 'mistral-small-latest', 'ministral-14b-latest', 'ministral-8b-latest'],
    strict: true,
  },
  zai: {
    name: 'zai',
    key: 'ZAI_API_KEY',
    chat: 'https://api.z.ai/api/paas/v4/chat/completions',
    preferred: ['glm-4.7-flash', 'glm-4.5-flash'],
    strict: false,
  },
}

const known = new Map()

/** The models an account can use, best first (asked once per key). */
async function modelsOf(service, env) {
  const key = env[service.key]
  const own = env[`${service.name.toUpperCase()}_MODEL`]
  if (!service.models) return [...new Set([own, ...service.preferred].filter(Boolean))]
  if (known.get(service.name)?.key !== key) {
    const res = await fetch(service.models, { headers: { Authorization: `Bearer ${key}` } }).catch(() => null)
    const data = res?.ok ? await res.json().catch(() => ({})) : {}
    const list = Array.isArray(data.data) ? data.data.map((m) => String(m.id)) : []
    if (list.length) known.set(service.name, { key, list })
  }
  const list = known.get(service.name)?.key === key ? known.get(service.name).list : undefined
  if (!list) return [...new Set([own, ...service.preferred].filter(Boolean))].slice(0, 2)
  return [...new Set([own, ...service.preferred])].filter((m) => m && list.includes(m))
}

// Models that just said "rate limit": skipped for a minute.
const busyUntil = new Map()

/** One answer on one model: mode 'schema' (strict structured output) or 'json'. */
async function chat(service, req, env, model, mode) {
  const thinks = /gpt-oss|qwen3|glm/.test(model)
  const res = await fetch(service.chat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env[service.key]}` },
    body: JSON.stringify({
      model,
      temperature: thinks ? 0.2 : 0,
      // The thinking counts in the tokens: room for it and for a long list.
      max_tokens: thinks ? 7000 : 3000,
      ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: model.includes('120b') ? 'medium' : 'low' } : {}),
      ...(service.name === 'groq' && /qwen3/.test(model) ? { reasoning_format: 'hidden' } : {}),
      response_format: mode === 'schema' ? { type: 'json_schema', json_schema: { name: 'device', strict: true, schema: strictSchema(req.schema) } } : { type: 'json_object' },
      messages: [
        { role: 'system', content: mode === 'schema' ? req.system : `${req.system}\nAnswer with a single JSON object of this shape, nothing else (? = optional):\n${shape(req.schema)}` },
        { role: 'user', content: `Data sheet extracts:\n${req.text}` },
      ],
    }),
    signal: AbortSignal.timeout(90000),
  }).catch((e) => ({ ok: false, status: 504, json: async () => ({ error: { message: e.name === 'TimeoutError' ? 'trop lent' : String(e.message) } }) }))
  const data = await res.json().catch(() => ({}))
  const error = res.ok ? undefined : reason(data, res.status)
  // Groq: "Please try again in 7.5s".
  const wait = error && /try again in (?:(\d+)m)?([\d.]+)s/i.exec(error)
  return { status: res.status, text: extractJson(data.choices?.[0]?.message?.content), error, wait: wait ? Number(wait[1] ?? 0) * 60 + Number(wait[2]) : undefined }
}

/** The best two models of a service, strict schema first; a busy model is skipped, or waited for a few seconds. */
async function askService(service, req, env) {
  // Up to three: free plans refuse some models outright (Mistral's medium and small ones, for instance).
  const models = (await modelsOf(service, env)).slice(0, 3)
  if (!models.length) return { status: 404, error: `${service.name} : aucun modèle de discussion sur ce compte` }
  let last
  for (const model of models) {
    if (busyUntil.get(model) > Date.now()) continue
    for (const mode of service.strict ? ['schema', 'json'] : ['json']) {
      last = await chat(service, req, env, model, mode)
      if (last.status === 429 && last.wait !== undefined && last.wait <= 10) {
        await sleep(last.wait + 0.5)
        last = await chat(service, req, env, model, mode)
      } else if (last.status === 429 && service.name === 'mistral') {
        await sleep(1.5)
        last = await chat(service, req, env, model, mode)
      }
      if (last.status === 200 && last.text) return { ...last, engine: service.name, model }
      if (last.status === 401 || last.status === 403) return { ...last, error: `${service.name} : ${last.error}` }
      if (last.status === 429) {
        // A model that refuses even after a wait is left alone for a while (ten minutes on Mistral's free plan).
        busyUntil.set(model, Date.now() + (service.name === 'mistral' ? 600_000 : 60_000))
        break
      }
      if (last.status === 404) known.delete(service.name)
    }
  }
  return { ...(last ?? { status: 429 }), error: `${service.name} : ${last?.error ?? 'modèles occupés'}` }
}

/* Gemini: reads the PDF itself (tables, panel drawings). */

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models'

/** Gemini wants upper-case OpenAPI types. */
function geminiSchema(s) {
  if (Array.isArray(s)) return s.map(geminiSchema)
  if (!s || typeof s !== 'object') return s
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === 'type' && typeof v === 'string' ? v.toUpperCase() : geminiSchema(v)]))
}

/** Best stable Flash model the key has, then the best Flash-Lite (Google retires models often). */
export async function geminiModels(env) {
  if (known.get('gemini')?.key !== env.GEMINI_API_KEY) {
    const res = await fetch(`${GEMINI}?pageSize=200`, { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } }).catch(() => null)
    const data = res?.ok ? await res.json().catch(() => ({})) : {}
    const list = (data.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => String(m.name).replace(/^models\//, ''))
      .filter((m) => /^gemini-.*flash/.test(m) && !/tts|image|audio|live|thinking|exp|embed|8b/.test(m))
    if (list.length) known.set('gemini', { key: env.GEMINI_API_KEY, list })
  }
  const list = known.get('gemini')?.key === env.GEMINI_API_KEY ? known.get('gemini').list : []
  if (!list.length) return [env.GEMINI_MODEL || 'gemini-flash-latest', 'gemini-flash-lite-latest']
  const version = (m) => (/latest/.test(m) ? 99 : Number(/gemini-(\d+(?:\.\d+)?)/.exec(m)?.[1] ?? 0))
  const best = (lite) => list.filter((m) => /lite/.test(m) === lite).sort((a, b) => Number(/preview/.test(a)) - Number(/preview/.test(b)) || version(b) - version(a))[0]
  return [...new Set([env.GEMINI_MODEL, best(false), best(true)].filter(Boolean))]
}

async function askGemini(req, env) {
  const parts = []
  if (req.pdfBase64) parts.push({ inline_data: { mime_type: 'application/pdf', data: req.pdfBase64 } })
  if (req.fullText ?? req.text) parts.push({ text: `Data sheet extracts:\n${req.fullText ?? req.text}` })
  parts.push({ text: 'List the connectors of this device.' })
  let last
  for (const model of await geminiModels(env)) {
    const res = await fetch(`${GEMINI}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 8000,
          responseMimeType: 'application/json',
          responseSchema: geminiSchema(req.schema),
          // Gemini 2.5 needs a thinking budget; later models think by default.
          // A short thinking pass: enough for counts per channel, and quick.
          thinkingConfig: /gemini-2\./.test(model) ? { thinkingBudget: 2048 } : { thinkingLevel: 'low' },
        },
      }),
      signal: AbortSignal.timeout(90000),
    }).catch((e) => ({ ok: false, status: 504, json: async () => ({ error: { message: String(e.message) } }) }))
    const data = await res.json().catch(() => ({}))
    const text = extractJson(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join(''))
    if (res.ok && text) return { status: 200, text, engine: 'gemini' }
    last = { status: res.status, error: `gemini : ${res.ok ? 'réponse illisible' : reason(data, res.status)}` }
    if (res.status === 401 || res.status === 403) break
    if (res.status === 404) known.delete('gemini')
  }
  return last
}

/**
 * Two independent readings at once, for the app to compare: Gemini, and the
 * first text service that answers (Groq, then Mistral, then Z.ai). With
 * `single`, one reading only (settling a disagreement). Gemini's comes
 * first when it saw the PDF itself.
 */
export async function analyse(req, env) {
  const text = req.text ? Object.values(SERVICES).filter((s) => env[s.key]) : []
  const gemini = !!env.GEMINI_API_KEY
  const errors = []
  const first = async (asks) => {
    for (const ask of asks) {
      const r = await ask().catch((e) => ({ status: 502, error: String(e?.message ?? e).slice(0, 120) }))
      if (r.status === 200 && r.text) return r
      errors.push(r.error ?? `HTTP ${r.status}`)
    }
    return undefined
  }
  const textAsks = text.map((s) => () => askService(s, req, env))
  const geminiAsks = gemini ? [() => askGemini(req, env)] : []
  const results = req.single
    ? [await first([...textAsks, ...geminiAsks])]
    : await Promise.all(req.pdfBase64 ? [first(geminiAsks), first(textAsks)] : [first(textAsks), first(geminiAsks)])
  return { results: results.filter(Boolean), errors }
}

/* ---------- Diagnostic ---------- */

/** A check that gives up after a while instead of holding the whole page. */
const within = (seconds, work) => Promise.race([work, sleep(seconds).then(() => `ERREUR : pas de réponse en ${seconds} s`)])

/** GET /diagnostic: every key tried on a tiny request, every search source, all at once. */
async function diagnostic(env) {
  const started = Date.now()
  const req = { system: `${PROMPT_START}.`, schema: { type: 'object', properties: { ok: { type: 'boolean' } } }, text: 'Reply {"ok": true}.' }
  const out = { relais: 'SynopGig, en ligne' }
  const check = (key, seconds, work) =>
    within(
      seconds,
      work().catch((e) => `ERREUR ${String(e?.message ?? e).slice(0, 160)}`),
    ).then((r) => (out[key] = r))
  const checks = []
  for (const s of Object.values(SERVICES)) {
    if (!env[s.key]) {
      out[s.name] = `pas de clé ${s.key}`
      continue
    }
    checks.push(
      check(s.name, 60, async () => {
        known.delete(s.name)
        await modelsOf(s, env)
        const r = await askService(s, req, env)
        // Mistral takes one request a second: its OCR is tried after its chat, never at the same time.
        if (s.name === 'mistral') {
          await sleep(2)
          const o = await ocr({ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }, env)
          out.ocr_mistral = o.status === 200 ? 'OK (les PDF sont lus avec leurs tableaux)' : `ERREUR ${o.error} (les PDF sont alors lus par l’application)`
        }
        return r.status === 200 ? `OK (modèle ${r.model})` : `ERREUR ${r.status} : ${r.error}`
      }),
    )
  }
  if (env.GEMINI_API_KEY) {
    checks.push(
      check('gemini', 40, async () => {
        known.delete('gemini')
        const r = await askGemini(req, env)
        return r.status === 200 ? `OK (modèles ${(await geminiModels(env)).join(', ')})` : `ERREUR ${r.status} : ${r.error}`
      }),
    )
  } else out.gemini = 'pas de clé GEMINI_API_KEY'
  const search = (key, work) => check(key, 35, async () => `OK (${(await work()).length} résultats)`)
  checks.push(search('recherche_bing', () => searchBing('Shure SM58 user guide pdf')), search('recherche_duckduckgo', () => searchDuckDuckGo('Shure SM58 user guide pdf')))
  if (env.GROQ_API_KEY) checks.push(search('recherche_groq', () => searchGroq('Shure SM58', env)))
  await Promise.all(checks)
  const used = env.LIMITS ? Number(await env.LIMITS.get(`d:${today()}:all`).catch(() => 0)) || 0 : undefined
  out.protection = {
    par_visiteur: `${Number(env.PER_HOUR) || HOURLY.ai} par heure, ${Number(env.PER_DAY) || 60} par jour`,
    pour_tous: `${Number(env.DAILY_LIMIT) || 400} par jour`,
    compteurs: env.LIMITS ? `KV LIMITS relié (${used} aujourd’hui)` : 'sans KV LIMITS : comptés par instance seulement',
  }
  out.duree = `${Math.round((Date.now() - started) / 1000)} s`
  return out
}

/* ---------- Routes ---------- */

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
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (request.method === 'GET' && path === '/diagnostic') {
      if (tooManyThisHour('diag', ip, env)) return fail('Trop de diagnostics, réessayez plus tard.', 429)
      const report = await diagnostic(env).catch((e) => ({ relais: 'SynopGig, en ligne', erreur_diagnostic: String(e?.stack ?? e).slice(0, 400) }))
      return new Response(JSON.stringify(report, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
    }
    if (request.method !== 'POST') return fail('Relais SynopGig : POST uniquement. Diagnostic : ouvrez /diagnostic.', 405)
    if (!origins.includes(origin)) return fail('Site non autorisé.', 403)
    const body = await request.json().catch(() => null)

    if (path === '/read') {
      if (tooManyThisHour('web', ip, env)) return fail('Trop de lectures en une heure, réessayez plus tard.', 429)
      const r = await read(body)
      if (r.file) return new Response(r.file, { headers: { ...cors, 'Content-Type': r.type } })
      return r.data ? reply(r.data) : fail(r.error, r.status)
    }
    if (path === '/find' || path === '/ocr') {
      const refused = await aiRefusal(ip, env, false)
      if (refused) return fail(refused, 429)
      const r = path === '/find' ? await find(body, env) : await ocr(body, env)
      return r.data ? reply(r.data) : fail(r.error, r.status)
    }
    if (path !== '') return fail('Adresse inconnue.', 404)

    if (!Object.values(SERVICES).some((s) => env[s.key]) && !env.GEMINI_API_KEY) return fail('Relais non configuré (clé manquante).', 500)
    const req = cleanRequest(body)
    if (!req) return fail('Requête refusée.', 400)
    const refused = await aiRefusal(ip, env)
    if (refused) return fail(refused, 429)
    const { results, errors } = await analyse(req, env)
    if (results.length) return reply({ text: results[0].text, engine: results[0].engine, ...(results[1] ? { second: results[1].text, secondEngine: results[1].engine } : {}) })
    if (!errors.length) return fail('PDF scanné : collez plutôt le texte des caractéristiques.', 422)
    const quota = errors.some((e) => /429|rate|quota|occupé/i.test(e))
    return fail(quota ? `Quota gratuit atteint, réessayez plus tard (${errors.join(' · ')})` : errors.join(' · '), quota ? 429 : 502)
  },
}
