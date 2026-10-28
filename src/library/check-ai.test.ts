import { describe, expect, it } from 'vitest'
import { checkAnswer, focusText, quoteHasCount, quoteInSheet, sanitizeAi } from './ai'
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
