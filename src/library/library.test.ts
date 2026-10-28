import { describe, expect, it } from 'vitest'
import { parseDatasheet } from './parseDatasheet'
import { expandGroups, groupPorts } from './portGroups'

const BRANDS = ['L-Acoustics', 'Yamaha', 'Shure', 'Sennheiser', 'd&b audiotechnik']

const short = (r: ReturnType<typeof parseDatasheet>) => r.groups.map((g) => `${g.count}×${g.connector}/${g.signal}/${g.dir}`)

describe('parseDatasheet', () => {
  it('reads an amplifier data sheet', () => {
    const r = parseDatasheet(
      `L-Acoustics LA4X amplified controller
       Technical specifications
       Amplification: 4 x 1000 W / 8 Ω
       Inputs: 4 x analog / AES inputs on XLR3 female
       Link: 4 x XLR3 male
       Outputs: 4 x speakON NL4
       Network: 2 x etherCON (L-NET)
       Mains: powerCON 32 A
       Dimensions: 2U, 19" rack
       Weight: 12.5 kg`,
      BRANDS,
    )
    expect(r.brand).toBe('L-Acoustics')
    expect(r.model).toBe('LA4X')
    expect(r.rackU).toBe(2)
    expect(r.weight).toBe(12.5)
    expect(r.category).toBe('Son')
    expect(r.family).toBe('Amplis')
    expect(short(r)).toEqual(expect.arrayContaining([
      '4×xlr3/audio-analog/in',
      '4×xlr3/audio-analog/out',
      '4×speakon/speaker/out',
      '2×ethercon/network/io',
      '1×powercon/power/in',
    ]))
  })

  it('reads SFP cages and Lemo inputs', () => {
    const r = parseDatasheet(
      `Network switch
       Ports: 8 x RJ45, 2 x SFP+ cages
       Bodypack transmitter input: 1 x Lemo 3-pin`,
      BRANDS,
    )
    expect(short(r)).toEqual(expect.arrayContaining(['2×sfp/network/io', '1×lemo3/audio-analog/in']))
  })

  it('reads a stagebox data sheet', () => {
    const r = parseDatasheet(
      `Yamaha Rio1608-D2 I/O rack
       16 mic/line inputs (XLR-3-31 type)
       8 line outputs (XLR-3-32 type)
       Dante primary / secondary (etherCON)
       Sampling frequency 48 kHz / 96 kHz
       Power requirements: 100-240 V, 50/60 Hz, IEC inlet
       3U rack mount, 8.0 kg`,
      BRANDS,
    )
    expect(r.brand).toBe('Yamaha')
    expect(r.model).toBe('Rio1608-D2')
    expect(r.rackU).toBe(3)
    expect(r.family).toBe('Stageboxes & moteurs')
    expect(short(r)).toEqual(expect.arrayContaining(['16×xlr3/audio-analog/in', '8×xlr3/audio-analog/out', '2×ethercon/dante/io', '1×iec/power/in']))
  })

  it('reads a French wireless receiver sheet', () => {
    const r = parseDatasheet(
      `Récepteur double Sennheiser EW-DX EM 2
       Entrées antenne : 2 x BNC
       Sorties audio : 2 x XLR-3 symétriques
       Sortie jack 6,35 mm
       Réseau : RJ45 Ethernet
       Alimentation : connecteur IEC
       Poids : 3,2 kg - 1U`,
      BRANDS,
    )
    expect(r.brand).toBe('Sennheiser')
    expect(r.model).toBe('EW-DX')
    expect(r.family).toBe('HF — récepteurs')
    expect(r.weight).toBe(3.2)
    expect(short(r)).toEqual(expect.arrayContaining(['2×bnc/rf/in', '2×xlr3/audio-analog/out', '1×rj45/network/io', '1×iec/power/in']))
  })
})

describe('parseDatasheet on a busy mixer sheet', () => {
  const r = parseDatasheet(
    `Yamaha MG10XU 10-channel mixing console
     Mic inputs: 4 x XLR/TRS combo
     Gain range: 0 to 98 dB
     Mic input EIN: -128 dBu
     Input impedance: 3 kΩ
     Inputs 1-4: phantom power +48 V
     Dynamic range: 98 dB, frequency response 20 Hz – 20 kHz
     Stereo inputs: 3 x 1/4" TRS (L/R)
     Main outputs: 2 x XLR, 2 x RCA
     Monitor out: 1 x 1/4" TRS
     Phones: 1/4" stereo jack
     USB-C audio interface
     MIDI in/out (DIN)
     Power: DC 12 V adaptor
     Weight 2.1 kg`,
    BRANDS,
  )
  const find = (connector: string, dir: string) => r.groups.find((g) => g.connector === connector && g.dir === dir)

  it('never turns measurements into ports', () => {
    expect(r.groups.every((g) => g.count < 20)).toBe(true)
  })

  it('reads combo, RCA, USB-C and MIDI', () => {
    expect(find('xlr-combo', 'in')?.count).toBe(4)
    expect(find('xlr3', 'out')?.count).toBe(2)
    expect(find('rca', 'out')?.count).toBe(2)
    expect(find('jack', 'in')?.count).toBe(3)
    expect(find('usb-c', 'io')?.count).toBe(1)
    expect(find('midi', 'in')).toBeDefined()
    expect(find('midi', 'out')).toBeDefined()
  })

  it('reads the headphone jack as an output and counts no extra XLR', () => {
    expect(find('jack', 'out')?.count).toBe(1)
    expect(find('xlr3', 'in')).toBeUndefined()
  })

  it('flags counts it had to guess', () => {
    expect(find('xlr-combo', 'in')?.guessed).toBe(false)
    expect(find('usb-c', 'io')?.guessed).toBe(true)
  })
})

describe('port groups', () => {
  it('expands and regroups', () => {
    const groups = [
      { prefix: 'In', count: 16, connector: 'xlr3' as const, signal: 'audio-analog' as const, dir: 'in' as const },
      { prefix: 'Secteur', count: 1, connector: 'iec' as const, signal: 'power' as const, dir: 'in' as const },
    ]
    const ports = expandGroups(groups)
    expect(ports).toHaveLength(17)
    expect(ports[0].label).toBe('In 1')
    expect(ports[16].label).toBe('Secteur')
    expect(new Set(ports.map((p) => p.id)).size).toBe(17)
    expect(groupPorts(ports)).toEqual(groups)
  })
})
