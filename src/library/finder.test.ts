import { afterEach, expect, it, vi } from 'vitest'

vi.mock('./pdfText', () => ({ pdfToText: async () => `Rear panel\n${'Inputs 1-8: XLR / 1/4" TRS combo\n'.repeat(10)}` }))

afterEach(() => vi.unstubAllGlobals())

const doc = (url: string, title: string, kind: 'pdf' | 'page', extra = {}) => ({ url, title, kind, host: new URL(url).hostname, official: true, exact: true, ...extra })
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })

it('reads the user guide of this model by itself, with its product page', async () => {
  const calls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname
      calls.push(`${path} ${JSON.parse(String(init?.body)).url}`)
      const target = JSON.parse(String(init?.body)).url as string
      if (target.endsWith('.pdf')) return new Response(new Uint8Array([37, 80, 68, 70]), { headers: { 'Content-Type': 'application/pdf' } })
      return json({ title: 'TMD16', text: `Titre : TMD16\n10 digital mic preamps\n${'16-channel compact digital mixer. '.repeat(10)}`, url, images: ['https://x/p.jpg'], docs: [] })
    }),
  )
  const { research } = await import('./finder')
  const steps: string[] = []
  const r = await research(
    [
      doc('https://www.altoprofessional.com/tmd16', 'TMD16', 'page'),
      doc('https://cdn.inmusicbrands.com/tmd16-qsg.pdf', 'Quickstart', 'pdf', { doc: 'quickstart' }),
      doc('https://cdn.inmusicbrands.com/tmd16-user-guide.pdf', 'TMD16 User Guide', 'pdf', { doc: 'manual' }),
    ],
    'TMD16',
    (m) => steps.push(m),
  )
  // The manual first, then the quick start (its drawings), then the page; no OCR needed.
  expect(r.used.map((u) => u.title)).toEqual(['TMD16 User Guide', 'Quickstart', 'TMD16'])
  expect(r.text.indexOf('XLR / 1/4" TRS combo')).toBeLessThan(r.text.indexOf('10 digital mic preamps'))
  expect(calls.some((c) => c.startsWith('/ocr'))).toBe(false)
  expect(r.images).toEqual(['https://x/p.jpg'])
  expect(r.pdf?.name).toBe('tmd16-user-guide.pdf')
})

it('follows the manual a page links to', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname
      const target = JSON.parse(String(init?.body)).url as string
      if (path === '/ocr') return new Response(JSON.stringify({ error: { message: 'OCR indisponible' } }), { status: 501 })
      if (target.endsWith('.pdf')) return new Response(new Uint8Array([37, 80, 68, 70]), { headers: { 'Content-Type': 'application/pdf' } })
      return json({ title: 'TMD16', text: `Titre : TMD16\n${'16-channel compact digital mixer. '.repeat(10)}`, url: target, images: [], docs: [{ url: 'https://cdn.example/TMD16-User-Guide.pdf', title: 'User Guide', pdf: true, doc: 'manual' }] })
    }),
  )
  const { research } = await import('./finder')
  const r = await research([doc('https://www.altoprofessional.com/tmd16', 'TMD16', 'page')], 'TMD16', () => {})
  expect(r.used[0].title).toBe('User Guide')
  expect(r.pdf?.name).toBe('TMD16-User-Guide.pdf')
  expect(r.text).toContain('XLR / 1/4" TRS combo')
})

it('moves on to the next document when one cannot be read, and says why when none can', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Le site a refusé la lecture (403)' } }), { status: 502 })))
  const { research } = await import('./finder')
  await expect(research([doc('https://www.behringer.com/product/flow-8', 'FLOW 8', 'page'), doc('https://mediadl.musictribe.com/flow8-qsg.pdf', 'FLOW 8 QSG', 'pdf', { doc: 'quickstart' })], 'FLOW 8', () => {})).rejects.toThrow(
    /www\.behringer\.com : Le site a refusé la lecture \(403\) ; FLOW 8 QSG : Le site a refusé/,
  )
})
