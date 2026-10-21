import { describe, expect, it } from 'vitest'
import relay, { cleanShared } from './relay.js'
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
  relay.fetch(
    new Request(`https://relay.example${path}`, {
      method,
      headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': `10.0.0.${++ip}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  )

describe('USER library on the relay', () => {
  it('shares in one request, with the pseudo, for everyone', async () => {
    const env = { LIBRARY: memoryKv() }
    const res = await send(env, 'POST', '/library', { model, pseudo: 'Théo Son' })
    expect(res.status).toBe(200)
    const { entry, token } = await res.json()
    expect(entry.author).toBe('Théo Son')
    expect(token).toBeTruthy()
    const list = await (await send(env, 'GET', '/library')).json()
    expect(list.entries).toHaveLength(1)
    const t = entryToTemplate(list.entries[0])
    expect(t?.ports).toHaveLength(6)
    expect(t?.author).toBe('Théo Son')
  })

  it('lets only the creator remove it', async () => {
    const env = { LIBRARY: memoryKv() }
    const { entry, token } = await (await send(env, 'POST', '/library', { model, pseudo: 'a' })).json()
    expect((await send(env, 'DELETE', `/library/${entry.id}`, { token: 'wrong' })).status).toBe(403)
    expect((await send(env, 'DELETE', `/library/${entry.id}`, { token })).status).toBe(200)
    expect((await (await send(env, 'GET', '/library')).json()).entries).toEqual([])
  })

  it('refuses other sites, bad content and missing pseudos', async () => {
    const env = { LIBRARY: memoryKv() }
    expect((await send(env, 'POST', '/library', { model, pseudo: 'a' }, 'https://evil.example')).status).toBe(403)
    expect((await send(env, 'POST', '/library', { model, pseudo: '' })).status).toBe(400)
    expect((await send(env, 'POST', '/library', { model: { ...model, groups: [['In', 999, 'xlr3', 'audio-analog', 'in']] }, pseudo: 'a' })).status).toBe(400)
    expect(cleanShared({ ...model, model: '<b>x</b>' })?.model).toBe('bx/b')
    expect(env.LIBRARY.data.size).toBe(0)
  })

  it('says when sharing is not set up', async () => {
    expect((await send({}, 'POST', '/library', { model, pseudo: 'a' })).status).toBe(503)
    expect((await (await send({}, 'GET', '/library')).json()).entries).toEqual([])
  })
})
