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

  it('reads each sheet twice at once, Groq and Gemini, for the app to compare', async () => {
    const upstream = vi.fn(async (url) => (String(url).includes('generativelanguage') ? geminiOk() : String(url).endsWith('/models') ? models('llama-3.3-70b-versatile') : groqOk()))
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: '4 x XLR' })), { GROQ_API_KEY: 'G', GEMINI_API_KEY: 'M' })
    // Text only: the text model's reading first.
    expect(await res.json()).toEqual({ text: '{"model":"X"}', engine: 'groq', second: '{"model":"Y"}', secondEngine: 'gemini' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(SITE)
    const [url, init] = chatCalls(upstream).find(([u]) => String(u).includes('groq'))
    expect(url).toContain('api.groq.com')
    expect(init.headers.Authorization).toBe('Bearer G')
  })

  it('shows Gemini the PDF itself, with its text layer, and puts its reading first', async () => {
    const upstream = vi.fn(async (url) => (String(url).includes('generativelanguage') ? geminiOk() : String(url).endsWith('/models') ? models('llama-3.3-70b-versatile') : groqOk()))
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: '4 x XLR', pdfBase64: 'JVBERg==' })), { GROQ_API_KEY: 'G', GEMINI_API_KEY: 'M' })
    expect(await res.json()).toMatchObject({ engine: 'gemini', secondEngine: 'groq' })
    const parts = JSON.parse(upstream.mock.calls.find(([u]) => String(u).includes('generativelanguage'))[1].body).contents[0].parts
    expect(parts[0].inline_data.mime_type).toBe('application/pdf')
    expect(parts[1].text).toContain('4 x XLR')
  })

  it('picks a model the Groq account really has', async () => {
    const upstream = groq(['whisper-large-v3', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'], groqOk)
    vi.stubGlobal('fetch', upstream)
    await relay.fetch(post(relayRequest({ text: '4 x XLR' })), { GROQ_API_KEY: 'G2' })
    const body = JSON.parse(chatCalls(upstream).at(-1)[1].body)
    expect(body.model).toBe('openai/gpt-oss-120b')
    // It thinks before answering, and the answer must follow the schema.
    expect(body.reasoning_effort).toBe('medium')
    expect(body.response_format).toMatchObject({ type: 'json_schema', json_schema: { strict: true } })
    const ports = body.response_format.json_schema.schema.properties.ports.items
    expect(ports.additionalProperties).toBe(false)
    expect(body.response_format.json_schema.schema.properties.rackU.type).toEqual(['integer', 'null'])
  })

  it('accepts JSON wrapped in text and retries without strict mode', async () => {
    const upstream = groq(
      ['llama-3.3-70b-versatile'],
      () => new Response(JSON.stringify({ error: { message: 'json_schema not supported' } }), { status: 400 }),
      () => new Response(JSON.stringify({ error: { message: 'json_validate_failed' } }), { status: 400 }),
      () => new Response(JSON.stringify({ choices: [{ message: { content: 'Here you go: {"model":"Z"} done' } }] })),
    )
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: 'x' })), { GROQ_API_KEY: 'G3' })
    expect(await res.json()).toMatchObject({ text: '{"model":"Z"}' })
    expect(JSON.parse(chatCalls(upstream).at(-1)[1].body).response_format).toBeUndefined()
  })

  it('skips a model out of its minute quota, and waits when all of them are', async () => {
    const limited = (s) => () => new Response(JSON.stringify({ error: { message: `Rate limit reached on tokens per minute (TPM). Please try again in ${s}s.` } }), { status: 429 })
    const upstream = groq(['openai/gpt-oss-120b', 'openai/gpt-oss-20b'], limited(0.01), limited(0.05), groqOk)
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: '4 x XLR' })), { GROQ_API_KEY: 'G5' })
    expect(await res.json()).toMatchObject({ text: '{"model":"X"}' })
    const used = chatCalls(upstream).map(([, init]) => JSON.parse(init.body).model)
    // Never the same busy model twice in a row; then the first one free again.
    expect(used).toEqual(['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'])
  })

  it('sends the short form of the schema in JSON mode', async () => {
    const { shape } = await import('./relay.js')
    expect(shape({ type: 'object', properties: { a: { type: 'integer' }, d: { type: 'string', enum: ['in', 'out'] } }, required: ['d'] })).toBe('{"a":integer?,"d":"in"|"out"}')
  })

  it('asks Mistral with the strict schema, on a model the account has', async () => {
    // A free key: no medium or small model on this account.
    const upstream = vi.fn(async (url) =>
      String(url).endsWith('/models') ? models('open-mistral-nemo', 'ministral-8b-latest', 'mistral-embed') : new Response(JSON.stringify({ choices: [{ message: { content: '{"model":"M"}' } }] })),
    )
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: '4 x XLR' })), { MISTRAL_API_KEY: 'K' })
    expect(await res.json()).toMatchObject({ text: '{"model":"M"}', engine: 'mistral' })
    const [url, init] = chatCalls(upstream)[0]
    expect(url).toBe('https://api.mistral.ai/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer K')
    expect(JSON.parse(init.body)).toMatchObject({ model: 'ministral-8b-latest', response_format: { type: 'json_schema' } })
  })

  it('moves on when Mistral is out of quota', async () => {
    const upstream = vi.fn(async (url) => (String(url).includes('mistral') ? new Response(JSON.stringify({ message: 'Requests rate limit exceeded' }), { status: 429 }) : groqOk()))
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: '4 x XLR' })), { MISTRAL_API_KEY: 'K', ZAI_API_KEY: 'Z' })
    expect(await res.json()).toMatchObject({ text: '{"model":"X"}', engine: 'zai' })
    // Each Mistral model asked once only: a quota is not a schema problem.
    expect(upstream.mock.calls.filter(([u]) => String(u).includes('mistral') && !String(u).endsWith('/models'))).toHaveLength(2)
  })

  it('uses the free GLM models of Z.ai', async () => {
    const upstream = vi.fn(async () => groqOk())
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ text: '4 x XLR' })), { ZAI_API_KEY: 'Z' })
    expect(await res.json()).toMatchObject({ text: '{"model":"X"}' })
    const [url, init] = upstream.mock.calls[0]
    expect(url).toBe('https://api.z.ai/api/paas/v4/chat/completions')
    expect(JSON.parse(init.body)).toMatchObject({ model: 'glm-4.7-flash', response_format: { type: 'json_object' } })
  })

  it('falls back on Cloudflare Workers AI, without any key', async () => {
    const AI = { run: vi.fn(async () => ({ response: 'ok: {"model":"W"}' })) }
    const res = await relay.fetch(post(relayRequest({ text: '4 x XLR' })), { AI })
    expect(await res.json()).toMatchObject({ text: '{"model":"W"}' })
    expect(AI.run.mock.calls[0][0]).toBe('@cf/openai/gpt-oss-120b')
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

  it('sends scanned PDFs to Gemini, with a short thinking pass', async () => {
    const upstream = vi.fn(async () => geminiOk())
    vi.stubGlobal('fetch', upstream)
    const res = await relay.fetch(post(relayRequest({ pdfBase64: 'JVBERg==' })), { GROQ_API_KEY: 'G', GEMINI_API_KEY: 'M' })
    expect(await res.json()).toMatchObject({ text: '{"model":"Y"}' })
    expect(upstream.mock.calls[0][0]).toContain('gemini-2.5-flash:')
    expect(JSON.parse(upstream.mock.calls[0][1].body).generationConfig.thinkingConfig.thinkingBudget).toBe(1024)
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

describe('protecting the keys', () => {
  /** A KV namespace in memory. */
  const kv = () => {
    const m = new Map()
    return { get: async (k) => m.get(k) ?? null, put: async (k, v) => void m.set(k, v), m }
  }
  const ask = (env, ip) =>
    relay.fetch(new Request('https://relay.example/', { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(relayRequest({ text: '4 x XLR' })) }), env)

  it('caps each visitor per day, and everyone together', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"model":"M"}' } }] }))))
    const LIMITS = kv()
    const env = { MISTRAL_API_KEY: 'K', LIMITS, PER_DAY: '2', DAILY_LIMIT: '3' }
    expect((await ask(env, '1.1.1.1')).status).toBe(200)
    expect((await ask(env, '1.1.1.1')).status).toBe(200)
    const third = await ask(env, '1.1.1.1')
    expect(third.status).toBe(429)
    expect((await third.json()).error.message).toContain('votre connexion')
    expect((await ask(env, '2.2.2.2')).status).toBe(200)
    expect((await (await ask(env, '3.3.3.3')).json()).error.message).toContain('tous les utilisateurs')
    // Addresses are never stored, only a hash.
    expect([...LIMITS.m.keys()].join(' ')).not.toContain('1.1.1.1')
  })

  it('does not count reading pages and photos as analyses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html><title>x</title></html>', { headers: { 'Content-Type': 'text/html' } })))
    const LIMITS = kv()
    for (let i = 0; i < 5; i++) {
      await relay.fetch(new Request('https://relay.example/images', { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json', 'CF-Connecting-IP': '4.4.4.4' }, body: JSON.stringify({ url: 'https://fohhn.com/p' }) }), { LIMITS })
    }
    expect(LIMITS.m.size).toBe(0)
  })
})
