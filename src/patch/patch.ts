import { LIBRARY } from '../data/library'
import { cableOn, findPort, otherEnd, throughPanels, type PortRef } from '../project'
import type { DeviceNode, PatchEdit, Port, Project } from '../types'

/** One line of the input list (or of the output list). */
export interface PatchRow {
  /** `node/port` of the console or stagebox socket: where edits are kept. */
  key: string
  channel: string
  name: string
  /** Source (inputs) or destination (outputs) device and port. */
  far?: { node: DeviceNode; port: Port }
  /** Console or stagebox socket. */
  at: { node: DeviceNode; port: Port }
  stand: string
  phantom: boolean
  note: string
}

const ENDPOINT_FAMILIES = new Set(['Consoles', 'Stageboxes & moteurs'])

/** Consoles and stageboxes: where the input and output lists are read. */
export function isEndpoint(n: DeviceNode, familyOf: (templateId: string) => string | undefined) {
  if (n.data.panel) return false
  if (ENDPOINT_FAMILIES.has(familyOf(n.data.templateId) ?? '')) return true
  // Custom models without a family: a sound device with many line inputs.
  return n.data.category === 'Son' && n.data.ports.filter((p) => p.dir === 'in' && p.signal === 'audio-analog').length >= 8
}

export function familyLookup(project: Project) {
  const m = new Map([...LIBRARY, ...project.customTemplates].map((t) => [t.id, t.family]))
  return (id: string) => m.get(id)
}

/** The device at the other end of the cable on a port, through any patch panels. */
export function farEnd(project: Project, r: PortRef): { node: DeviceNode; port: Port } | undefined {
  const e = cableOn(project.edges, r)
  if (!e) return undefined
  const o = otherEnd(e, r)
  const node = project.nodes.find((n) => n.id === o.node)
  const port = findPort(project.nodes, o)
  if (!node || !port) return undefined
  return port.pair ? throughPanels(project.nodes, project.edges, o) : { node, port }
}

const label = (d?: { node: DeviceNode; port: Port }) => (d ? `${d.node.data.name} [${d.port.label}]` : '')

/**
 * Input list (every plugged line input of the consoles and stageboxes, with
 * its source) and output list (every plugged line output, with what it feeds).
 * Lines follow the synoptic; channel numbers, names, stands, 48 V and notes
 * edited by the user are kept by socket.
 */
export function buildPatch(project: Project): { inputs: PatchRow[]; outputs: PatchRow[] } {
  const familyOf = familyLookup(project)
  const endpoints = project.nodes
    .filter((n) => isEndpoint(n, familyOf))
    // Stageboxes first (the stage), then the consoles; left to right on the synoptic.
    .sort((a, b) => Number(familyOf(b.data.templateId) === 'Stageboxes & moteurs') - Number(familyOf(a.data.templateId) === 'Stageboxes & moteurs') || a.position.x - b.position.x)
  const endpointIds = new Set(endpoints.map((n) => n.id))

  const rows = (dir: 'in' | 'out', edits: Record<string, PatchEdit> = {}) => {
    const out: PatchRow[] = []
    for (const node of endpoints) {
      for (const port of node.data.ports) {
        if (port.dir !== dir || port.signal !== 'audio-analog') continue
        const far = farEnd(project, { node: node.id, port: port.id })
        // A socket fed by another console or stagebox is a re-patch, not a source.
        if (!far || endpointIds.has(far.node.id)) continue
        const key = `${node.id}/${port.id}`
        const e = edits[key] ?? {}
        out.push({
          key,
          channel: e.channel ?? String(out.length + 1),
          name: e.name ?? far.node.data.name,
          far,
          at: { node, port },
          stand: e.stand ?? '',
          phantom: e.phantom ?? false,
          note: e.note ?? '',
        })
      }
    }
    return out
  }
  return { inputs: rows('in', project.patch?.inputs), outputs: rows('out', project.patch?.outputs) }
}

/** Channel number of each source device, for the stage plot. */
export function channelsBySource(project: Project) {
  const m = new Map<string, string[]>()
  for (const r of buildPatch(project).inputs) if (r.far) m.set(r.far.node.id, [...(m.get(r.far.node.id) ?? []), r.channel])
  return m
}

export const patchLabel = label
