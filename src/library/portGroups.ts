import type { ConnectorType, Port, PortDirection, SignalType } from '../types.ts'

/** A run of identical ports, e.g. "In" × 16 XLR inputs. */
export interface PortGroup {
  prefix: string
  count: number
  connector: ConnectorType
  signal: SignalType
  dir: PortDirection
}

/** Turns groups into ports: "In" × 3 → In 1, In 2, In 3. */
export function expandGroups(groups: PortGroup[]): Port[] {
  return groups.flatMap((g, gi) => {
    const n = Math.max(0, Math.min(256, Math.round(g.count)))
    const prefix = g.prefix.trim() || 'Port'
    return Array.from({ length: n }, (_, i) => ({
      id: `g${gi + 1}-${i + 1}`,
      label: n === 1 ? prefix : `${prefix} ${i + 1}`,
      connector: g.connector,
      signal: g.signal,
      dir: g.dir,
    }))
  })
}

/** Inverse of expandGroups, for editing an existing model. */
export function groupPorts(ports: Port[]): PortGroup[] {
  const groups: PortGroup[] = []
  let current: (PortGroup & { next: number }) | undefined
  for (const p of ports) {
    const m = p.label.match(/^(.*?)\s*(\d+)$/)
    const stem = m ? m[1] : p.label
    const n = m ? Number(m[2]) : 0
    const same =
      current &&
      m &&
      current.prefix === stem &&
      current.connector === p.connector &&
      current.signal === p.signal &&
      current.dir === p.dir &&
      n === current.next
    if (same) {
      current!.count++
      current!.next++
      continue
    }
    if (current) groups.push(strip(current))
    current = m && n === 1
      ? { prefix: stem, count: 1, connector: p.connector, signal: p.signal, dir: p.dir, next: 2 }
      : { prefix: p.label, count: 1, connector: p.connector, signal: p.signal, dir: p.dir, next: -1 }
  }
  if (current) groups.push(strip(current))
  return groups
}

function strip({ prefix, count, connector, signal, dir }: PortGroup & { next: number }): PortGroup {
  return { prefix, count, connector, signal, dir }
}
