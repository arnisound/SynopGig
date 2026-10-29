import { describe, expect, it } from 'vitest'
import library, { cleanShared } from './library.js'
import { encodeShared, entryToTemplate } from '../src/library/userLibrary'

const SITE = 'https://arnisound.github.io'
const model = encodeShared({ brand: 'Yamaha', model: 'MG10XU', category: 'Son', weight: 2.1 }, [
  { prefix: 'In', count: 4, connector: 'xlr-combo', signal: 'audio-analog', dir: 'in' },
  { prefix: 'Out', count: 2, connector: 'xlr3', signal: 'audio-analog', dir: 'out' },
])

/** Enough of a Cloudflare KV namespace for the relay. */
function memoryKv() {
  const data = new Map()
  return {
    data,
    async get(k, type) {
      const v = data.get(k)
      return v === undefined ? null : type === 'json' ? JSON.parse(v) : v
    },
    async put(k, v) {
      data.set(k, v)
    },
    async delete(k) {
      data.delete(k)
    },
    async list({ prefix }) {
      return { keys: [...data.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }
    },
  }
}

let ip = 0
const send = (env, method, path, body, origin = SITE) =>
  library.fetch(
    new Request(`https://library.example${path}`, {
      method,
      headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': `10.0.0.${++ip}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  )

describe('USER library worker', () => {
  it('shares in one request, with the pseudo, for everyone', async () => {
    const env = { LIBRARY: memoryKv() }
    const res = await send(env, 'POST', '/', { model, pseudo: 'Théo Son' })
    expect(res.status).toBe(200)
    const { entry, token } = await res.json()
    expect(entry.author).toBe('Théo Son')
    expect(token).toBeTruthy()
    const list = await (await send(env, 'GET', '/')).json()
    expect(list.entries).toHaveLength(1)
    const t = entryToTemplate(list.entries[0])
    expect(t?.ports).toHaveLength(6)
    expect(t?.author).toBe('Théo Son')
  })

  it('lets only the creator remove it', async () => {
    const env = { LIBRARY: memoryKv() }
    const { entry, token } = await (await send(env, 'POST', '/', { model, pseudo: 'a' })).json()
    expect((await send(env, 'DELETE', `/${entry.id}`, { token: 'wrong' })).status).toBe(403)
    expect((await send(env, 'DELETE', `/${entry.id}`, { token })).status).toBe(200)
    expect((await (await send(env, 'GET', '/')).json()).entries).toEqual([])
  })

  it('refuses other sites, bad content and missing pseudos', async () => {
    const env = { LIBRARY: memoryKv() }
    expect((await send(env, 'POST', '/', { model, pseudo: 'a' }, 'https://evil.example')).status).toBe(403)
    expect((await send(env, 'POST', '/', { model, pseudo: '' })).status).toBe(400)
    expect((await send(env, 'POST', '/', { model: { ...model, groups: [['In', 999, 'xlr3', 'audio-analog', 'in']] }, pseudo: 'a' })).status).toBe(400)
    expect(cleanShared({ ...model, model: '<b>x</b>' })?.model).toBe('bx/b')
    expect(env.LIBRARY.data.size).toBe(0)
  })

  it('says when sharing is not set up', async () => {
    expect((await send({}, 'POST', '/', { model, pseudo: 'a' })).status).toBe(503)
    expect((await (await send({}, 'GET', '/')).json()).entries).toEqual([])
  })
})

describe('shared projects (read-only links)', () => {
  const project = { version: 1, name: 'Concert', nodes: [], edges: [], cases: [], progress: {}, customTemplates: [] }

  it('publishes, reads, updates and removes a project with its key', async () => {
    const env = { LIBRARY: memoryKv() }
    const { id, token } = await (await send(env, 'POST', '/projects', { project })).json()
    expect(id).toMatch(/^[A-Za-z0-9]{10}$/)
    const read = await (await send(env, 'GET', `/projects/${id}`)).json()
    expect(read.project.name).toBe('Concert')
    expect((await send(env, 'PUT', `/projects/${id}`, { project: { ...project, name: 'Concert v2' }, token: 'wrong' })).status).toBe(403)
    expect((await send(env, 'PUT', `/projects/${id}`, { project: { ...project, name: 'Concert v2' }, token })).status).toBe(200)
    expect((await (await send(env, 'GET', `/projects/${id}`)).json()).project.name).toBe('Concert v2')
    expect((await send(env, 'DELETE', `/projects/${id}`, { token })).status).toBe(200)
    expect((await send(env, 'GET', `/projects/${id}`)).status).toBe(404)
  })

  it('refuses what is not a project, other sites and bad links', async () => {
    const env = { LIBRARY: memoryKv() }
    expect((await send(env, 'POST', '/projects', { project: { hello: 1 } })).status).toBe(400)
    expect((await send(env, 'POST', '/projects', { project }, 'https://evil.example')).status).toBe(403)
    expect((await send(env, 'GET', '/projects/abc')).status).toBe(400)
  })
})

describe('product photos of the USER library', () => {
  const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

  it('keeps the photo apart and serves it to any page', async () => {
    const env = { LIBRARY: memoryKv() }
    const { entry, token } = await (await send(env, 'POST', '/', { model, pseudo: 'Théo', image: tiny })).json()
    expect(entry.image).toBe(true)
    const list = await (await send(env, 'GET', '/')).json()
    expect(JSON.stringify(list)).not.toContain('base64')
    const img = await send(env, 'GET', `/img/${entry.id}`)
    expect(img.headers.get('Content-Type')).toBe('image/png')
    expect(img.headers.get('Access-Control-Allow-Origin')).toBe('*')
    await send(env, 'DELETE', `/${entry.id}`, { token })
    expect((await send(env, 'GET', `/img/${entry.id}`)).status).toBe(404)
  })

  it('ignores anything that is not a small image', async () => {
    const env = { LIBRARY: memoryKv() }
    const { entry } = await (await send(env, 'POST', '/', { model, pseudo: 'a', image: 'data:text/html;base64,PHNjcmlwdD4=' })).json()
    expect(entry.image).toBeUndefined()
  })
})

describe('product sheets', async () => {
  const { cleanShared } = await import('./library.js')
  it('keeps the description, specifications and documents, web addresses only', () => {
    const out = cleanShared({
      model: 'PT-70',
      category: 'Son',
      groups: [['Speaker In', 2, 'speakon', 'speaker', 'in']],
      description: 'Enceinte <b>deux</b> voies.',
      url: 'https://www.fohhn.com/en/catalog/pt-70',
      specs: [['Physique', 'Poids', '39', 'kg'], ['x']],
      docs: [['Fiche', 'https://www.fohhn.com/pt-70.pdf'], ['Bad', 'javascript:alert(1)']],
    })
    expect(out).toMatchObject({ description: 'Enceinte bdeux/b voies.', url: 'https://www.fohhn.com/en/catalog/pt-70', specs: [['Physique', 'Poids', '39', 'kg']], docs: [['Fiche', 'https://www.fohhn.com/pt-70.pdf']] })
  })
})

describe('checks by technicians', () => {
  const A = 'voter-aaaaaaaaaaaaaaaa'
  const B = 'voter-bbbbbbbbbbbbbbbb'

  it('counts one vote per browser and keeps the latest reports', async () => {
    const env = { LIBRARY: memoryKv() }
    const { entry } = await (await send(env, 'POST', '/', { model, pseudo: 'a' })).json()
    const check = (body) => send(env, 'POST', `/${entry.id}/check`, body)
    expect((await check({ voter: A, verdict: 'ok' })).status).toBe(200)
    expect((await check({ voter: A, verdict: 'ok' })).status).toBe(200)
    let r = await (await check({ voter: B, verdict: 'ok' })).json()
    expect(r.entry.checks).toBe(2)
    expect((await check({ voter: B, verdict: 'report' })).status).toBe(400)
    r = await (await check({ voter: B, verdict: 'report', note: 'Il manque la sortie casque' })).json()
    expect(r.entry.checks).toBe(1)
    expect(r.entry.reports[0].note).toBe('Il manque la sortie casque')
    const listed = (await (await send(env, 'GET', '/')).json()).entries[0]
    expect(listed.checks).toBe(1)
    expect(entryToTemplate(listed)?.reports?.[0].note).toBe('Il manque la sortie casque')
    // Changing one's mind removes one's report.
    r = await (await check({ voter: B, verdict: 'ok' })).json()
    expect(r.entry.checks).toBe(2)
    expect(r.entry.reports).toBeUndefined()
  })

  it('refuses bad requests', async () => {
    const env = { LIBRARY: memoryKv() }
    expect((await send(env, 'POST', '/user-1/check', { voter: A, verdict: 'ok' })).status).toBe(404)
    expect((await send(env, 'POST', '/user-1/check', { voter: 'x', verdict: 'ok' })).status).toBe(400)
    expect((await send(env, 'POST', '/user-1/check', { voter: A, verdict: 'maybe' })).status).toBe(400)
  })
})
