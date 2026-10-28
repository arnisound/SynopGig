import { afterEach, expect, it, vi } from 'vitest'

vi.mock('./pdfText', () => ({ pdfToText: async () => `Rear panel\n${'Mic inputs 1-10: XLR/TRS combo\n'.repeat(10)}` }))

afterEach(() => vi.unstubAllGlobals())

it('reads the user guide a product page links to, with the page', async () => {
  const page = { title: 'TMD16', text: 'Titre : TMD16\n10 digital mic preamps', images: [], docs: [{ url: 'https://cdn.example/TMD16-User-Guide.pdf', title: 'User Guide' }] }
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
    JSON.parse(String(init?.body)).url.endsWith('.pdf')
      ? new Response(new Uint8Array([37, 80, 68, 70]), { headers: { 'Content-Type': 'application/pdf' } })
      : new Response(JSON.stringify(page), { headers: { 'Content-Type': 'application/json' } }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const { loadDoc } = await import('./finder')
  const steps: string[] = []
  const r = await loadDoc({ title: 'TMD16', url: 'https://www.altoprofessional.com/tmd16', host: 'altoprofessional.com', kind: 'page', official: true }, 'TMD16', (m) => steps.push(m))
  expect(r.manual?.title).toBe('User Guide')
  expect(r.pdf?.name).toBe('TMD16-User-Guide.pdf')
  expect(r.text).toContain('10 digital mic preamps')
  expect(r.text).toContain('XLR/TRS combo')
  expect(steps[0]).toContain('User Guide')
})
