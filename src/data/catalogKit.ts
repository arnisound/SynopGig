import type { Category, ConnectorType, DeviceTemplate, Port, PortDirection, SignalType } from '../types'
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

export const ins = (n: number, label = 'In', c: ConnectorType = 'xlr3') => series('in', label, n, c, A, 'in')
export const outs = (n: number, label = 'Out', c: ConnectorType = 'xlr3') => series('out', label, n, c, A, 'out')
export const pair = (prefix: string, label: string, c: ConnectorType, s: SignalType, d: PortDirection = 'io'): Port[] => [
  port(`${prefix}A`, `${label} A`, c, s, d),
  port(`${prefix}B`, `${label} B`, c, s, d),
]
export const dante = () => [port('pri', 'Dante primaire', 'ethercon', NET, 'io'), port('sec', 'Dante secondaire', 'ethercon', NET, 'io')]
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

export function dev(
  id: string,
  brand: string,
  model: string,
  category: Category,
  spec: { u?: number; kg?: number },
  ports: Port[],
): DeviceTemplate {
  return { id, brand, model, category, rackU: spec.u, weight: spec.kg, ports }
}

/** Tags each model of a list with its family. */
export const family = (name: string, list: DeviceTemplate[]) => list.map((t) => ({ ...t, family: name }))
