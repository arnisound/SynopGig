import { connectPorts } from '../project'
import type { DeviceData, DeviceNode, Port, Project } from '../types'

/*
 * Tools of the synoptic that save the repetitive part: chaining a row of
 * fixtures (DMX and power through), giving them their DMX addresses one
 * after the other, and laying the whole drawing out by rack and trade.
 */

/** The devices in the order a technician walks them: along the row (left to right), or down a column. */
export function inWalkOrder(nodes: DeviceNode[]): DeviceNode[] {
  const xs = nodes.map((n) => n.position.x)
  const ys = nodes.map((n) => n.position.y)
  const wide = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys)
  return [...nodes].sort((a, b) => (wide ? a.position.x - b.position.x || a.position.y - b.position.y : a.position.y - b.position.y || a.position.x - b.position.x))
}

const THRU = /out|thru|link|recopie|sortie|loop/i
const busy = (p: Project, node: string, port: string) => p.edges.some((e) => (e.source === node && e.sourceHandle === port) || (e.target === node && e.targetHandle === port))

/**
 * Chains the devices in walk order: each one's through output (DMX out,
 * power thru, data out, speaker link) into the next one's matching input.
 */
export function chainDevices(project: Project, ids: string[]): { project: Project; added: number } {
  const order = inWalkOrder(project.nodes.filter((n) => ids.includes(n.id)))
  let p = project
  let added = 0
  for (let i = 1; i < order.length; i++) {
    const [a, b] = [order[i - 1], order[i]]
    // Only signals the first one passes on: it has both an input and a through output of them.
    const passes = (s: Port['signal']) => a.data.ports.some((x) => x.signal === s && x.dir === 'in')
    for (const out of a.data.ports.filter((x) => x.dir === 'out' && THRU.test(x.label) && passes(x.signal))) {
      if (busy(p, a.id, out.id)) continue
      const inn = b.data.ports.find((x) => x.dir === 'in' && x.signal === out.signal && !busy(p, b.id, x.id))
      if (!inn) continue
      const next = connectPorts(p, { node: a.id, port: out.id }, { node: b.id, port: inn.id })
      if (next) {
        p = next
        added++
      }
    }
  }
  return { project: p, added }
}

/** DMX channels a device takes in its mode: "Mode 1 (39 ch)", or its characteristics. */
export function dmxFootprint(d: DeviceData): number | undefined {
  const fromMode = /(\d+)\s*(?:ch|canaux|channels)\b/i.exec(d.config.mode ?? '')
  if (fromMode) return Number(fromMode[1])
  const spec = d.specs?.find((s) => /canaux dmx|dmx channels|nombre de canaux/i.test(s.label))
  const n = spec && /(\d+)/.exec(spec.value)
  return n ? Number(n[1]) : undefined
}

/**
 * Addresses the devices one after the other from `start` in `universe`,
 * going on in the next universe when one would not fit in 512 channels.
 * Devices whose footprint is unknown take `fallback` channels.
 */
export function addressDmx(project: Project, ids: string[], universe: number, start: number, fallback: number): Project {
  const order = inWalkOrder(project.nodes.filter((n) => ids.includes(n.id)))
  let u = universe
  let at = start
  const set = new Map<string, { dmxUniverse: string; dmxAddress: string }>()
  for (const n of order) {
    const size = dmxFootprint(n.data) ?? fallback
    if (at + size - 1 > 512) {
      u++
      at = 1
    }
    set.set(n.id, { dmxUniverse: String(u), dmxAddress: String(at) })
    at += size
  }
  return { ...project, nodes: project.nodes.map((n) => (set.has(n.id) ? { ...n, data: { ...n.data, config: { ...n.data.config, ...set.get(n.id) } } } : n)) }
}

/** DMX problems by device: channels overlapping another device's, or past 512. */
export function dmxIssues(project: Project): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const add = (id: string, m: string) => out.set(id, [...(out.get(id) ?? []), m])
  const placed = project.nodes
    .filter((n) => n.data.config.dmxAddress)
    .map((n) => {
      const a = Number(n.data.config.dmxAddress)
      return { n, u: n.data.config.dmxUniverse || '1', a, b: a + (dmxFootprint(n.data) ?? 1) - 1 }
    })
  for (const x of placed) {
    if (!(x.a >= 1)) add(x.n.id, `adresse DMX ${x.n.data.config.dmxAddress} invalide`)
    else if (x.b > 512) add(x.n.id, `dépasse le canal 512 (finit au ${x.b})`)
    for (const y of placed) if (y !== x && y.u === x.u && x.a <= y.b && y.a <= x.b) add(x.n.id, `chevauche ${y.n.data.name} (univers ${x.u}, ${y.a}-${y.b})`)
  }
  return out
}

const TRADES = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Câblage', 'Autre']

/**
 * Lays the drawing out: each rack's devices together in a block, then one
 * band of columns per trade, devices stacked by zone. `size` gives each
 * device's measured size on screen.
 */
export function autoLayout(project: Project, size: (n: DeviceNode) => { w: number; h: number }): Project {
  const GAP = 60
  const MAX_H = 1600
  const pos = new Map<string, { x: number; y: number }>()
  let x = 0
  const column = (list: DeviceNode[], top: number) => {
    let y = top
    let w = 0
    for (const n of list) {
      if (y > top && y + size(n).h > top + MAX_H) {
        x += w + GAP
        y = top
        w = 0
      }
      pos.set(n.id, { x, y })
      y += size(n).h + GAP / 2
      w = Math.max(w, size(n).w)
    }
    x += w + GAP * 2
  }
  const placed = new Set<string>()
  // Racks first: their devices in rack order, so each frame stays tight.
  for (const c of project.cases.filter((k) => k.kind === 'rack')) {
    const list = project.nodes.filter((n) => c.devices.includes(n.id) && !placed.has(n.id)).sort((a, b) => (c.rackLayout?.[a.id] ?? 99) - (c.rackLayout?.[b.id] ?? 99))
    if (!list.length) continue
    list.forEach((n) => placed.add(n.id))
    column(list, 0)
  }
  // Then the rest, one band per trade, by zone.
  const bandTop = 0
  for (const t of TRADES) {
    const list = project.nodes
      .filter((n) => !placed.has(n.id) && (n.data.category === t || (t === 'Autre' && !TRADES.includes(n.data.category))))
      .sort((a, b) => (a.data.zone ?? '').localeCompare(b.data.zone ?? '', 'fr') || a.data.name.localeCompare(b.data.name, 'fr', { numeric: true }))
    if (!list.length) continue
    list.forEach((n) => placed.add(n.id))
    column(list, bandTop)
  }
  return { ...project, nodes: project.nodes.map((n) => (pos.has(n.id) ? { ...n, position: pos.get(n.id)! } : n)) }
}
