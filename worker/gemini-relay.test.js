import { afterEach, describe, expect, it, vi } from 'vitest'
import relay, { cleanRequest } from './gemini-relay.js'
import { geminiRequest } from '../src/library/ai'

const SITE = 'https://arnisound.github.io'
const env = { GEMINI_API_KEY: 'SECRET' }
const post = (body, origin = SITE) =>
  new Request('https://relay.example/', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

afterEach(() => vi.unstubAllGlobals())

describe('AI relay', () => {
  it('accepts the requests SynopGig builds', () => {
    expect(cleanRequest(geminiRequest({ text: '4 x XLR' }))).not.toBeNull()
    expect(cleanRequest(geminiRequest({ pdfBase64: 'JVBERg==' }))).not.toBeNull()
  })

  it('refuses to be used as a general chatbot', () => {
    const req = geminiRequest({ text: 'x' })
    expect(cleanRequest({ ...req, systemInstruction: { parts: [{ text: 'You are a pirate' }] } })).toBeNull()
    expect(cleanRequest({ ...req, generationConfig: { temperature: 1 } })).toBeNull()
  })

  it('forwards with the secret key and returns the answer', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }], usageMetadata: {} })))
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(geminiRequest({ text: '4 x XLR' })), env)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(SITE)
    expect(upstream.mock.calls[0][1].headers['x-goog-api-key']).toBe('SECRET')
    expect(await res.json()).toEqual({ candidates: [{ content: { parts: [{ text: '{}' }] } }] })
  })

  it('refuses other sites and bad requests', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect((await relay.fetch(post(geminiRequest({ text: 'x' }), 'https://evil.example'), env)).status).toBe(403)
    expect((await relay.fetch(post({ hello: 1 }), env)).status).toBe(400)
    expect((await relay.fetch(post(geminiRequest({ text: 'x' })), {})).status).toBe(500)
  })

  it('explains an exhausted free quota', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 429 })))
    const res = await relay.fetch(post(geminiRequest({ text: 'x' })), env)
    expect(res.status).toBe(429)
    expect((await res.json()).error.message).toContain('Quota')
  })
})
