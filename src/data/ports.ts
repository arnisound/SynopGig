import type { ConnectorType, Port, PortDirection, SignalType } from '../types'

export function series(
  prefix: string,
  label: string,
  count: number,
  connector: ConnectorType,
  signal: SignalType,
  dir: PortDirection,
): Port[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    label: `${label} ${i + 1}`,
    connector,
    signal,
    dir,
  }))
}

export function port(
  id: string,
  label: string,
  connector: ConnectorType,
  signal: SignalType,
  dir: PortDirection,
): Port {
  return { id, label, connector, signal, dir }
}
