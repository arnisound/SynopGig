import { cableOn, connectPorts } from '../project'
import { sameSignal } from '../data/connectors'
import type { DeviceNode, Port, Project } from '../types'

const complementary = (a: Port, b: Port) =>
  (a.dir === 'out' && b.dir === 'in') || (a.dir === 'in' && b.dir === 'out') || (a.dir === 'io' && b.dir === 'io')

export const compatible = (a: Port, b: Port) => sameSignal(a.signal, b.signal) && complementary(a, b)

/** Ports reachable from inside the rack: a patch panel only exposes its inner face. */
export const insidePorts = (n: DeviceNode) => n.data.ports.filter((p) => p.face !== 'ext')

/**
 * Plugs every free inside port of `nodeId` into the first free compatible
 * port of the other rack members (same connector preferred), in rack order.
 */
export function autoWire(p: Project, nodeId: string, memberIds: string[]): { project: Project; added: number } {
  let project = p
  let added = 0
  const node = project.nodes.find((n) => n.id === nodeId)
  if (!node) return { project, added }
  const members = memberIds
    .filter((id) => id !== nodeId)
    .map((id) => project.nodes.find((n) => n.id === id))
    .filter((n) => n !== undefined)

  for (const port of insidePorts(node)) {
    if (cableOn(project.edges, { node: nodeId, port: port.id })) continue
    const free = members.flatMap((m) =>
      insidePorts(m)
        .filter((q) => compatible(port, q) && !cableOn(project.edges, { node: m.id, port: q.id }))
        .map((q) => ({ m, q })),
    )
    const pick = free.find((c) => c.q.connector === port.connector) ?? free[0]
    if (!pick) continue
    const next = connectPorts(project, { node: nodeId, port: port.id }, { node: pick.m.id, port: pick.q.id })
    if (next) {
      project = next
      added++
    }
  }
  return { project, added }
}
