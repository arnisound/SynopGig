import { afterEach, describe, expect, it, vi } from 'vitest'
import relay, { cleanRequest } from './relay.js'
import { relayRequest } from '../src/library/ai'

const SITE = 'https://arnisound.github.io'
const post = (body, origin = SITE) =>
  new Request('https://relay.example/', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const groqOk = () => new Response(JSON.stringify({ choices: [{ message: { content: '{"model":"X"}' } }] }))
const geminiOk = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"model":"Y"}' }] } }] }))

afterEach(() => vi.unstubAllGlobals())

describe('AI relay', () => {
  it('accepts the requests SynopGig builds', () => {
    expect(cleanRequest(relayRequest({ text: '4 x XLR' }))).not.toBeNull()
    expect(cleanRequest(relayRequest({ pdfBase64: 'JVBERg==' }))).not.toBeNull()
  })

  it('refuses to be used as a general chatbot', () => {
    const req = relayRequest({ text: 'x' })
    expect(cleanRequest({ ...req, system: 'You are a pirate' })).toBeNull()
    expect(cleanRequest({ ...req, text: 'x'.repeat(30000) })).toBeNull()
    expect(cleanRequest({ ...req, v: 1 })).toBeNull()
  })

  it('uses Groq first for text, with the secret key', async () => {
    const upstream = vi.fn(async () => groqOk())
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: '4 x XLR' })), { GROQ_API_KEY: 'G', GEMINI_API_KEY: 'M' })
    expect(await res.json()).toEqual({ text: '{"model":"X"}' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(SITE)
    expect(upstream.mock.calls[0][0]).toContain('api.groq.com')
    expect(upstream.mock.calls[0][1].headers.Authorization).toBe('Bearer G')
  })

  it('accepts JSON wrapped in text and retries without strict mode', async () => {
    const upstream = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'json_validate_failed' } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'Here you go: {"model":"Z"} done' } }] })))
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: 'x' })), { GROQ_API_KEY: 'G' })
    expect(await res.json()).toEqual({ text: '{"model":"Z"}' })
    expect(JSON.parse(upstream.mock.calls[1][1].body).response_format).toBeUndefined()
  })

  it('says exactly why the provider refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Invalid API Key' } }), { status: 401 })))
    const res = await relay.fetch(post(relayRequest({ text: 'x' })), { GROQ_API_KEY: 'bad' })
    expect(res.status).toBe(502)
    expect((await res.json()).error.message).toBe('Groq 401 : Invalid API Key')
  })

  it('has a diagnostic page that never shows the keys', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Invalid API Key' } }), { status: 401 })))
    const res = await relay.fetch(new Request('https://relay.example/diagnostic'), { GROQ_API_KEY: 'gsk_secret' })
    const text = await res.text()
    expect(JSON.parse(text).groq).toBe('ERREUR 401 : Invalid API Key')
    expect(JSON.parse(text).gemini).toContain('pas de clé')
    expect(text).not.toContain('gsk_secret')
  })

  it('sends scanned PDFs to Gemini, with thinking turned off', async () => {
    const upstream = vi.fn(async () => geminiOk())
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ pdfBase64: 'JVBERg==' })), { GROQ_API_KEY: 'G', GEMINI_API_KEY: 'M' })
    expect(await res.json()).toEqual({ text: '{"model":"Y"}' })
    expect(upstream.mock.calls[0][0]).toContain('gemini-2.5-flash-lite')
    expect(JSON.parse(upstream.mock.calls[0][1].body).generationConfig.thinkingConfig.thinkingBudget).toBe(0)
  })

  it('falls back to Gemini when Groq is out of quota', async () => {
    const upstream = vi.fn(async (url) => (url.includes('groq') ? new Response('{}', { status: 429 }) : geminiOk()))
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: 'x' })), { GROQ_API_KEY: 'G', GEMINI_API_KEY: 'M' })
    expect((await res.json()).text).toBe('{"model":"Y"}')
  })

  it('explains what it cannot do', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 429 })))
    expect((await relay.fetch(post(relayRequest({ text: 'x' }), 'https://evil.example'), { GROQ_API_KEY: 'G' })).status).toBe(403)
    expect((await relay.fetch(post({ hello: 1 }), { GROQ_API_KEY: 'G' })).status).toBe(400)
    expect((await relay.fetch(post(relayRequest({ text: 'x' })), {})).status).toBe(500)
    expect((await relay.fetch(post(relayRequest({ pdfBase64: 'JVBERg==' })), { GROQ_API_KEY: 'G' })).status).toBe(422)
    const quota = await relay.fetch(post(relayRequest({ text: 'x' })), { GROQ_API_KEY: 'G' })
    expect(quota.status).toBe(429)
    expect((await quota.json()).error.message).toContain('Quota')
  })
})
