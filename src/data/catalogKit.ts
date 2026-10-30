import type { Category, ConnectorType, DeviceOption, DeviceTemplate, Port, PortDirection, SignalType, Spec } from '../types'
import { port, series } from './ports'

/* Shorthands shared by the brand catalogue files. */

export { port, series }

export const A: SignalType = 'audio-analog'
export const AES: SignalType = 'audio-digital'
export const HP: SignalType = 'speaker'
export const DMX: SignalType = 'dmx'
export const NET: SignalType = 'network'
export const V: SignalType = 'video'
export const PWR: SignalType = 'power'
export const RF: SignalType = 'rf'
export const CTRL: SignalType = 'control'
export const LINK: SignalType = 'audio-link'
export const DANTE: SignalType = 'dante'
export const AVB: SignalType = 'avb'
export const ARTNET: SignalType = 'artnet'
export const CIP: SignalType = 'control-ip'
export const SYNC: SignalType = 'sync'

export const ins = (n: number, label = 'In', c: ConnectorType = 'xlr3') => series('in', label, n, c, A, 'in')
export const outs = (n: number, label = 'Out', c: ConnectorType = 'xlr3') => series('out', label, n, c, A, 'out')
export const pair = (prefix: string, label: string, c: ConnectorType, s: SignalType, d: PortDirection = 'io'): Port[] => [
  port(`${prefix}A`, `${label} A`, c, s, d),
  port(`${prefix}B`, `${label} B`, c, s, d),
]
export const dante = (c: ConnectorType = 'ethercon') => [port('pri', 'Dante primaire', c, DANTE, 'io'), port('sec', 'Dante secondaire', c, DANTE, 'io')]
/** A console's or a stagebox's own link (AES50, gigaACE, SLink…), A and B when doubled. */
export const link = (prefix: string, label: string, n = 1, c: ConnectorType = 'ethercon'): Port[] =>
  n === 1 ? [port(prefix, label, c, LINK, 'io')] : Array.from({ length: n }, (_, i) => port(`${prefix}${'ABCD'[i]}`, `${label} ${'ABCD'[i]}`, c, LINK, 'io'))
/** Remote control over IP (editor, tablet app, OSC). */
export const ctl = (label = 'Réseau contrôle', c: ConnectorType = 'rj45', id = 'ctl') => port(id, label, c, CIP, 'io')
/** The main stereo output of a mixer: L and R. */
export const mainLR = (c: ConnectorType = 'xlr3', label = 'Main') => [port('mainL', `${label} L`, c, A, 'out'), port('mainR', `${label} R`, c, A, 'out')]
/** Headphones: one stereo socket. */
export const phones = (c: ConnectorType = 'jack', id = 'phones', label = 'Casque') => port(id, label, c, A, 'out')
export const talkback = (c: ConnectorType = 'xlr3') => port('tb', 'Talkback', c, A, 'in')
export const aesIn = (n = 1, c: ConnectorType = 'xlr3') => series('aesIn', 'AES in', n, c, AES, 'in')
export const aesOut = (n = 1, c: ConnectorType = 'xlr3') => series('aesOut', 'AES out', n, c, AES, 'out')
export const madi = (c: ConnectorType = 'sdi', suffix = '') => [port(`madiIn${suffix}`, `MADI in${suffix ? ` ${suffix}` : ''}`, c, AES, 'in'), port(`madiOut${suffix}`, `MADI out${suffix ? ` ${suffix}` : ''}`, c, AES, 'out')]
export const wclk = () => [port('wcIn', 'Word clock in', 'sdi', SYNC, 'in'), port('wcOut', 'Word clock out', 'sdi', SYNC, 'out')]
export const midi = () => [port('midiIn', 'MIDI in', 'midi', CTRL, 'in'), port('midiOut', 'MIDI out', 'midi', CTRL, 'out')]
export const usbAudio = (label = 'USB audio', c: ConnectorType = 'usb') => port('usb', label, c, AES, 'io')
export const gpio = () => port('gpio', 'GPIO', 'db25', CTRL, 'io')
/** Stereo line pairs on separate sockets: "St 1 L", "St 1 R"… */
export const stereoIns = (n: number, label = 'St', c: ConnectorType = 'jack', id = 'st') =>
  Array.from({ length: n }, (_, i) => [port(`${id}${i + 1}L`, `${label} ${i + 1} L`, c, A, 'in'), port(`${id}${i + 1}R`, `${label} ${i + 1} R`, c, A, 'in')]).flat()
export const stereoOuts = (n: number, label = 'St out', c: ConnectorType = 'jack', id = 'sto') =>
  Array.from({ length: n }, (_, i) => [port(`${id}${i + 1}L`, `${label} ${i + 1} L`, c, A, 'out'), port(`${id}${i + 1}R`, `${label} ${i + 1} R`, c, A, 'out')]).flat()
export const net = (label = 'Réseau', c: ConnectorType = 'ethercon') => port('net', label, c, NET, 'io')
export const iec = () => port('pwr', 'Secteur', 'iec', PWR, 'in')
export const t1 = () => port('pwr', 'Secteur', 'powercon-true1', PWR, 'in')
export const t1Link = () => [t1(), port('pwr-out', 'Recopie secteur', 'powercon-true1', PWR, 'out')]
export const pc32 = () => port('pwr', 'Secteur', 'powercon', PWR, 'in')
export const dmxInOut = (c: ConnectorType = 'xlr5') => [port('dmxIn', 'DMX in', c, DMX, 'in'), port('dmxOut', 'DMX out', c, DMX, 'out')]
export const dmxOuts = (n: number) => series('dmx', 'DMX', n, 'xlr5', DMX, 'out')
// Wireless: diversity antenna inputs, cascade outputs, transmitter antenna.
export const antIn = () => [port('antA', 'Antenne A', 'bnc', RF, 'in'), port('antB', 'Antenne B', 'bnc', RF, 'in')]
export const cascade = () => [port('cascA', 'Cascade A', 'bnc', RF, 'out'), port('cascB', 'Cascade B', 'bnc', RF, 'out')]
export const antOut = () => port('ant', 'Antenne', 'bnc', RF, 'out')
export const dc = (label = 'Alim DC') => port('pwr', label, 'dc', PWR, 'in')
export const lineIn = () => [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Link', 'xlr3', A, 'out')]
export const hpIn = (c: ConnectorType = 'speakon') => [port('in', 'Entrée HP', c, HP, 'in'), port('link', 'Link HP', c, HP, 'out')]

/**
 * A product sheet, as the AI reading builds it: what it is, then its
 * characteristics grouped "Physique", "Alimentation", then by trade.
 */
export interface Sheet {
  u?: number
  kg?: number
  /** Power drawn from the mains, in watts (also the power budget). */
  w?: number
  /** H × L × P, in mm. */
  dim?: string
  /** Mains voltage, e.g. "100-240 V". */
  v?: string
  /** One or two sentences, in French: what it is, what it is for. */
  d?: string
  /** Other characteristics: [group, label, value, unit?]. */
  x?: [string, string, string, string?][]
  /** Cards and modules that can be fitted. */
  opt?: DeviceOption[]
  /** Card slots of the product. */
  slots?: number
  url?: string
}

/** The words in brackets of a model name ("D-2.750 (ampli DSP 2 × 750 W)"), as a sentence. */
function aboutOf(brand: string, model: string) {
  const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(model)
  if (!m) return undefined
  return `${m[2][0].toUpperCase()}${m[2].slice(1)} ${brand} ${m[1]}.`.replace(/\s+/g, ' ')
}

export function dev(id: string, brand: string, model: string, category: Category, sheet: Sheet, ports: Port[]): DeviceTemplate {
  const description = sheet.d ?? aboutOf(brand, model)
  const specs: Spec[] = [
    ...(sheet.dim ? [{ group: 'Physique', label: 'Dimensions (H × L × P)', value: sheet.dim, unit: 'mm' }] : []),
    ...(sheet.kg ? [{ group: 'Physique', label: 'Poids', value: String(sheet.kg).replace('.', ','), unit: 'kg' }] : []),
    ...(sheet.u ? [{ group: 'Physique', label: 'Format rack', value: String(sheet.u), unit: 'U' }] : []),
    ...(sheet.v ? [{ group: 'Alimentation', label: 'Tension', value: sheet.v }] : []),
    ...(sheet.w ? [{ group: 'Alimentation', label: 'Consommation', value: String(sheet.w), unit: 'W' }] : []),
    ...(sheet.x ?? []).map(([group, label, value, unit]) => ({ group, label, value, ...(unit ? { unit } : {}) })),
  ]
  return {
    id,
    brand,
    model,
    category,
    rackU: sheet.u,
    weight: sheet.kg,
    ports,
    ...(sheet.w ? { watts: sheet.w } : {}),
    ...(description ? { description } : {}),
    ...(sheet.url ? { url: sheet.url } : {}),
    ...(specs.length ? { specs } : {}),
    ...(sheet.opt?.length ? { options: sheet.opt, ...(sheet.slots ? { slots: sheet.slots } : {}) } : {}),
  }
}

/** An optional card: its ports appear on the device once fitted. */
export const opt = (id: string, label: string, ports: Port[]): DeviceOption => ({ id, label, ports })

/** Tags each model of a list with its family. */
export const family = (name: string, list: DeviceTemplate[]) => list.map((t) => ({ ...t, family: name }))

/** A run of identical sockets numbered from `start`: "Mic 9", "Mic 10"... */
export const run = (id: string, label: string, n: number, c: ConnectorType, s: SignalType, d: PortDirection, start = 1): Port[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${id}${i + start}`, label: `${label} ${i + start}`, connector: c, signal: s, dir: d }))
/** A footswitch socket: one jack carrying a contact. */
export const footswitch = () => port('fs', 'Footswitch', 'jack', CTRL, 'in')
export const lamp = () => port('lamp', 'Lampe', 'xlr4', PWR, 'out')
