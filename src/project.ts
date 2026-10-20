import { checkLink, type Issue } from './data/connectors'
import { LIBRARY } from './data/library'
import { panelPorts } from './data/panels'
import type {
  Banner,
  CableEdge,
  DeviceNode,
  DeviceTemplate,
  FlightCase,
  PanelSpec,
  Port,
  Project,
} from './types'

const STORAGE_KEY = 'synopgig.project'

export const uid = () => Math.random().toString(36).slice(2, 10)

export function createDevice(
  template: DeviceTemplate,
  position: { x: number; y: number },
  existing: DeviceNode[],
  zone = 'Plateau',
): DeviceNode {
  const sameModel = existing.filter((n) => n.data.templateId === template.id).length
  const base = template.panel ? 'Bandeau' : template.model
  return {
    id: `d-${uid()}`,
    type: 'device',
    position,
    data: {
      templateId: template.id,
      model: template.model,
      category: template.category,
      name: `${base} ${sameModel + 1}`,
      zone,
      rackU: template.rackU,
      weight: template.weight,
      ports: structuredClone(template.ports),
      config: {},
      brand: template.brand,
      panel: template.panel && structuredClone(template.panel),
    },
  }
}

export function nextCableId(edges: CableEdge[]) {
  const max = edges.reduce((m, e) => {
    const n = Number(e.data?.cableId?.replace(/\D/g, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `C${String(max + 1).padStart(3, '0')}`
}

export interface PortRef {
  node: string
  port: string
}

const onPort = (e: CableEdge, r: PortRef) =>
  (e.source === r.node && e.sourceHandle === r.port) || (e.target === r.node && e.targetHandle === r.port)

export function findPort(nodes: DeviceNode[], r: PortRef) {
  return nodes.find((n) => n.id === r.node)?.data.ports.find((p) => p.id === r.port)
}

export function cableOn(edges: CableEdge[], r: PortRef) {
  return edges.find((e) => onPort(e, r))
}

/** The far end of the cable plugged into a port. */
export function otherEnd(e: CableEdge, r: PortRef): PortRef {
  return e.source === r.node && e.sourceHandle === r.port
    ? { node: e.target, port: e.targetHandle ?? '' }
    : { node: e.source, port: e.sourceHandle ?? '' }
}

/**
 * Plugs a cable between two ports, stored in signal direction (output → input).
 * Returns null when a port is already used, unless `replace` unplugs it first.
 */
export function connectPorts(p: Project, a: PortRef, b: PortRef, replace = false): Project | null {
  if (a.node === b.node && a.port === b.port) return null
  const busy = p.edges.some((e) => onPort(e, a) || onPort(e, b))
  if (busy && !replace) return null
  const pa = findPort(p.nodes, a)
  const pb = findPort(p.nodes, b)
  const [src, tgt] = pa?.dir === 'in' && pb?.dir !== 'in' ? [b, a] : [a, b]
  const edges = p.edges.filter((e) => !onPort(e, a) && !onPort(e, b))
  const edge: CableEdge = {
    id: `e-${uid()}`,
    source: src.node,
    sourceHandle: src.port,
    target: tgt.node,
    targetHandle: tgt.port,
    data: { cableId: nextCableId(p.edges) },
  }
  return { ...p, edges: [...edges, edge] }
}

export function unplug(p: Project, r: PortRef): Project {
  return { ...p, edges: p.edges.filter((e) => !onPort(e, r)) }
}

/**
 * Follows a signal through patch panels: from a panel port, returns the
 * equipment reached on the other face of the hole.
 */
export function throughPanels(nodes: DeviceNode[], edges: CableEdge[], start: PortRef): { node: DeviceNode; port: Port } | undefined {
  let r = start
  for (let hops = 0; hops < 8; hops++) {
    const port = findPort(nodes, r)
    if (!port?.pair) return undefined
    const e = cableOn(edges, { node: r.node, port: port.pair })
    if (!e) return undefined
    const next = otherEnd(e, { node: r.node, port: port.pair })
    const node = nodes.find((n) => n.id === next.node)
    const nextPort = findPort(nodes, next)
    if (!node || !nextPort) return undefined
    if (!nextPort.pair) return { node, port: nextPort }
    r = next
  }
  return undefined
}

/** Replaces a panel layout and drops cables plugged into removed holes. */
export function setPanel(p: Project, nodeId: string, panel: PanelSpec): Project {
  const ports = panelPorts(panel)
  const ids = new Set(ports.map((x) => x.id))
  const alive = (n: string, h?: string | null) => n !== nodeId || (h != null && ids.has(h))
  return {
    ...p,
    nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, panel, ports, rackU: panel.heightU } } : n)),
    edges: p.edges.filter((e) => alive(e.source, e.sourceHandle) && alive(e.target, e.targetHandle)),
  }
}

/** Rack each device is mounted in. */
export function rackOfNode(cases: FlightCase[]) {
  const m = new Map<string, FlightCase>()
  for (const c of cases) if (c.kind === 'rack') for (const d of c.devices) m.set(d, c)
  return m
}

/** Name of the rack holding both ends of a cable, if the cable stays inside it. */
export function internalRack(racks: Map<string, FlightCase>, e: CableEdge) {
  const a = racks.get(e.source)
  return a && a === racks.get(e.target) ? a : undefined
}

export interface ResolvedCable {
  edge: CableEdge
  from: DeviceNode | undefined
  to: DeviceNode | undefined
  fromPort: Port | undefined
  toPort: Port | undefined
  issues: Issue[]
}

export function resolveCables(nodes: DeviceNode[], edges: CableEdge[]): ResolvedCable[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return edges
    .map((edge) => {
      const from = byId.get(edge.source)
      const to = byId.get(edge.target)
      const fromPort = from?.data.ports.find((p) => p.id === edge.sourceHandle)
      const toPort = to?.data.ports.find((p) => p.id === edge.targetHandle)
      return { edge, from, to, fromPort, toPort, issues: checkLink(fromPort, toPort) }
    })
    .sort((a, b) => (a.edge.data?.cableId ?? '').localeCompare(b.edge.data?.cableId ?? ''))
}

export const DEFAULT_BANNER: Banner = {
  title: 'SON',
  subtitle: 'FOH',
  bg: '#e5484d',
  fg: '#ffffff',
  font: 'Impact, "Arial Black", sans-serif',
}

export function createCase(cases: FlightCase[]): FlightCase {
  return {
    id: `fc-${uid()}`,
    number: String(cases.length + 1).padStart(2, '0'),
    name: 'Nouveau flight case',
    kind: 'rack',
    rackU: 6,
    width: 60,
    height: 45,
    depth: 60,
    shell: '#1c1c1f',
    wheels: false,
    handles: 2,
    banner: { ...DEFAULT_BANNER },
    devices: [],
    extras: '',
  }
}

function tpl(id: string) {
  const t = LIBRARY.find((x) => x.id === id)
  if (!t) throw new Error(`Modèle inconnu : ${id}`)
  return t
}

/** A small concert setup so the app never opens on an empty page. */
export function demoProject(): Project {
  const nodes: DeviceNode[] = []
  const add = (id: string, x: number, y: number, zone: string, name?: string) => {
    const n = createDevice(tpl(id), { x, y }, nodes, zone)
    if (name) n.data.name = name
    nodes.push(n)
    return n
  }
  // Stage rack: patch panel wired inside to the stagebox, switch and power.
  const mic = add('shure-sm58', 0, 0, 'Plateau', 'Micro chant lead')
  const di = add('radial-j48', 0, 140, 'Plateau', 'DI clavier')
  const panel = add('panel-stage-1u', 300, 0, 'Plateau', 'Bandeau rack plateau')
  const sb = add('yam-rio1608', 650, 0, 'Plateau', 'Stagebox plateau')
  const sw = add('luminex-gc10', 1000, 0, 'Plateau', 'Switch plateau')
  const pwr = add('rack-power-1u', 1000, 420, 'Plateau', 'Distribution rack')
  const desk = add('yam-ql1', 1400, 0, 'Régie FOH', 'Console FOH')
  sb.data.config = { ip: '192.168.1.20', notes: 'Gain préampli contrôlé depuis la console FOH. ID Rio : 1.' }
  sw.data.config = { ip: '192.168.1.2', mode: 'Profil Dante + Art-Net' }
  desk.data.config = {
    ip: '192.168.1.10',
    notes: 'Charger la show file « Tournée 2026 ». Vérifier l’horloge Dante : console = leader.',
  }
  const amp = add('db-d20', 1400, 620, 'Façade', 'Ampli façade')
  const l = add('db-y10p', 1750, 600, 'Façade', 'Façade jardin')
  const r = add('db-y10p', 1750, 720, 'Façade', 'Façade cour')
  amp.data.config = { ip: '192.168.1.30', mode: 'Preset Y10P, sortie A/B' }
  const ld = add('ma3-compact-xt', 0, 1050, 'Régie FOH', 'Console lumière')
  const spot = add('robe-megapointe', 350, 1050, 'Grill', 'MegaPointe jardin')
  spot.data.config = { dmxUniverse: '1', dmxAddress: '1', mode: 'Mode 1 (39 ch)' }
  const wash = add('martin-aura-xb', 700, 1050, 'Grill', 'Aura contre 1')
  wash.data.config = { dmxUniverse: '1', dmxAddress: '41', mode: 'Extended (25 ch)' }

  const edges: CableEdge[] = []
  const link = (a: DeviceNode, ap: string, b: DeviceNode, bp: string, length?: number) => {
    edges.push({
      id: `e-${uid()}`,
      source: a.id,
      sourceHandle: ap,
      target: b.id,
      targetHandle: bp,
      data: { cableId: nextCableId(edges), length },
    })
  }
  // Inside the rack (wired in the workshop)
  for (let i = 1; i <= 8; i++) link(panel, `h${i}-int`, sb, `in${i}`, 0.5)
  for (let i = 1; i <= 4; i++) link(sb, `out${i}`, panel, `h${8 + i}-int`, 0.5)
  link(sb, 'pri', sw, 'p1', 0.5)
  link(sw, 'p2', panel, 'h13-int', 0.5)
  link(panel, 'h15-int', pwr, 'in', 0.5)
  link(pwr, 'out1', sw, 'pwr', 0.5)
  link(pwr, 'iec1', sb, 'pwr', 0.5)
  // On site
  link(mic, 'out', panel, 'h1-ext', 10)
  link(di, 'out', panel, 'h2-ext', 5)
  link(panel, 'h13-ext', desk, 'pri', 50)
  link(panel, 'h9-ext', amp, 'in1', 30)
  link(panel, 'h10-ext', amp, 'in2', 30)
  link(amp, 'hp1', l, 'in', 15)
  link(amp, 'hp2', r, 'in', 15)
  link(ld, 'dmx1', spot, 'dmxIn', 40)
  link(spot, 'dmxOut', wash, 'dmxIn', 10)

  const rack = createCase([])
  rack.name = 'Rack plateau'
  rack.rackU = 8
  rack.devices = [panel.id, sb.id, sw.id, pwr.id]
  rack.rackLayout = { [panel.id]: 1, [sb.id]: 2, [sw.id]: 6, [pwr.id]: 8 }
  rack.extras = 'Câbles XLR 10 m × 8\nCâble etherCON 50 m'
  rack.banner = { ...DEFAULT_BANNER, title: 'SON', subtitle: 'RACK PLATEAU' }
  const lumi = createCase([rack])
  lumi.name = 'Malle câbles lumière'
  lumi.kind = 'malle'
  lumi.wheels = true
  lumi.width = 100
  lumi.height = 60
  lumi.depth = 60
  lumi.extras = 'DMX 5 pts 10 m × 10\npowerCON TRUE1 5 m × 10'
  lumi.banner = { ...DEFAULT_BANNER, title: 'LUMIÈRE', subtitle: 'CÂBLES', bg: '#46a758' }

  return {
    version: 1,
    name: 'Concert démo',
    venue: 'Salle des fêtes',
    date: new Date().toISOString().slice(0, 10),
    nodes,
    edges,
    cases: [rack, lumi],
    progress: {},
    customTemplates: [],
  }
}

export function emptyProject(): Project {
  return {
    version: 1,
    name: 'Nouveau projet',
    venue: '',
    date: new Date().toISOString().slice(0, 10),
    nodes: [],
    edges: [],
    cases: [],
    progress: {},
    customTemplates: [],
  }
}

export function loadProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return parseProject(raw)
  } catch {
    // Unreadable storage: start from the demo.
  }
  return demoProject()
}

export function clearSavedProject() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored or storage blocked.
  }
}

export function saveProject(p: Project) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // Storage full or blocked: the JSON export still works.
  }
}

export function parseProject(raw: string): Project {
  const p = JSON.parse(raw) as Project
  if (p.version !== 1 || !Array.isArray(p.nodes) || !Array.isArray(p.edges)) {
    throw new Error('Fichier projet invalide')
  }
  return { ...emptyProject(), ...p }
}

export function download(filename: string, content: string | Blob, type = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function toCsv(rows: (string | number | undefined)[][]) {
  return (
    '﻿' +
    rows
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n')
  )
}

export function slug(s: string) {
  return s.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'projet'
}
