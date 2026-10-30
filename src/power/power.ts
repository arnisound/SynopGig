import { resolveCables } from '../project'
import type { ConnectorType, DeviceData, DeviceNode, Phase, Port, Project } from '../types'

/*
 * The power budget: SynopGig follows the power cables of the synoptic, from
 * each source (a distribution fed by nothing) down to every device, and adds
 * up what each outlet carries. Currents at 230 V, cos φ taken as 1: a safe
 * side estimate for a show's preparation, not an electrician's study.
 */

export const VOLTS = 230

/** Usual breaker of an outlet, by its socket. */
export const RATING: Partial<Record<ConnectorType, number>> = {
  schuko: 16,
  'p17-16a': 16,
  powercon: 20,
  'powercon-true1': 16,
  iec: 10,
  'p17-32a': 32,
  'p17-32a-mono': 32,
  'p17-63a': 63,
  'p17-125a': 125,
  socapex: 16,
}

/** Three-phase inlets: their outlets are spread on L1, L2, L3. */
const THREE_PHASE = new Set<ConnectorType>(['p17-32a', 'p17-63a', 'p17-125a'])

/** The device's consumption: its own figure, else the one written in its characteristics. */
export function wattsOf(d: DeviceData): number | undefined {
  if (d.watts && d.watts > 0) return d.watts
  for (const s of d.specs ?? []) {
    if (!/consomm|power consumption|puissance (?:consomm|absorb)|input power|leistungsaufnahme/i.test(s.label)) continue
    const m = /(\d+(?:[.,]\d+)?)\s*(k?w)?/i.exec(`${s.value} ${s.unit ?? ''}`)
    if (!m) continue
    const n = Number(m[1].replace(',', '.'))
    if (n > 0) return /kw/i.test(m[2] ?? s.unit ?? '') ? n * 1000 : n
  }
  return undefined
}

const isPower = (p?: Port) => p?.signal === 'power'
export const outletKey = (nodeId: string, portId: string) => `${nodeId}:${portId}`

export interface Outlet {
  node: DeviceNode
  port: Port
  phase: Phase
  /** Devices plugged in, directly or further down (through their power links). */
  fed: DeviceNode[]
  watts: number
  /** Devices fed whose consumption is not known. */
  unknown: DeviceNode[]
  amps: number
  rating?: number
  /** Share of the breaker used, 0 to 1 and more. */
  load?: number
}

export interface Source {
  node: DeviceNode
  threePhase: boolean
  outlets: Outlet[]
  watts: number
  phases: Record<Phase, number>
  /** (max − min) / max of the phase currents, for three-phase sources. */
  imbalance?: number
  inletRating?: number
}

export interface PowerBudget {
  sources: Source[]
  /** Devices that need power and are fed by nothing. */
  unpowered: DeviceNode[]
  alerts: string[]
}

export function powerBudget(project: Project): PowerBudget {
  const { nodes } = project
  // Who feeds whom: a power cable runs from an outlet (out) to an inlet (in).
  // A patch panel only passes the power from one face to the other: it is looked through.
  const cables = resolveCables(nodes, project.edges)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const cableAt = (node: string, port: string, not: unknown) => cables.find((c) => c !== not && ((c.from?.id === node && c.fromPort?.id === port) || (c.to?.id === node && c.toPort?.id === port)))
  /** The real device and port at the far end of a cable, through any patch panels. */
  const farEnd = (c: (typeof cables)[number], fromNode: string): { node: DeviceNode; port: Port } | undefined => {
    let cable = c
    let near = fromNode
    for (let hop = 0; hop < 8; hop++) {
      const [node, port] = cable.from?.id === near ? [cable.to, cable.toPort] : [cable.from, cable.fromPort]
      if (!node || !port) return undefined
      if (!node.data.panel || !port.pair) return { node, port }
      const next = cableAt(node.id, port.pair, cable)
      if (!next) return undefined
      cable = next
      near = node.id
    }
    return undefined
  }
  const feeds = new Map<string, { port: Port; to: DeviceNode }[]>()
  const fedBy = new Map<string, DeviceNode>()
  for (const c of cables) {
    for (const [node, port] of [[c.from, c.fromPort], [c.to, c.toPort]] as const) {
      if (!node || !port || node.data.panel || !isPower(port) || port.dir !== 'out') continue
      const end = farEnd(c, node.id)
      if (!end || end.node.data.panel || !isPower(end.port) || end.port.dir === 'out') continue
      const dst = byId.get(end.node.id)!
      const key = outletKey(node.id, port.id)
      if ((feeds.get(key) ?? []).some((f) => f.to.id === dst.id)) continue
      feeds.set(key, [...(feeds.get(key) ?? []), { port, to: dst }])
      fedBy.set(dst.id, node)
    }
  }
  const outletsOf = (n: DeviceNode) => (n.data.panel ? [] : n.data.ports.filter((p) => isPower(p) && p.dir === 'out'))
  const needsPower = (n: DeviceNode) => !n.data.panel && n.data.ports.some((p) => isPower(p) && p.dir === 'in')

  /** Everything downstream of a device, itself included. */
  const below = (n: DeviceNode, seen: Set<string>): DeviceNode[] => {
    if (seen.has(n.id)) return []
    seen.add(n.id)
    return [n, ...outletsOf(n).flatMap((p) => (feeds.get(outletKey(n.id, p.id)) ?? []).flatMap((f) => below(f.to, seen)))]
  }

  const phases = project.power?.phases ?? {}
  const sources: Source[] = nodes
    .filter((n) => !fedBy.has(n.id) && outletsOf(n).some((p) => feeds.has(outletKey(n.id, p.id))))
    .map((node) => {
      const inlet = node.data.ports.find((p) => isPower(p) && p.dir === 'in')
      const threePhase = !!inlet && THREE_PHASE.has(inlet.connector)
      const ring: Phase[] = ['L1', 'L2', 'L3']
      const outlets = outletsOf(node)
        .filter((port) => feeds.has(outletKey(node.id, port.id)))
        .map((port, i): Outlet => {
          const fed = (feeds.get(outletKey(node.id, port.id)) ?? []).flatMap((f) => below(f.to, new Set([node.id])))
          const watts = fed.reduce((s, d) => s + (wattsOf(d.data) ?? 0), 0)
          const rating = RATING[port.connector]
          const amps = watts / VOLTS
          return {
            node,
            port,
            // Three-phase: the outlets go round the phases unless the user set one.
            phase: threePhase ? (phases[outletKey(node.id, port.id)] ?? ring[i % 3]) : 'L1',
            fed,
            watts,
            unknown: fed.filter((d) => wattsOf(d.data) === undefined && needsPower(d) && d.data.category !== 'Énergie'),
            amps,
            rating,
            load: rating ? amps / rating : undefined,
          }
        })
      const perPhase: Record<Phase, number> = { L1: 0, L2: 0, L3: 0 }
      for (const o of outlets) perPhase[o.phase] += o.amps
      const currents = Object.values(perPhase)
      const top = Math.max(...currents)
      return {
        node,
        threePhase,
        outlets,
        watts: outlets.reduce((s, o) => s + o.watts, 0),
        phases: perPhase,
        imbalance: threePhase && top > 0 ? (top - Math.min(...currents)) / top : undefined,
        inletRating: inlet ? RATING[inlet.connector] : undefined,
      }
    })

  const unpowered = nodes.filter((n) => needsPower(n) && !fedBy.has(n.id) && !sources.some((s) => s.node.id === n.id))
  const alerts: string[] = []
  for (const s of sources) {
    for (const o of s.outlets) {
      if (o.load !== undefined && o.load > 1) alerts.push(`${s.node.data.name} · ${o.port.label} : ${o.amps.toFixed(1)} A pour un départ de ${o.rating} A, surcharge`)
      else if (o.load !== undefined && o.load > 0.8) alerts.push(`${s.node.data.name} · ${o.port.label} : ${Math.round(o.load * 100)} % du départ, peu de marge`)
    }
    const worst = Math.max(...Object.values(s.phases))
    if (s.inletRating && worst > s.inletRating) alerts.push(`${s.node.data.name} : ${worst.toFixed(1)} A sur une phase pour une arrivée de ${s.inletRating} A`)
    if (s.imbalance !== undefined && s.imbalance > 0.3 && worst > 5) alerts.push(`${s.node.data.name} : phases déséquilibrées (${Math.round(s.imbalance * 100)} %), répartissez les départs`)
  }
  return { sources, unpowered, alerts }
}
