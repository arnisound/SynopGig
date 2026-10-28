import { afterEach, describe, expect, it, vi } from 'vitest'
import relay, { cleanRequest } from './relay.js'
import { relayRequest } from '../src/library/ai'

const SITE = 'https://arnisound.github.io'
const post = (body, origin = SITE) =>
  new Request('https://relay.example/', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const groqOk = () => new Response(JSON.stringify({ choices: [{ message: { content: '{"model":"X"}' } }] }))
const models = (...ids) => new Response(JSON.stringify({ data: ids.map((id) => ({ id, active: true })) }))
/** Answers the model list, then the given chat replies in order. */
function groq(list, ...replies) {
  return vi.fn(async (url) => (String(url).endsWith('/models') ? models(...list) : replies.length > 1 ? replies.shift()() : replies[0]()))
}
const chatCalls = (fn) => fn.mock.calls.filter(([url]) => !String(url).endsWith('/models'))
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
    const upstream = groq(['llama-3.3-70b-versatile'], groqOk)
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: '4 x XLR' })), { GROQ_API_KEY: 'G', GEMINI_API_KEY: 'M' })
    expect(await res.json()).toEqual({ text: '{"model":"X"}' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(SITE)
    const [url, init] = chatCalls(upstream)[0]
    expect(url).toContain('api.groq.com')
    expect(init.headers.Authorization).toBe('Bearer G')
  })

  it('picks a model the Groq account really has', async () => {
    const upstream = groq(['whisper-large-v3', 'openai/gpt-oss-20b', 'qwen/qwen3-32b'], groqOk)
    vi.stubGlobal('fetch', upstream)
    await relay.fetch(post(relayRequest({ text: '4 x XLR' })), { GROQ_API_KEY: 'G2' })
    const body = JSON.parse(chatCalls(upstream).at(-1)[1].body)
    expect(body.model).toBe('openai/gpt-oss-20b')
    expect(body.reasoning_effort).toBe('low')
  })

  it('accepts JSON wrapped in text and retries without strict mode', async () => {
    const upstream = groq(
      ['llama-3.3-70b-versatile'],
      () => new Response(JSON.stringify({ error: { message: 'json_validate_failed' } }), { status: 400 }),
      () => new Response(JSON.stringify({ choices: [{ message: { content: 'Here you go: {"model":"Z"} done' } }] })),
    )
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: 'x' })), { GROQ_API_KEY: 'G3' })
    expect(await res.json()).toEqual({ text: '{"model":"Z"}' })
    expect(JSON.parse(chatCalls(upstream).at(-1)[1].body).response_format).toBeUndefined()
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

  it('lists the account models in the diagnostic', async () => {
    vi.stubGlobal('fetch', groq(['openai/gpt-oss-120b', 'whisper-large-v3'], groqOk))
    const out = await (await relay.fetch(new Request('https://relay.example/diagnostic'), { GROQ_API_KEY: 'G4' })).json()
    expect(out.groq).toBe('OK (modèle openai/gpt-oss-120b)')
    expect(out.groq_modeles_du_compte).toEqual(['openai/gpt-oss-120b'])
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

describe('shop pages', async () => {
  const { pageUrl, pageText } = await import('./relay.js')
  it('only reads public web addresses', () => {
    expect(pageUrl('https://www.thomann.de/fr/flyht_pro.htm')).not.toBeNull()
    for (const bad of ['http://localhost/', 'https://127.0.0.1/', 'https://[::1]/', 'file:///etc/passwd', 'https://shop.example:8443/', 'https://router.lan/', 'https://user:pw@shop.example/']) expect(pageUrl(bad)).toBeNull()
  })

  it('keeps the title, the product data and the lines about sizes', () => {
    const p = pageText(`<html><head><title>Malle 120 &amp; roulettes</title><script>track()</script>
      <script type="application/ld+json">{"@type":"Product","name":"Malle 120","weight":"25 kg"}</script></head>
      <body><nav>Accueil</nav><table><tr><th>Dimensions</th><td>120 x 60 x 60 cm</td></tr></table><p>Livraison offerte</p></body></html>`)
    expect(p.title).toBe('Malle 120 & roulettes')
    expect(p.text).toContain('Dimensions | 120 x 60 x 60 cm')
    expect(p.text).toContain('"weight":"25 kg"')
    expect(p.text).not.toContain('Livraison')
    expect(p.text).not.toContain('track()')
  })
})

describe('finding a product documentation', async () => {
  const { rankDocs } = await import('./relay.js')
  const call = (path, body) =>
    relay.fetch(new Request(`https://relay.example${path}`, { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json', 'CF-Connecting-IP': `10.9.${Math.random()}` }, body: JSON.stringify(body) }), {})

  it('puts the manufacturer and its data sheets first, shops last', () => {
    const r = rankDocs(
      [
        { url: 'https://www.thomann.de/fr/fohhn_ps850.htm', title: 'Fohhn PS-850' },
        { url: 'https://fohhn.com/en/products/ps-850', title: 'PS-850 | Fohhn' },
        { url: 'https://fohhn.com/media/ps-850.pdf', title: 'Datasheet' },
        { url: 'http://192.168.1.1/x.pdf' },
      ],
      'Fohhn',
      'PS-850',
    )
    expect(r.map((x) => x.host)).toEqual(['fohhn.com', 'fohhn.com', 'thomann.de'])
    expect(r[0]).toMatchObject({ kind: 'pdf', official: true })
  })

  it('searches without any key and lists what it found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Ffohhn.com%2Fen%2Fproducts%2Fps-850&amp;rut=x">PS-850 - Products | Fohhn</a>')),
    )
    const res = await call('/find', { brand: 'Fohhn', model: 'PS-850' })
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(results[0]).toMatchObject({ url: 'https://fohhn.com/en/products/ps-850', official: true, kind: 'page' })
  })

  it('lets Groq search the web itself when DuckDuckGo is blocked', async () => {
    const bodies = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        if (!String(url).includes('groq.com')) return new Response('<html>anomaly</html>')
        bodies.push(JSON.parse(init.body))
        return Response.json({ choices: [{ message: { content: 'ok', executed_tools: [{ type: 'browser_search', search_results: { results: [{ url: 'https://fohhn.com/media/ps-850.pdf', title: 'PS-850 data sheet' }] } }] } }] })
      }),
    )
    const res = await relay.fetch(
      new Request('https://relay.example/find', { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.8.1.1' }, body: JSON.stringify({ brand: 'Fohhn', model: 'PS-850' }) }),
      { GROQ_API_KEY: 'k' },
    )
    expect(res.status).toBe(200)
    expect(bodies[0]).toMatchObject({ model: 'openai/gpt-oss-120b', tools: [{ type: 'browser_search' }] })
    const { results } = await res.json()
    expect(results[0]).toMatchObject({ url: 'https://fohhn.com/media/ps-850.pdf', kind: 'pdf', official: true })
  })

  it('hands PDF data sheets over as they are, for the app to read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]), { headers: { 'Content-Type': 'application/pdf' } })))
    const res = await call('/doc', { url: 'https://fohhn.com/media/ps-850.pdf' })
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect((await call('/doc', { url: 'file:///etc/passwd' })).status).toBe(400)
  })
})
