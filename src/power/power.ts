import { SIGNALS } from '../data/connectors'
import { resolveCables } from '../project'
import type { ConnectorType, DeviceData, DeviceNode, Phase, Port, Project } from '../types'

/*
 * The power budget: SynopGig follows the power cables of the synoptic, from
 * each source (a distribution fed by nothing) down to every device, and adds
 * up what each outlet carries. Currents at 230 V, cos φ taken as 1: a safe
 * side estimate for a show's preparation, not an electrician's study.
 */

export const VOLTS = 230

/** Usual generator sizes, kVA. */
const GENERATORS = [20, 30, 45, 60, 80, 100, 150, 200, 250, 350, 500]

/**
 * The generator a show needs: its real power over the power factor gives the
 * apparent power (kVA), plus 25 % margin for inrush and what was forgotten.
 */
export function generatorFor(watts: number, cosPhi = 0.9) {
  const kva = watts / 1000 / cosPhi
  const needed = kva * 1.25
  return { kw: watts / 1000, kva, size: GENERATORS.find((g) => g >= needed) }
}

/** Usual breaker of an outlet, by its socket. */
export const RATING: Partial<Record<ConnectorType, number>> = {
  schuko: 16,
  'p17-16a': 16,
  powercon: 20,
  'powercon-true1': 16,
  iec: 10,
  'p17-32a': 32,
  'p17-32a-mono': 32,
  'p17-16a-tri': 16,
  'p17-63a': 63,
  'p17-125a': 125,
}

/** Three-phase inlets: their outlets are spread on L1, L2, L3. */
// A Socapex carries six circuits spread on the three phases, a motor cable (Harting) a 400 V motor: three-phase lines.
export const THREE_PHASE = new Set<ConnectorType>(['p17-16a-tri', 'p17-32a', 'p17-63a', 'p17-125a', 'socapex', 'harting'])

/** The device's consumption: its own figure, else the one written in its characteristics. */
export function wattsOf(d: DeviceData): number | undefined {
  const one = unitWatts(d)
  return one === undefined ? undefined : one * Math.max(1, Math.round(d.qty ?? 1))
}

/** The consumption of one unit. */
export function unitWatts(d: DeviceData): number | undefined {
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
const SIGNAL_IP = new Set(Object.entries(SIGNALS).filter(([, v]) => v.ip).map(([k]) => k as Port['signal']))
export const outletKey = (nodeId: string, portId: string) => `${nodeId}:${portId}`

export interface Outlet {
  node: DeviceNode
  port: Port
  phase: Phase
  /** A three-phase outlet (its current is that of its most loaded phase). */
  threePhase?: boolean
  /** Current it draws on each phase of its board. */
  perPhase: Record<Phase, number>
  /** Devices plugged in, directly or further down (through their power links). */
  fed: DeviceNode[]
  /** What to list on the outlet: a board fed from it stands for everything it feeds (it has its own budget). */
  shown: DeviceNode[]
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
  /** The board feeding this one, when it is not a supply point. */
  parent?: DeviceNode
}

export interface PowerBudget {
  sources: Source[]
  /** Devices that need power and are fed by nothing. */
  unpowered: DeviceNode[]
  alerts: string[]
  /** The alerts of a whole board (its inlet, its phases), not of one of its outlets. */
  boardAlerts: string[]
  /** Switches powering devices by PoE, and what they give. */
  poe: { switch: DeviceNode; watts: number; devices: DeviceNode[] }[]
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

  // PoE: a device whose network port says PoE, cabled to a switch and fed by nothing else, draws from that switch.
  const isSwitch = (n: DeviceNode) => n.data.ports.filter((p) => SIGNAL_IP.has(p.signal) && p.dir === 'io').length >= 4
  const poeFrom = new Map<string, DeviceNode>()
  for (const c of cables) {
    for (const [dev, port, other] of [[c.from, c.fromPort, c.to], [c.to, c.toPort, c.from]] as const) {
      if (!dev || !port || !other || !/poe/i.test(port.label) || !isSwitch(other) || isSwitch(dev)) continue
      if (needsPower(dev) && !fedBy.has(dev.id)) poeFrom.set(dev.id, other)
    }
  }
  const poeLoad = new Map<string, number>()
  for (const [id, sw] of poeFrom) poeLoad.set(sw.id, (poeLoad.get(sw.id) ?? 0) + (wattsOf(byId.get(id)!.data) ?? 0))
  /** What a device draws from the mains: its own consumption, plus what it gives by PoE. */
  const draw = (n: DeviceNode) => (wattsOf(n.data) ?? 0) + (poeLoad.get(n.id) ?? 0)

  /** Everything downstream of a device, itself included. */
  const below = (n: DeviceNode, seen: Set<string>): DeviceNode[] => {
    if (seen.has(n.id)) return []
    seen.add(n.id)
    return [n, ...outletsOf(n).flatMap((p) => (feeds.get(outletKey(n.id, p.id)) ?? []).flatMap((f) => below(f.to, seen)))]
  }

  const phases = project.power?.phases ?? {}
  const ring: Phase[] = ['L1', 'L2', 'L3']
  const zero = (): Record<Phase, number> => ({ L1: 0, L2: 0, L3: 0 })
  const fedOutlets = (n: DeviceNode) => outletsOf(n).filter((p) => feeds.has(outletKey(n.id, p.id)))
  const inletOf = (n: DeviceNode) => n.data.ports.find((p) => isPower(p) && p.dir === 'in')
  /** A board is three-phase by its inlet; a supply point (no inlet), by its own outlet. */
  const isThree = (n: DeviceNode) => {
    const inlet = inletOf(n)
    return inlet ? THREE_PHASE.has(inlet.connector) : outletsOf(n).some((p) => THREE_PHASE.has(p.connector))
  }
  const supplyRating = (n: DeviceNode) => {
    const inlet = inletOf(n)
    if (inlet) return RATING[inlet.connector]
    const own = outletsOf(n).map((p) => RATING[p.connector] ?? 0)
    return own.length ? Math.max(...own) || undefined : undefined
  }
  const totalWatts = (n: DeviceNode) => below(n, new Set()).reduce((s, d) => s + draw(d), 0)

  /** Current per phase drawn through a three-phase board, from what each of its outlets carries. */
  const boardLoad = new Map<string, Record<Phase, number>>()
  const outletLoad = (n: DeviceNode, port: Port, phase: Phase): Record<Phase, number> => {
    const v = zero()
    for (const f of feeds.get(outletKey(n.id, port.id)) ?? []) {
      if (THREE_PHASE.has(port.connector) && isThree(f.to) && fedOutlets(f.to).length) {
        const sub = loadOf(f.to)
        for (const ph of ring) v[ph] += sub[ph]
      } else if (THREE_PHASE.has(port.connector)) {
        // Single-phase gear on a three-phase line: shared out evenly.
        for (const ph of ring) v[ph] += totalWatts(f.to) / VOLTS / 3
      } else v[phase] += totalWatts(f.to) / VOLTS
    }
    return v
  }
  const phaseOf = (n: DeviceNode, port: Port) => {
    const mono = outletsOf(n).filter((p) => !THREE_PHASE.has(p.connector) && feeds.has(outletKey(n.id, p.id)))
    // Single-phase outlets go round the phases unless the user set one.
    return phases[outletKey(n.id, port.id)] ?? ring[Math.max(0, mono.indexOf(port)) % 3]
  }
  function loadOf(n: DeviceNode): Record<Phase, number> {
    const known = boardLoad.get(n.id)
    if (known) return known
    const v = zero()
    boardLoad.set(n.id, v)
    for (const port of fedOutlets(n)) {
      const o = outletLoad(n, port, isThree(n) ? phaseOf(n, port) : 'L1')
      for (const ph of ring) v[ph] += o[ph]
    }
    return v
  }

  // Every board (a supply point, a cabinet, a distribution) gets its own budget; supply points first, then what they feed.
  // A device passing power on (an amplifier's link output) is not a board: what it feeds counts on its outlet.
  const boards = nodes.filter((n) => !n.data.panel && fedOutlets(n).length > 0 && (n.data.category === 'Énergie' || !inletOf(n) || !fedBy.has(n.id)))
  const order: DeviceNode[] = []
  const visit = (n: DeviceNode) => {
    if (order.includes(n)) return
    order.push(n)
    for (const port of fedOutlets(n)) for (const f of feeds.get(outletKey(n.id, port.id)) ?? []) if (boards.includes(f.to)) visit(f.to)
  }
  boards.filter((n) => !fedBy.has(n.id)).forEach(visit)
  boards.forEach(visit)

  const sources: Source[] = order.map((node) => {
    const threePhase = isThree(node)
    const outlets = fedOutlets(node).map((port): Outlet => {
      const fed = (feeds.get(outletKey(node.id, port.id)) ?? []).flatMap((f) => below(f.to, new Set([node.id])))
      const shown = (feeds.get(outletKey(node.id, port.id)) ?? []).flatMap((f) => (boards.includes(f.to) ? [f.to] : below(f.to, new Set([node.id]))))
      const watts = fed.reduce((s, d) => s + draw(d), 0)
      const rating = RATING[port.connector]
      const phase = threePhase ? phaseOf(node, port) : 'L1'
      const three = THREE_PHASE.has(port.connector)
      // A three-phase outlet is rated per phase: its most loaded one counts.
      const perPhase = outletLoad(node, port, phase)
      const amps = three ? Math.max(...Object.values(perPhase)) : watts / VOLTS
      return {
        node,
        port,
        phase,
        threePhase: three,
        perPhase,
        fed,
        shown,
        watts,
        unknown: fed.filter((d) => wattsOf(d.data) === undefined && needsPower(d) && d.data.category !== 'Énergie'),
        amps,
        rating,
        load: rating ? amps / rating : undefined,
      }
    })
    const perPhase = threePhase ? loadOf(node) : { L1: outlets.reduce((s, o) => s + o.amps, 0), L2: 0, L3: 0 }
    const currents = Object.values(perPhase)
    const top = Math.max(...currents)
    const parent = fedBy.get(node.id)
    return {
      node,
      threePhase,
      outlets,
      watts: outlets.reduce((s, o) => s + o.watts, 0),
      phases: perPhase,
      imbalance: threePhase && top > 0 ? (top - Math.min(...currents)) / top : undefined,
      inletRating: supplyRating(node),
      ...(parent ? { parent } : {}),
    }
  })

  const unpowered = nodes.filter((n) => needsPower(n) && !fedBy.has(n.id) && !poeFrom.has(n.id) && !sources.some((s) => s.node.id === n.id))
  const poe = [...poeLoad].map(([id, watts]) => ({ switch: byId.get(id)!, watts, devices: [...poeFrom].filter(([, sw]) => sw.id === id).map(([d]) => byId.get(d)!) }))
  const alerts: string[] = []
  const boardAlerts: string[] = []
  for (const s of sources) {
    for (const o of s.outlets) {
      if (o.load !== undefined && o.load > 1) alerts.push(`${s.node.data.name} · ${o.port.label} : ${o.amps.toFixed(1)} A pour un départ de ${o.rating} A, surcharge`)
      else if (o.load !== undefined && o.load > 0.8) alerts.push(`${s.node.data.name} · ${o.port.label} : ${Math.round(o.load * 100)} % du départ, peu de marge`)
    }
    const worst = Math.max(...Object.values(s.phases))
    if (s.inletRating && worst > s.inletRating) boardAlerts.push(`${s.node.data.name} : ${worst.toFixed(1)} A ${s.threePhase ? 'sur une phase ' : ''}pour une arrivée de ${s.inletRating} A`)
    // Balance is the job of the cabinets and supply points (P17 tri), not of a Socapex breakout.
    const balanced = !inletOf(s.node) || inletOf(s.node)!.connector !== 'socapex'
    if (balanced && s.imbalance !== undefined && s.imbalance > 0.3 && worst > 5) boardAlerts.push(`${s.node.data.name} : phases déséquilibrées (${Math.round(s.imbalance * 100)} %), répartissez les départs`)
  }
  for (const p of poe) if (!/poe/i.test(p.switch.data.model)) alerts.push(`${p.switch.data.name} alimente ${p.devices.map((d) => d.data.name).join(', ')} par PoE : vérifiez que ce switch fournit du PoE (${Math.round(p.watts)} W)`)
  return { sources, unpowered, alerts: [...boardAlerts, ...alerts], boardAlerts, poe }
}

/**
 * Spreads the single-phase outlets of every three-phase board on L1, L2, L3
 * so the phases carry the same current: the heaviest outlet first, on the
 * least loaded phase. Boards are balanced from the bottom up, so a cabinet
 * sees what its distributions really draw.
 */
export function balancePhases(project: Project): Record<string, Phase> {
  const phases: Record<string, Phase> = { ...project.power?.phases }
  const boards = powerBudget(project).sources.filter((s) => s.threePhase).reverse()
  for (const board of boards) {
    const b = powerBudget({ ...project, power: { ...project.power, phases } })
    const s = b.sources.find((x) => x.node.id === board.node.id)
    if (!s) continue
    const load: Record<Phase, number> = { L1: 0, L2: 0, L3: 0 }
    for (const o of s.outlets.filter((x) => x.threePhase)) for (const ph of ['L1', 'L2', 'L3'] as Phase[]) load[ph] += o.perPhase[ph]
    for (const o of s.outlets.filter((x) => !x.threePhase).sort((x, y) => y.amps - x.amps)) {
      const ph = (['L1', 'L2', 'L3'] as Phase[]).reduce((m, p) => (load[p] < load[m] ? p : m), 'L1')
      phases[outletKey(s.node.id, o.port.id)] = ph
      load[ph] += o.amps
    }
  }
  return phases
}
