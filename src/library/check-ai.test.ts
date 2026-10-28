import { describe, expect, it } from 'vitest'
import { checkAnswer, focusText, missedGroups, quoteHasCount, quoteInSheet, sanitizeAi } from './ai'
import { parseDatasheet } from './parseDatasheet'

/** What pdf.js gives for a typical amplifier manual. */
const MANUAL = [
  'Fohhn PS-850',
  'Power amplifier – user manual',
  ...Array.from({ length: 40 }, (_, i) => `WARNING: to reduce the risk of fire or electric shock, do not expose this apparatus to rain or moisture (${i}).`),
  'The unit must be connected to a mains socket outlet with a protective earthing connection.',
  ...Array.from({ length: 60 }, (_, i) => `Our heritage of sound since 1993, paragraph ${i}, crafted in Germany with passion.`),
  'Rear panel',
  '1. Audio inputs A-D: 4 x XLR female, electronically balanced',
  '2. Link outputs A-D: 4 x XLR male, parallel to the inputs',
  '3. Speaker outputs: 4 x Speakon NL4',
  '4. Network: 2 x etherCON (Fohhn-Net)',
  '5. Mains input: powerCON TRUE1',
  'Technical data',
  'Number of channels',
  '4',
  'Height',
  '2 U',
  'Weight 9.8 kg',
  'Warranty: 5 years, see conditions on fohhn.com',
].join('\n')

describe('what the model reads', () => {
  const t = focusText(MANUAL, 1500, 'Fohhn PS-850')

  it('keeps the connection passages, the table values and the name', () => {
    for (const line of ['Fohhn PS-850', '4 x XLR female', '4 x Speakon NL4', 'powerCON TRUE1', 'Number of channels', '2 U', 'Weight 9.8 kg']) expect(t).toContain(line)
    // A lone table value comes with its label.
    expect(t).toMatch(/Number of channels\n4\n/)
  })

  it('leaves out safety, warranty and marketing text', () => {
    expect(t).not.toContain('WARNING')
    expect(t).not.toContain('Warranty')
    expect(t).not.toContain('heritage')
  })

  it('cuts endless lines instead of dropping them', () => {
    const long = `${'Lorem ipsum dolor sit amet. '.repeat(20)}Outputs: 2 x XLR male. ${'More text here. '.repeat(20)}`
    expect(focusText(long)).toContain('Outputs: 2 x XLR male.')
  })
})

describe('checking an AI answer against the sheet', () => {
  it('finds a count written as a number, a range, a word or per channel', () => {
    expect(quoteHasCount('4 x XLR female', 4)).toBe(true)
    expect(quoteHasCount('Inputs 1-16', 16)).toBe(true)
    expect(quoteHasCount('two Dante ports', 2)).toBe(true)
    expect(quoteHasCount('4 channels with 2 Speakon each', 8)).toBe(true)
    expect(quoteHasCount('XLR inputs', 4)).toBe(false)
    expect(quoteHasCount('mains input', 1)).toBe(true)
  })

  it('accepts a passage quoted with small differences only', () => {
    expect(quoteInSheet('Audio inputs A–D: 4 x XLR female', MANUAL)).toBe(true)
    expect(quoteInSheet('16 x XLR inputs with phantom power', MANUAL)).toBe(false)
  })

  it('confirms what the sheet says and flags the rest', () => {
    const answer = sanitizeAi({
      model: 'PS-850',
      category: 'Son',
      ports: [
        { label: 'Entrée', count: 4, connector: 'xlr3', signal: 'audio-analog', dir: 'in', quote: 'Audio inputs A-D: 4 x XLR female' },
        { label: 'Sortie HP', count: 8, connector: 'speakon', signal: 'speaker', dir: 'out', quote: 'Speaker outputs: 4 x Speakon NL4' },
        { label: 'Dante', count: 2, connector: 'ethercon', signal: 'network', dir: 'io', quote: '2 x Dante etherCON ports' },
        { label: 'Secteur', count: 1, connector: 'powercon-true1', signal: 'power', dir: 'in' },
      ],
    })
    const [inputs, speakers, dante, mains] = checkAnswer(answer.groups, MANUAL, parseDatasheet(MANUAL, []).groups)
    expect(inputs.doubts).toEqual([])
    expect(speakers.doubts).toContain('quantité 8 non écrite dans le passage')
    expect(dante.doubts).toContain('passage introuvable dans la fiche')
    expect(mains.doubts).toContain('aucun passage cité')
  })

  it('keeps the same connector once when the sheet gives it twice', () => {
    const r = sanitizeAi({
      model: 'X',
      category: 'Son',
      ports: [
        { label: 'In', count: 8, connector: 'xlr3', signal: 'audio-analog', dir: 'in', quote: 'Inputs 1-8 XLR' },
        { label: 'Mic In', count: 8, connector: 'xlr3', signal: 'audio-analog', dir: 'in', quote: '8 x XLR' },
        { label: 'Line In', count: 4, connector: 'xlr3', signal: 'audio-analog', dir: 'in', quote: 'Line inputs 9-12 XLR' },
      ],
    })
    expect(r.groups.map((g) => [g.prefix, g.count])).toEqual([['In', 8], ['Line In', 4]])
  })
})

describe('two AI readings of the same sheet', () => {
  const g = (count: number, connector = 'xlr3', quote?: string) => ({ prefix: 'In', count, connector: connector as never, signal: 'audio-analog' as const, dir: 'in' as const, quote })

  it('trusts what both found, even when the count is worked out', () => {
    // 4 channels × 2 Speakon: written nowhere as "8", both models agree.
    const [r] = checkAnswer([g(8, 'speakon', 'Speaker outputs: 2 x Speakon per channel')], 'Speaker outputs: 2 x Speakon per channel\n4 channels', [], [g(8, 'speakon')])
    expect(r.doubts).toEqual([])
  })

  it('flags a different count and what only one of them saw', () => {
    const sheet = 'Inputs: 4 x XLR\nNetwork: RJ45'
    const [inputs, network] = checkAnswer([g(4, 'xlr3', 'Inputs: 4 x XLR'), g(1, 'rj45', 'Network: RJ45')], sheet, [], [g(8, 'xlr3')])
    expect(inputs.doubts).toContain('l’autre IA lit 8')
    expect(network.doubts).toContain('vu par une seule des deux IA')
  })

  it('takes an XLR combo and an XLR for the same socket', () => {
    const [r] = checkAnswer([g(10, 'xlr-combo', 'Mic inputs 1-10')], 'Mic inputs 1-10', [], [g(10, 'xlr3')])
    expect(r.doubts).toEqual([])
  })

  it('offers what the second one found and the first missed', () => {
    expect(missedGroups([g(4)], [g(4), g(2, 'hdmi')])).toEqual([g(2, 'hdmi')])
  })
})

describe('settling a disagreement', () => {
  const g = (count: number, connector = 'xlr3', dir: 'in' | 'out' = 'in') => ({ prefix: 'P', count, connector: connector as never, signal: 'audio-analog' as const, dir })

  it('finds what the two readings disagree on', async () => {
    const { disagreements } = await import('./ai')
    expect(disagreements([g(12), g(2, 'xlr3', 'out')], [g(10), g(2, 'xlr3', 'out'), g(1, 'usb')]).map((x) => `${x.count}${x.connector}`)).toEqual(['12xlr3', '1usb'])
    expect(disagreements([g(8)], [g(8)])).toEqual([])
  })

  it('asks the relay for one more reading, told both, and keeps its list', async () => {
    const { settle } = await import('./ai')
    const bodies: { single?: boolean; text: string; system: string }[] = []
    const fetchMock = async (_u: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ engine: 'groq', text: JSON.stringify({ model: 'TMD16', category: 'Son', ports: [{ label: 'Entrée', count: 8, connector: 'xlr-combo', signal: 'audio-analog', dir: 'in', quote: 'Inputs 1-8 combo' }] }) }))
    }
    const r = await settle({ category: 'Son', groups: [g(12)], second: [g(10)] }, 'Inputs 1-8 combo XLR / 1/4" TRS', 'Alto TMD16', 'https://relay.example/', fetchMock as typeof fetch)
    expect(bodies[0].single).toBe(true)
    expect(bodies[0].system.startsWith('You are a live sound')).toBe(true)
    expect(bodies[0].text).toContain('Reading A:\n- 12 x xlr3')
    expect(bodies[0].text).toContain('Reading B:\n- 10 x xlr3')
    expect(r?.groups[0]).toMatchObject({ count: 8, connector: 'xlr-combo' })
    expect(r?.by).toContain('tranché par Groq')
  })

  it('never lets a loudspeaker signal sit on an XLR', () => {
    const r = sanitizeAi({ model: 'X', category: 'Son', ports: [{ label: 'Main', count: 2, connector: 'xlr3', signal: 'speaker', dir: 'out' }] })
    expect(r.groups[0].signal).toBe('audio-analog')
  })
})

describe('what a technician knows', () => {
  const read = (ports: object[], family = 'Consoles') => sanitizeAi({ model: 'TMD16', category: 'Son', family, ports })

  it('makes a balanced main output of a mixer an XLR pair', () => {
    const r = read([{ label: 'Main output', count: 1, connector: 'jack', signal: 'audio-analog', dir: 'out', quote: 'Main outputs (balanced)' }])
    expect(r.groups[0]).toMatchObject({ connector: 'xlr3', count: 2 })
    expect(r.groups[0].note).toContain('XLR')
  })

  it('keeps a main output on jacks when the sheet says so', () => {
    const r = read([{ label: 'Main out', count: 2, connector: 'jack', signal: 'audio-analog', dir: 'out', quote: 'Main outputs: 2 x balanced 1/4" TRS' }])
    expect(r.groups[0]).toMatchObject({ connector: 'jack', count: 2 })
    expect(r.groups[0].note).toBeUndefined()
  })

  it('counts L and R for each stereo input on jacks or RCA, not on a mini-jack', () => {
    const r = read([
      { label: 'Stereo line in', count: 2, connector: 'jack', signal: 'audio-analog', dir: 'in', quote: '2 stereo line inputs (1/4")' },
      { label: 'Stereo RCA in', count: 1, connector: 'rca', signal: 'audio-analog', dir: 'in', quote: '1 x Dual RCA Stereo' },
      { label: 'Aux in', count: 1, connector: 'minijack', signal: 'audio-analog', dir: 'in', quote: '1 x 1/8" stereo' },
      { label: 'Main', count: 2, connector: 'xlr3', signal: 'audio-analog', dir: 'out', quote: '2 x XLR (L, R)' },
    ])
    expect(r.groups.map((g) => `${g.count} ${g.connector}`)).toEqual(['4 jack', '2 rca', '1 minijack', '2 xlr3'])
  })

  it('adds the main stereo output a mixer always has, to check', () => {
    const r = read([{ label: 'Mic in', count: 8, connector: 'xlr-combo', signal: 'audio-analog', dir: 'in', quote: 'Inputs 1-8 combo' }])
    const main = r.groups.find((g) => g.dir === 'out')
    expect(main).toMatchObject({ count: 2, connector: 'xlr3' })
    expect(checkAnswer(r.groups, 'Inputs 1-8 combo', [], r.groups).find((g) => g.dir === 'out')?.doubts).toContain('non lue dans la fiche')
  })

  it('leaves an amplifier alone', () => {
    const r = read([{ label: 'Input', count: 1, connector: 'xlr3', signal: 'audio-analog', dir: 'in', quote: 'Input: XLR' }], 'Amplis')
    expect(r.groups).toHaveLength(1)
  })
})

describe('a Behringer FLOW 8', () => {
  const read = (ports: object[]) => sanitizeAi({ model: 'FLOW 8', category: 'Son', family: 'Mélangeurs', ports })
  it('keeps one headphone socket, finds the R jacks of stereo inputs, and the DC power input', () => {
    const r = read([
      { label: 'Sortie casque', count: 2, connector: 'jack', signal: 'audio-analog', dir: 'out', quote: 'Phones output (stereo, 1/4")' },
      { label: 'Entrée ligne 5L/7L', count: 2, connector: 'jack', signal: 'audio-analog', dir: 'in', quote: 'Line inputs 5L (mono) and 7L (mono)' },
      { label: 'Alimentation', count: 1, connector: 'usb', signal: 'power', dir: 'in', quote: 'DC in, external power supply 12 V' },
      { label: 'Main', count: 2, connector: 'xlr3', signal: 'audio-analog', dir: 'out', quote: 'Main outputs L/R (balanced XLR)' },
    ])
    expect(r.groups.map((g) => `${g.count} ${g.connector}`)).toEqual(['1 jack', '4 jack', '1 dc', '2 xlr3'])
  })
})
