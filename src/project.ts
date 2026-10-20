import { checkLink, type Issue } from './data/connectors'
import { LIBRARY } from './data/library'
import type {
  Banner,
  CableEdge,
  DeviceNode,
  DeviceTemplate,
  FlightCase,
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
  return {
    id: `d-${uid()}`,
    type: 'device',
    position,
    data: {
      templateId: template.id,
      model: template.model,
      category: template.category,
      name: `${template.model} ${sameModel + 1}`,
      zone,
      rackU: template.rackU,
      weight: template.weight,
      ports: structuredClone(template.ports),
      config: {},
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
  const mic = add('mic', 0, 0, 'Plateau', 'Micro chant lead')
  const di = add('di', 0, 140, 'Plateau', 'DI clavier')
  const sb = add('stagebox-16-8', 300, 0, 'Plateau', 'Stagebox plateau')
  const sw = add('switch-8', 650, 60, 'Régie FOH', 'Switch Dante FOH')
  const desk = add('console-num', 950, 0, 'Régie FOH', 'Console FOH')
  sb.data.config = { ip: '192.168.1.20', notes: 'Gain préampli contrôlé depuis la console FOH.' }
  desk.data.config = {
    ip: '192.168.1.10',
    notes: 'Charger la show file « Tournée 2026 ». Vérifier l’horloge Dante : console = leader.',
  }
  const amp = add('amp-4ch', 650, 420, 'Façade', 'Ampli façade')
  const l = add('speaker-passive', 1300, 380, 'Façade', 'Façade gauche')
  const r = add('speaker-passive', 1300, 500, 'Façade', 'Façade droite')
  amp.data.config = { ip: '192.168.1.30', mode: 'Preset façade 2 voies' }
  const ld = add('light-desk', 0, 700, 'Régie FOH', 'Console lumière')
  const spot = add('spot-lyre', 300, 700, 'Grill', 'Lyre jardin')
  spot.data.config = { dmxUniverse: '1', dmxAddress: '1', mode: '16 canaux' }
  const par = add('par-led', 650, 700, 'Grill', 'PAR contre 1')
  par.data.config = { dmxUniverse: '1', dmxAddress: '17', mode: '8 canaux' }

  const edges: CableEdge[] = []
  const link = (a: DeviceNode, ap: string, b: DeviceNode, bp: string, length?: number) => {
    edges.push({
      id: `e-${uid()}`,
      source: a.id,
      sourceHandle: ap,
      target: b.id,
      targetHandle: bp,
      type: 'cable',
      data: { cableId: nextCableId(edges), length },
    })
  }
  link(mic, 'out', sb, 'in1', 10)
  link(di, 'out', sb, 'in2', 5)
  link(sb, 'pri', sw, 'p1', 50)
  link(desk, 'pri', sw, 'p2', 2)
  link(sb, 'out1', amp, 'in1', 30)
  link(sb, 'out2', amp, 'in2', 30)
  link(amp, 'hp1', l, 'in', 15)
  link(amp, 'hp2', r, 'in', 15)
  link(ld, 'dmxA', spot, 'dmxIn', 40)
  link(spot, 'dmxOut', par, 'dmxIn', 10)

  const rack = createCase([])
  rack.name = 'Rack plateau'
  rack.rackU = 6
  rack.devices = [sb.id, sw.id]
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
