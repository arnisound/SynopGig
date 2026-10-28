import { afterEach, describe, expect, it, vi } from 'vitest'
import relay, { cleanRequest, geminiModels, pageDocs, pageText, pageUrl, rankDocs, shape, strictSchema } from './relay.js'
import { relayRequest } from '../src/library/ai'

const SITE = 'https://arnisound.github.io'
let ip = 0
const post = (path, body, origin = SITE) =>
  new Request(`https://relay.example${path}`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': `10.0.0.${++ip}` }, body: JSON.stringify(body) })
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const chatOk = (text = '{"model":"X"}') => json({ choices: [{ message: { content: text } }] })
const geminiOk = () => json({ candidates: [{ content: { parts: [{ text: '{"model":"Y"}' }] } }] })
const limited = (s) => json({ error: { message: `Rate limit reached on tokens per minute (TPM). Please try again in ${s}s.` } }, 429)
/** Routes each call by its address; model lists answer the given ids. */
function upstream(routes) {
  return vi.fn(async (url, init) => {
    const u = String(url)
    for (const [test, answer] of routes) if (u.includes(test)) return typeof answer === 'function' ? answer(u, init) : answer.clone()
    return json({}, 404)
  })
}
const models = (...ids) => json({ data: ids.map((id) => ({ id })) })
const bodies = (fn, part) => fn.mock.calls.filter(([u, i]) => String(u).includes(part) && i?.body).map(([, i]) => JSON.parse(i.body))

afterEach(() => vi.unstubAllGlobals())

describe('analysis', () => {
  it('accepts only the requests SynopGig builds', () => {
    expect(cleanRequest(relayRequest({ text: '4 x XLR' }))).not.toBeNull()
    expect(cleanRequest(relayRequest({ pdfBase64: 'JVBERg==' }))).not.toBeNull()
    const req = relayRequest({ text: 'x' })
    expect(cleanRequest({ ...req, system: 'You are a pirate' })).toBeNull()
    expect(cleanRequest({ ...req, text: 'x'.repeat(30000) })).toBeNull()
    expect(cleanRequest({ ...req, v: 1 })).toBeNull()
  })

  it('reads each sheet twice at once, a text model and Gemini, for the app to compare', async () => {
    const f = upstream([['groq.com/openai/v1/models', models('openai/gpt-oss-120b', 'openai/gpt-oss-20b')], ['groq.com', chatOk()], ['generativelanguage', geminiOk()]])
    vi.stubGlobal('fetch', f)
    const res = await relay.fetch(post('/', relayRequest({ text: '4 x XLR', fullText: 'the whole manual' })), { GROQ_API_KEY: 'G1', GEMINI_API_KEY: 'M1' })
    expect(await res.json()).toEqual({ text: '{"model":"X"}', engine: 'groq', second: '{"model":"Y"}', secondEngine: 'gemini' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(SITE)
    const [groq] = bodies(f, 'groq.com/openai/v1/chat')
    // The best model, thinking, with the strict schema.
    expect(groq).toMatchObject({ model: 'openai/gpt-oss-120b', reasoning_effort: 'medium', response_format: { type: 'json_schema', json_schema: { strict: true } } })
    expect(groq.messages[1].content).toContain('4 x XLR')
    // Gemini reads the longer extract.
    expect(bodies(f, ':generateContent')[0].contents[0].parts[0].text).toContain('the whole manual')
  })

  it('gives one reading only when settling a disagreement', async () => {
    const f = upstream([['groq.com/openai/v1/models', models('openai/gpt-oss-120b')], ['groq.com', chatOk()], ['generativelanguage', geminiOk()]])
    vi.stubGlobal('fetch', f)
    const res = await relay.fetch(post('/', { ...relayRequest({ text: 'Reading A…' }), single: true }), { GROQ_API_KEY: 'G2', GEMINI_API_KEY: 'M2' })
    expect(await res.json()).toEqual({ text: '{"model":"X"}', engine: 'groq' })
    expect(bodies(f, ':generateContent')).toHaveLength(0)
  })

  it('shows Gemini the PDF itself and puts its reading first', async () => {
    const f = upstream([['groq.com/openai/v1/models', models('openai/gpt-oss-120b')], ['groq.com', chatOk()], ['generativelanguage', geminiOk()]])
    vi.stubGlobal('fetch', f)
    const res = await relay.fetch(post('/', relayRequest({ text: '4 x XLR', pdfBase64: 'JVBERg==' })), { GROQ_API_KEY: 'G3', GEMINI_API_KEY: 'M3' })
    expect(await res.json()).toMatchObject({ engine: 'gemini', secondEngine: 'groq' })
    expect(bodies(f, ':generateContent')[0].contents[0].parts[0].inline_data.mime_type).toBe('application/pdf')
  })

  it('falls back on plain JSON mode, then on the next model', async () => {
    let n = 0
    const f = upstream([
      ['groq.com/openai/v1/models', models('openai/gpt-oss-120b', 'openai/gpt-oss-20b')],
      ['groq.com', () => (++n < 3 ? json({ error: { message: 'json_validate_failed' } }, 400) : chatOk('Here: {"model":"Z"}'))],
    ])
    vi.stubGlobal('fetch', f)
    const res = await relay.fetch(post('/', relayRequest({ text: 'x' })), { GROQ_API_KEY: 'G4' })
    expect(await res.json()).toMatchObject({ text: '{"model":"Z"}' })
    expect(bodies(f, 'groq.com/openai/v1/chat').map((b) => `${b.model} ${b.response_format.type}`)).toEqual(['openai/gpt-oss-120b json_schema', 'openai/gpt-oss-120b json_object', 'openai/gpt-oss-20b json_schema'])
  })

  it('waits a few seconds for a model out of its minute quota, then moves on', async () => {
    const seen = []
    const f = upstream([
      ['groq.com/openai/v1/models', models('openai/gpt-oss-120b', 'openai/gpt-oss-20b')],
      ['groq.com', (u, i) => (seen.push(JSON.parse(i.body).model), seen.length < 3 ? limited(0.01) : chatOk())],
    ])
    vi.stubGlobal('fetch', f)
    const res = await relay.fetch(post('/', relayRequest({ text: '4 x XLR' })), { GROQ_API_KEY: 'G5' })
    expect(await res.json()).toMatchObject({ text: '{"model":"X"}' })
    expect(seen).toEqual(['openai/gpt-oss-120b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'])
  })

  it('uses Mistral, Z.ai or Gemini when Groq has no answer', async () => {
    const f = upstream([['groq.com/openai/v1/models', models('openai/gpt-oss-120b')], ['groq.com', json({ error: { message: 'down' } }, 500)], ['mistral.ai/v1/models', models('ministral-14b-latest')], ['mistral.ai', chatOk('{"model":"M"}')]])
    vi.stubGlobal('fetch', f)
    const res = await relay.fetch(post('/', relayRequest({ text: '4 x XLR' })), { GROQ_API_KEY: 'G6', MISTRAL_API_KEY: 'K6' })
    expect(await res.json()).toMatchObject({ text: '{"model":"M"}', engine: 'mistral' })
    expect(bodies(f, 'mistral.ai/v1/chat')[0].model).toBe('ministral-14b-latest')
  })

  it('asks Z.ai in JSON mode', async () => {
    const f = upstream([['api.z.ai', chatOk()]])
    vi.stubGlobal('fetch', f)
    const res = await relay.fetch(post('/', relayRequest({ text: '4 x XLR' })), { ZAI_API_KEY: 'Z7' })
    expect(await res.json()).toMatchObject({ engine: 'zai' })
    expect(bodies(f, 'api.z.ai')[0]).toMatchObject({ model: 'glm-4.7-flash', response_format: { type: 'json_object' } })
  })

  it('says exactly why the providers refused, and when quotas are full', async () => {
    vi.stubGlobal('fetch', upstream([['groq.com', json({ error: { message: 'Invalid API Key' } }, 401)]]))
    const res = await relay.fetch(post('/', relayRequest({ text: 'x' })), { GROQ_API_KEY: 'bad' })
    expect(res.status).toBe(502)
    expect((await res.json()).error.message).toContain('Invalid API Key')
  })

  it('picks the best stable Gemini Flash the key has', async () => {
    const list = { models: ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.5-flash-preview-tts', 'gemini-4-flash-preview'].map((m) => ({ name: `models/${m}`, supportedGenerationMethods: ['generateContent'] })) }
    vi.stubGlobal('fetch', vi.fn(async () => json(list)))
    expect(await geminiModels({ GEMINI_API_KEY: 'M8' })).toEqual(['gemini-3.5-flash', 'gemini-3.5-flash-lite'])
  })

  it('turns a schema into strict and short forms', () => {
    const s = { type: 'object', properties: { a: { type: 'integer' }, d: { type: 'string', enum: ['in', 'out'] } }, required: ['d'] }
    expect(shape(s)).toBe('{"a":integer?,"d":"in"|"out"}')
    expect(strictSchema(s)).toEqual({ type: 'object', properties: { a: { type: ['integer', 'null'] }, d: s.properties.d }, required: ['a', 'd'], additionalProperties: false })
  })
})

describe('reading other sites', () => {
  it('only reads public web addresses', () => {
    expect(pageUrl('https://www.thomann.de/fr/x.htm')).not.toBeNull()
    for (const bad of ['http://localhost/x', 'http://192.168.1.10/', 'file:///etc/passwd', 'https://a.local/', 'https://x.com:8080/']) expect(pageUrl(bad)).toBeNull()
  })

  it('keeps the title, the product data and every line of the text', () => {
    const p = pageText('<title>TMD16</title><nav>Menu</nav><script type="application/ld+json">{"@type":"Product","name":"TMD16"}</script><p>10 digital mic preamps</p><p>16 x 12 I/O</p>')
    expect(p.text).toContain('Titre : TMD16')
    expect(p.text).toContain('Données produit')
    expect(p.text).toContain('10 digital mic preamps')
    expect(p.text).not.toContain('Menu')
  })

  it('finds the user guide a page links to, not the firmware', () => {
    const html = `<a href="/firmware/v1.zip">Firmware v1.04 Update</a><a href="/media/TMD16-Quickstart-Guide.pdf">Quickstart Guide</a>
      <a href="https://cdn.inmusicbrands.com/TMD16-User-Guide.pdf">User Guide</a><a href="/media/firmware-update-guide.pdf">Firmware Update Guide</a><a href="/about">About</a>`
    const docs = pageDocs(html, 'https://www.altoprofessional.com/tmd16')
    expect(docs.map((d) => d.title)).toEqual(['User Guide', 'Quickstart Guide'])
    expect(docs[0]).toMatchObject({ pdf: true, doc: 'manual' })
  })

  it('hands PDF files over as they are, and pages as text', async () => {
    vi.stubGlobal('fetch', vi.fn(async (u) => (String(u).endsWith('.pdf') ? new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), { headers: { 'Content-Type': 'application/octet-stream' } }) : new Response('<title>P</title><p>Inputs: 4 x XLR</p>', { headers: { 'Content-Type': 'text/html' } }))))
    const pdf = await relay.fetch(post('/read', { url: 'https://fohhn.com/ps-850.pdf' }), {})
    expect(pdf.headers.get('Content-Type')).toBe('application/pdf')
    const page = await relay.fetch(post('/read', { url: 'https://fohhn.com/ps-850' }), {})
    expect((await page.json()).text).toContain('Inputs: 4 x XLR')
    expect((await relay.fetch(post('/read', { url: 'file:///etc/passwd' }), {})).status).toBe(400)
  })

  it('reads a PDF with its tables through Mistral OCR, given its address', async () => {
    const f = upstream([['mistral.ai/v1/ocr', json({ pages: [{ markdown: '| Inputs 1-8 | XLR / TRS combo |' }, { markdown: '| Main | 2 x XLR |' }] })]])
    vi.stubGlobal('fetch', f)
    const res = await relay.fetch(post('/ocr', { url: 'https://cdn.inmusicbrands.com/tmd16.pdf' }), { MISTRAL_API_KEY: 'K9' })
    expect((await res.json()).text).toBe('| Inputs 1-8 | XLR / TRS combo |\n\n| Main | 2 x XLR |')
    expect(bodies(f, 'mistral.ai/v1/ocr')[0]).toMatchObject({ model: 'mistral-ocr-latest', document: { type: 'document_url', document_url: 'https://cdn.inmusicbrands.com/tmd16.pdf' } })
    expect((await relay.fetch(post('/ocr', { url: 'https://x.com/a.pdf' }), {})).status).toBe(501)
  })
})

describe('finding the documents of a product', () => {
  it('puts the user guide of this exact model first, even on the file server of the maker group', () => {
    const r = rankDocs(
      [
        { url: 'https://www.thomann.de/fr/alto_tmd16.htm', title: 'Alto TMD16' },
        { url: 'https://www.altoprofessional.com/products/tmd16', title: 'Alto Professional - TMD Series > TMD16' },
        { url: 'https://altoprofessional.com/media/NF03280(LYNX-MIX USB SERIES).pdf', title: 'NF03280(LYNX-MIX USB SERIES A...' },
        { url: 'https://cdn.inmusicbrands.com/AltoPro/mixers/tmd16/TMD16%20-%20User%20Guide%20-%20v1.0%281%29.pdf', title: 'TMD16 - User Guide' },
      ],
      'Alto',
      'tmd 16',
    )
    expect(r[0]).toMatchObject({ host: 'cdn.inmusicbrands.com', kind: 'pdf', official: true, exact: true, doc: 'manual' })
    expect(r.at(-1).host).toBe('thomann.de')
  })

  it('searches Bing and DuckDuckGo without any key', async () => {
    const rss = '<rss><item><title>TMD16 User Guide</title><link>https://cdn.inmusicbrands.com/tmd16-user-guide.pdf</link></item></rss>'
    vi.stubGlobal('fetch', upstream([['bing.com', new Response(rss)], ['duckduckgo', new Response('<html>anomaly</html>')]]))
    const res = await relay.fetch(post('/find', { brand: 'Alto', model: 'TMD16' }), {})
    expect((await res.json()).results[0]).toMatchObject({ kind: 'pdf', doc: 'manual', official: true })
  })

  it('lets Groq search the web itself', async () => {
    const f = upstream([
      ['groq.com/openai/v1/models', models('openai/gpt-oss-120b')],
      ['groq.com', json({ choices: [{ message: { content: 'ok', executed_tools: [{ search_results: { results: [{ url: 'https://fohhn.com/media/ps-850-manual.pdf', title: 'PS-850 manual' }] } }] } }] })],
      ['bing.com', new Response('<rss></rss>')],
    ])
    vi.stubGlobal('fetch', f)
    const res = await relay.fetch(post('/find', { brand: 'Fohhn', model: 'PS-850' }), { GROQ_API_KEY: 'G10' })
    expect((await res.json()).results[0]).toMatchObject({ url: 'https://fohhn.com/media/ps-850-manual.pdf', doc: 'manual' })
    expect(bodies(f, 'groq.com/openai/v1/chat')[0].tools).toEqual([{ type: 'browser_search' }])
  })
})

describe('protecting the keys', () => {
  const kv = () => {
    const m = new Map()
    return { get: async (k) => m.get(k) ?? null, put: async (k, v) => void m.set(k, v), m }
  }
  const ask = (env, from) =>
    relay.fetch(new Request('https://relay.example/', { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json', 'CF-Connecting-IP': from }, body: JSON.stringify(relayRequest({ text: '4 x XLR' })) }), env)

  it('refuses other sites', async () => {
    expect((await relay.fetch(post('/', relayRequest({ text: 'x' }), 'https://evil.example'), { GROQ_API_KEY: 'G' })).status).toBe(403)
  })

  it('caps each visitor per day, and everyone together, without storing addresses', async () => {
    vi.stubGlobal('fetch', upstream([['api.z.ai', chatOk()]]))
    const LIMITS = kv()
    const env = { ZAI_API_KEY: 'Z', LIMITS, PER_DAY: '2', DAILY_LIMIT: '3' }
    expect((await ask(env, '1.1.1.1')).status).toBe(200)
    expect((await ask(env, '1.1.1.1')).status).toBe(200)
    expect((await (await ask(env, '1.1.1.1')).json()).error.message).toContain('votre connexion')
    expect((await ask(env, '2.2.2.2')).status).toBe(200)
    expect((await (await ask(env, '3.3.3.3')).json()).error.message).toContain('tous les utilisateurs')
    expect([...LIMITS.m.keys()].join(' ')).not.toContain('1.1.1.1')
  })

  it('has a diagnostic page that never shows the keys', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { message: 'Invalid API Key' } }, 401)))
    const res = await relay.fetch(new Request('https://relay.example/diagnostic'), { GROQ_API_KEY: 'gsk_secret' })
    const text = await res.text()
    expect(JSON.parse(text).groq).toContain('Invalid API Key')
    expect(JSON.parse(text).gemini).toContain('pas de clé')
    expect(text).not.toContain('gsk_secret')
  })
})
