/*
 * SynopGig USER library (SynopGig, an Arnisound tools app — arnisoundtools.com): a free Cloudflare Worker that keeps the equipment
 * users share with everyone, with the creator's pseudo. Independent from the
 * AI relay (relay.js). Setup in worker/README.md.
 *
 * Settings (Cloudflare > Worker > Settings):
 *   LIBRARY          KV namespace binding (Bindings > Add > KV namespace)
 *   ALLOWED_ORIGINS  optional, comma separated (default: the GitHub Pages site)
 *
 *   GET /            the shared equipment, for every copy of the app
 *   POST /           share one piece of equipment, with the creator's pseudo
 *   DELETE /<id>     remove it again (only with the key given to its creator)
 *   POST /projects       publish a read-only copy of a project, returns its link id
 *   GET /projects/<id>   read it (anyone with the link)
 *   PUT /projects/<id>   update it, DELETE /projects/<id> remove it (creator's key)
 *   GET /diagnostic  check the storage and refresh the list
 */

const DEFAULT_ORIGINS = 'https://arnisoundtools.com,https://www.arnisoundtools.com,https://arnisound.github.io,http://localhost:5173'

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

/* ---------- Shared projects (read-only links) ---------- */

const MAX_PROJECT = 2_000_000
const PROJECT_TTL = 400 * 24 * 3600 // a little over a year, renewed on each update

function projectId() {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return [...crypto.getRandomValues(new Uint8Array(10))].map((b) => abc[b % abc.length]).join('')
}

/** Only something shaped like a SynopGig project is stored. */
export function cleanProject(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1 || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return null
  return raw
}

async function projects(request, kv, path, reply, fail, allowed) {
  const id = path.slice('/projects/'.length)
  if (request.method === 'GET') {
    if (!/^[A-Za-z0-9]{10}$/.test(id)) return fail('Lien invalide.', 400)
    const stored = await kv.get(`project:${id}`, 'json')
    return stored ? reply({ project: stored.project, updatedAt: stored.updatedAt }) : fail('Ce projet n’est plus partagé.', 404)
  }
  if (!allowed) return fail('Site non autorisé.', 403)
  if (tooManyShares(request)) return fail('Trop de partages en une heure, réessayez plus tard.', 429)
  const text = await request.text()
  if (text.length > MAX_PROJECT) return fail('Projet trop lourd pour être partagé (2 Mo maximum ; les logos des bandeaux pèsent lourd).', 413)
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return fail('Requête refusée.', 400)
  }
  if (request.method === 'POST' && path === '/projects') {
    const project = cleanProject(body?.project)
    if (!project) return fail('Projet illisible.', 400)
    const newId = projectId()
    const token = crypto.randomUUID()
    const updatedAt = new Date().toISOString()
    await kv.put(`project:${newId}`, JSON.stringify({ project, tokenHash: await sha256(token), updatedAt }), { expirationTtl: PROJECT_TTL })
    return reply({ id: newId, token, updatedAt })
  }
  if (!/^[A-Za-z0-9]{10}$/.test(id)) return fail('Lien invalide.', 400)
  const stored = await kv.get(`project:${id}`, 'json')
  if (!stored) return fail('Ce projet n’est plus partagé.', 404)
  if (typeof body?.token !== 'string' || stored.tokenHash !== (await sha256(body.token))) return fail('Seul son créateur peut modifier ce partage.', 403)
  if (request.method === 'DELETE') {
    await kv.delete(`project:${id}`)
    return reply({ ok: true })
  }
  if (request.method === 'PUT') {
    const project = cleanProject(body?.project)
    if (!project) return fail('Projet illisible.', 400)
    const updatedAt = new Date().toISOString()
    await kv.put(`project:${id}`, JSON.stringify({ project, tokenHash: stored.tokenHash, updatedAt }), { expirationTtl: PROJECT_TTL })
    return reply({ id, updatedAt })
  }
  return fail('Méthode non prise en charge.', 405)
}

function tooManyShares(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const now = Date.now()
  const recent = (shares.get(ip) ?? []).filter((t) => now - t < 3_600_000)
  if (recent.length >= SHARES_PER_HOUR) return true
  recent.push(now)
  shares.set(ip, recent)
  if (shares.size > 5000) shares.clear()
  return false
}

async function handle(request, env, path, reply, fail, allowed) {
  const kv = env.LIBRARY
  if (path === '/projects' || path.startsWith('/projects/')) {
    if (!kv) return fail('Partage non configuré (stockage LIBRARY manquant).', 503)
    return projects(request, kv, path, reply, fail, allowed)
  }
  if (request.method === 'GET' && path === '/diagnostic') {
    // Also rebuilds the list, e.g. after an entry was deleted by hand in the dashboard.
    const state = kv ? await rebuildLibrary(kv).then((l) => `OK (${l.length} matériels partagés)`) : 'pas de stockage LIBRARY : liez le KV namespace (variable LIBRARY)'
    return new Response(JSON.stringify({ bibliotheque_user: state }, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
  }
  if (request.method === 'GET') return reply({ version: 1, entries: kv ? await readLibrary(kv) : [] })
  if (!allowed) return fail('Site non autorisé.', 403)
  if (!kv) return fail('Partage non configuré (stockage LIBRARY manquant).', 503)
  if (tooManyShares(request)) return fail('Trop de partages en une heure, réessayez plus tard.', 429)
  let body
  try {
    body = await request.json()
  } catch {
    return fail('Requête refusée.', 400)
  }
  const r =
    request.method === 'POST' && path === ''
      ? await shareEntry(kv, body)
      : request.method === 'DELETE'
        ? await removeEntry(kv, path.slice(1), body?.token)
        : { status: 405, error: 'Méthode non prise en charge.' }
  return r.data ? reply(r.data) : fail(r.error, r.status)
}

export default {
  async fetch(request, env) {
    const origins = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map((o) => o.trim())
    const origin = request.headers.get('Origin') || ''
    const cors = {
      'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    }
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
    const fail = (message, status) => reply({ error: { message } }, status)

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    const path = new URL(request.url).pathname.replace(/\/+$/, '')
    return handle(request, env, path, reply, fail, origins.includes(origin)).catch(() => fail('Erreur du stockage, réessayez.', 500))
  },
}
