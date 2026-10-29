import { describe, expect, it } from 'vitest'
import type { AiGroup, AiResult } from './ai'
import { readProduct } from './addProduct'

const g = (prefix: string, count: number, connector: string, dir: 'in' | 'out' | 'io' = 'in', signal = 'audio-analog'): AiGroup => ({ prefix, count, connector: connector as never, signal: signal as never, dir })
const reading = (groups: AiGroup[], extra: Partial<AiResult> = {}): AiResult => ({ category: 'Son', family: 'Mélangeurs', groups, ...extra })
const FLOW8 = [g('Mic 1-2', 2, 'xlr3'), g('Ch 3-4', 2, 'xlr-combo'), g('Line 5-8', 4, 'jack'), g('Main L/R', 2, 'xlr3', 'out'), g('Phones', 1, 'jack', 'out')]
const docs = [{ title: 'FLOW 8 QSG', url: 'https://mediadl.musictribe.com/flow8.pdf', host: 'mediadl.musictribe.com', kind: 'pdf' as const, official: true, exact: true, doc: 'quickstart' as const }]
const read = { text: 'Mic inputs 1-2 XLR\nInputs 3-4 combo\nLine 5-8\nMain out L/R XLR\nPhones', images: [], used: [{ title: 'FLOW 8 QSG', url: docs[0].url }] }

describe('adding a product almost by itself', () => {
  it('confirms what the web research and the documents agree on, in the panel order of the research', async () => {
    const p = await readProduct('Behringer', 'FLOW 8', [], () => {}, {
      researchWeb: async () => reading(FLOW8, { sources: [{ url: 'https://www.thomann.de/flow8', title: 'Thomann' }] }),
      findDocs: async () => docs,
      research: async () => read,
      readSheet: async () => reading([...FLOW8].reverse()),
    })
    expect(p.result.groups.map((x) => x.prefix)).toEqual(['Mic 1-2', 'Ch 3-4', 'Line 5-8', 'Main L/R', 'Phones'])
    expect(p.checked.every((x) => x.doubts.length === 0)).toBe(true)
    expect(p.sources.map((s) => s.url)).toEqual(['https://www.thomann.de/flow8', docs[0].url])
    expect(p.result).toMatchObject({ brand: 'Behringer', model: 'FLOW 8' })
  })

  it('has a disagreement settled with the documents, and flags what nobody read', async () => {
    let settledWith = ''
    const p = await readProduct('Behringer', 'FLOW 8', [], () => {}, {
      researchWeb: async () => reading(FLOW8),
      findDocs: async () => docs,
      research: async () => read,
      readSheet: async () => reading(FLOW8.map((x) => (x.prefix === 'Line 5-8' ? { ...x, count: 2 } : x))),
      settle: async (r, sheet) => ((settledWith = sheet), { ...r, groups: r.groups }),
    })
    expect(settledWith).toContain('Line 5-8')
    expect(p.result.by).toContain('arbitrage')
    expect(p.checked.find((x) => x.prefix === 'Line 5-8')?.doubts ?? []).not.toContain('aucune des deux lectures ne lisait 4')
  })

  it('works on the web research alone when no document can be read, rows to check', async () => {
    const p = await readProduct('Behringer', 'FLOW 8', [], () => {}, {
      researchWeb: async () => reading(FLOW8),
      findDocs: async () => docs,
      research: async () => Promise.reject(new Error('behringer.com : refusé (403)')),
      readSheet: async () => reading([]),
    })
    expect(p.checked).toHaveLength(5)
    // One reading: no row stands out, the whole list is to check.
    expect(p.readings).toBe(1)
    expect(p.checked[0].doubts).toEqual([])
    expect(p.report).toContain('refusé (403)')
  })

  it('falls back on the documents when the web research fails, and says why when both do', async () => {
    const p = await readProduct('Behringer', 'FLOW 8', [], () => {}, {
      researchWeb: async () => Promise.reject(new Error('quota Groq')),
      findDocs: async () => docs,
      research: async () => read,
      readSheet: async () => reading(FLOW8, { second: FLOW8 }),
    })
    expect(p.checked.every((x) => x.doubts.length === 0)).toBe(true)
    await expect(
      readProduct('Behringer', 'FLOW 8', [], () => {}, {
        researchWeb: async () => Promise.reject(new Error('quota Groq')),
        findDocs: async () => [],
        readSheet: async () => reading([]),
      }),
    ).rejects.toThrow(/recherche web : quota Groq ; documents : aucun document trouvé/)
  })
})
