import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractGemini, focusText, geminiRequest, sanitizeAi } from './ai'
import { encodeShared, entryToTemplate, validateShared } from './userLibrary'

const model = encodeShared({ brand: 'Yamaha', model: 'MG10XU', category: 'Son', family: 'Consoles', weight: 2.1 }, [
  { prefix: 'In', count: 4, connector: 'xlr-combo', signal: 'audio-analog', dir: 'in' },
  { prefix: 'Out', count: 2, connector: 'xlr3', signal: 'audio-analog', dir: 'out' },
])

describe('USER library', () => {
  it('rejects bad or hostile content', () => {
    expect(validateShared({ ...model, groups: [['In', 999, 'xlr3', 'audio-analog', 'in']] }).ok).toBe(false)
    expect(validateShared({ ...model, groups: [['In', 1, '__proto__', 'audio-analog', 'in']] }).ok).toBe(false)
    expect(validateShared({ ...model, category: 'Pirate' }).ok).toBe(false)
    const ok = validateShared({ ...model, model: '<img src=x onerror=alert(1)>' })
    expect(ok.ok && ok.value.model).toBe('img src=x onerror=alert(1)')
  })

  it('turns entries into palette templates with their author', () => {
    const t = entryToTemplate({ ...model, id: 'user-7', author: 'Théo', createdAt: '2026-10-21' })
    expect(t?.ports).toHaveLength(6)
    expect(t?.author).toBe('Théo')
    expect(entryToTemplate({ ...model, id: 'custom-7', author: 'x', createdAt: '' })).toBeUndefined()
  })
})

describe('AI answers', () => {
  it('keeps only known codes and sane numbers', () => {
    const r = sanitizeAi({
      brand: 'Yamaha',
      model: 'MG10XU',
      category: 'Son',
      rackU: 0,
      ports: [
        { label: 'In', count: 4, connector: 'xlr-combo', signal: 'audio-analog', dir: 'in' },
        { label: 'Mic', count: 4, connector: 'Combo XLR / jack', signal: 'audio-analog', dir: 'in' },
        { label: 'Bad', count: 2, connector: 'warp-drive', signal: 'audio-analog', dir: 'in' },
        { label: 'Huge', count: 5000, connector: 'rca', signal: 'audio-analog', dir: 'sideways' },
      ],
    })
    expect(r.groups).toEqual([
      { prefix: 'In', count: 4, connector: 'xlr-combo', signal: 'audio-analog', dir: 'in' },
      { prefix: 'Huge', count: 256, connector: 'rca', signal: 'audio-analog', dir: 'in' },
    ])
    expect(r.rackU).toBeUndefined()
  })

  it('feeds the small model the useful lines only', () => {
    const noise = Array.from({ length: 200 }, (_, i) => `Marketing paragraph ${i} about our heritage`).join('\n')
    const t = focusText(`Yamaha MG10XU\n${'Intro\n'.repeat(14)}${noise}\nMain outputs: 2 x XLR\nWeight 2.1 kg`)
    expect(t).toContain('Main outputs: 2 x XLR')
    expect(t).not.toContain('heritage')
  })

  it('asks Gemini for typed JSON', () => {
    const req = geminiRequest({ text: 'abc' }) as { generationConfig: { responseSchema: { type: string } } }
    expect(req.generationConfig.responseSchema.type).toBe('OBJECT')
  })

  afterEach(() => vi.unstubAllGlobals())

  it('reads a Gemini answer', async () => {
    const answer = { model: 'MG10XU', category: 'Son', ports: [{ label: 'In', count: 4, connector: 'xlr-combo', signal: 'audio-analog', dir: 'in' }] }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] })))
    vi.stubGlobal('fetch', fetchMock)
    const r = await extractGemini({ text: 'sheet' }, 'KEY')
    expect(r.groups[0].count).toBe(4)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('gemini-2.5-flash-lite:generateContent')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('KEY')
  })

  it('explains Gemini errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 })))
    await expect(extractGemini({ text: 'x' }, 'BAD')).rejects.toThrow('API key not valid')
  })
})
