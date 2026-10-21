import { afterEach, describe, expect, it, vi } from 'vitest'

const answer = { model: 'MG10XU', category: 'Son', ports: [{ label: 'In', count: 4, connector: 'xlr-combo', signal: 'audio-analog', dir: 'in' }] }
const relayOk = () => new Response(JSON.stringify({ text: JSON.stringify(answer) }))

function chromeAi(status: string, reply = JSON.stringify(answer)) {
  const prompt = vi.fn(async () => reply)
  vi.stubGlobal('LanguageModel', {
    availability: vi.fn(async () => status),
    create: vi.fn(async () => ({ prompt, destroy: () => {} })),
  })
  return prompt
}

async function load(relay = '') {
  vi.resetModules()
  vi.stubEnv('VITE_AI_PROXY_URL', relay)
  return import('./ai')
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('automatic AI choice', () => {
  it('has nothing to offer on a plain browser without relay', async () => {
    const ai = await load()
    expect(await ai.availableEngines()).toEqual([])
    await expect(ai.extractAuto({ text: 'x', onProgress: () => {} })).rejects.toThrow('Aucune IA')
  })

  it('leaves the slow Chrome AI off unless asked', async () => {
    chromeAi('available')
    const ai = await load()
    expect(await ai.availableEngines()).toEqual([])
  })

  it('uses the AI built into Chrome when turned on', async () => {
    const prompt = chromeAi('available')
    const ai = await load()
    expect(await ai.availableEngines(undefined, true)).toEqual(['chrome'])
    const { result, engine } = await ai.extractAuto({ text: 'Mic inputs: 4 x XLR/TRS combo', allowChrome: true, onProgress: () => {} })
    expect(engine).toBe('chrome')
    expect(result.groups[0]).toMatchObject({ count: 4, connector: 'xlr-combo' })
    expect(prompt).toHaveBeenCalledWith(expect.stringContaining('4 x XLR/TRS combo'), expect.objectContaining({ responseConstraint: expect.any(Object) }))
  })

  it('ignores a Chrome without the model', async () => {
    chromeAi('unavailable')
    const ai = await load()
    expect(await ai.availableEngines(undefined, true)).toEqual([])
  })

  it('sends the relay only the useful lines of a text PDF', async () => {
    const fetchMock = vi.fn(async () => relayOk())
    vi.stubGlobal('fetch', fetchMock)
    const ai = await load('https://relay.example/')
    const pdf = new File([new Uint8Array([37, 80, 68, 70])], 'sheet.pdf', { type: 'application/pdf' })
    const text = `Yamaha MG10XU\n${'Marketing heritage paragraph\n'.repeat(60)}Mic inputs: 4 x XLR/TRS combo\n`.repeat(3)
    const { engine } = await ai.extractAuto({ text, pdf, onProgress: () => {} })
    expect(engine).toBe('relay')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://relay.example/')
    const body = JSON.parse(String(init.body))
    expect(body.pdfBase64).toBeUndefined()
    expect(body.text).toContain('4 x XLR/TRS combo')
    expect(body.text.length).toBeLessThan(text.length)
  })

  it('sends a scanned PDF itself', async () => {
    const fetchMock = vi.fn(async () => relayOk())
    vi.stubGlobal('fetch', fetchMock)
    const ai = await load('https://relay.example/')
    const pdf = new File([new Uint8Array([37, 80, 68, 70])], 'scan.pdf', { type: 'application/pdf' })
    await ai.extractAuto({ text: '', pdf, onProgress: () => {} })
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(body.pdfBase64).toBe('JVBERg==')
  })

  it('falls back to Chrome when the relay fails', async () => {
    chromeAi('available')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Quota gratuit du jour atteint' } }), { status: 429 })))
    const ai = await load('https://relay.example/')
    const { engine } = await ai.extractAuto({ text: '4 x XLR', allowChrome: true, onProgress: () => {} })
    expect(engine).toBe('chrome')
  })

  it('reports every failure when nothing answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    const ai = await load('https://relay.example/')
    await expect(ai.extractAuto({ text: '4 x XLR', onProgress: () => {} })).rejects.toThrow('IA SynopGig')
  })
})
