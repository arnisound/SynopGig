import type { CableEdge, DeviceNode, Project } from '../types'

/*
 * What changed between two versions of a project, in words a technician
 * reads at a glance: devices added, removed, renamed or moved, cables
 * added, removed, replugged or resized, addresses changed.
 */

const portName = (nodes: Map<string, DeviceNode>, nodeId: string, portId?: string | null) => {
  const n = nodes.get(nodeId)
  return `${n?.data.name ?? '?'} [${n?.data.ports.find((p) => p.id === portId)?.label ?? '?'}]`
}
const route = (nodes: Map<string, DeviceNode>, e: CableEdge) => `${portName(nodes, e.source, e.sourceHandle)} → ${portName(nodes, e.target, e.targetHandle)}`
const dmx = (n: DeviceNode) => (n.data.config.dmxAddress ? `${n.data.config.dmxUniverse || 1}.${n.data.config.dmxAddress}` : '')

export function projectChanges(before: Project, after: Project): string[] {
  const out: string[] = []
  const was = new Map(before.nodes.map((n) => [n.id, n]))
  const now = new Map(after.nodes.map((n) => [n.id, n]))

  for (const n of after.nodes) {
    const o = was.get(n.id)
    if (!o) {
      out.push(`Équipement ajouté : ${n.data.name} (${n.data.model})`)
      continue
    }
    const name = n.data.name
    if (o.data.name !== name) out.push(`Équipement renommé : ${o.data.name} → ${name}`)
    if (o.data.model !== n.data.model) out.push(`${name} : ${o.data.model} remplacé par ${n.data.model}`)
    if ((o.data.zone ?? '') !== (n.data.zone ?? '')) out.push(`${name} : zone ${o.data.zone || '—'} → ${n.data.zone || '—'}`)
    if ((o.data.config.ip ?? '') !== (n.data.config.ip ?? '')) out.push(`${name} : IP ${o.data.config.ip || '—'} → ${n.data.config.ip || '—'}`)
    if (dmx(o) !== dmx(n)) out.push(`${name} : DMX ${dmx(o) || '—'} → ${dmx(n) || '—'}`)
    if ((o.data.config.mode ?? '') !== (n.data.config.mode ?? '')) out.push(`${name} : mode ${o.data.config.mode || '—'} → ${n.data.config.mode || '—'}`)
  }
  for (const o of before.nodes) if (!now.has(o.id)) out.push(`Équipement retiré : ${o.data.name}`)

  const oldEdges = new Map(before.edges.map((e) => [e.id, e]))
  const newIds = new Set(after.edges.map((e) => e.id))
  for (const e of after.edges) {
    const id = e.data?.cableId || '?'
    const o = oldEdges.get(e.id)
    if (!o) {
      out.push(`Câble ${id} ajouté : ${route(now, e)}`)
      continue
    }
    const plug = (x: CableEdge) => `${x.source}/${x.sourceHandle}>${x.target}/${x.targetHandle}`
    if (plug(o) !== plug(e)) out.push(`Câble ${id} rebranché : ${route(now, e)} (avant : ${route(was, o)})`)
    else if ((o.data?.cableId || '?') !== id) out.push(`Câble ${o.data?.cableId || '?'} renommé ${id}`)
    if ((o.data?.length ?? 0) !== (e.data?.length ?? 0)) out.push(`Câble ${id} : ${o.data?.length ?? '—'} m → ${e.data?.length ?? '—'} m`)
  }
  for (const o of before.edges) if (!newIds.has(o.id)) out.push(`Câble ${o.data?.cableId || '?'} retiré : ${route(was, o)}`)

  const oldCases = new Map(before.cases.map((c) => [c.id, c]))
  const newCases = new Set(after.cases.map((c) => c.id))
  for (const c of after.cases) if (!oldCases.has(c.id)) out.push(`Flight case ajouté : ${c.name}`)
  for (const c of before.cases) if (!newCases.has(c.id)) out.push(`Flight case retiré : ${c.name}`)
  return out
}
