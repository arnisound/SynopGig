import { portSides } from '../synoptic/portLayout'
import type { DeviceNode, Port, Project } from '../types'

export const HEAD = 40
export const ROW = 15

export interface Box {
  node: DeviceNode
  x: number
  y: number
  w: number
  h: number
  left: Port[]
  right: Port[]
}

export interface SynopticFilter {
  usedOnly: boolean
  nodeIds?: Set<string>
  edgeIds?: Set<string>
}

/** Boxes, cables and drawing bounds of the printed synoptic (drawing units = screen px). */
export function synopticLayout(project: Project, { usedOnly, nodeIds, edgeIds }: SynopticFilter) {
  const nodes = project.nodes.filter((n) => !nodeIds || nodeIds.has(n.id))
  const edges = project.edges.filter((e) => (!edgeIds || edgeIds.has(e.id)) && nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target))
  if (nodes.length === 0) return undefined

  const used = new Set(edges.flatMap((e) => [`${e.source}/${e.sourceHandle}`, `${e.target}/${e.targetHandle}`]))
  const boxes = new Map<string, Box>()
  for (const n of nodes) {
    const visible = usedOnly ? n.data.ports.filter((p) => used.has(`${n.id}/${p.id}`)) : n.data.ports
    const { left, right } = portSides(n.data.ports, visible)
    const w = Math.max(180, n.measured?.width ?? 220)
    boxes.set(n.id, { node: n, x: n.position.x, y: n.position.y, w, h: HEAD + Math.max(left.length, right.length, 1) * ROW + 6, left, right })
  }

  const anchor = (nodeId: string, portId?: string | null) => {
    const b = boxes.get(nodeId)!
    const li = b.left.findIndex((p) => p.id === portId)
    const ri = b.right.findIndex((p) => p.id === portId)
    const onLeft = li >= 0
    const i = onLeft ? li : Math.max(0, ri)
    return { x: onLeft ? b.x : b.x + b.w, y: b.y + HEAD + i * ROW + ROW / 2, dir: onLeft ? -1 : 1 }
  }

  const racks = project.cases
    .filter((c) => c.kind === 'rack')
    .map((c) => ({ c, members: [...boxes.values()].filter((b) => c.devices.includes(b.node.id)) }))
    .filter((r) => r.members.length > 0)

  const all = [...boxes.values()]
  const x0 = Math.min(...all.map((b) => b.x)) - 60
  const y0 = Math.min(...all.map((b) => b.y)) - 70
  // A small drawing keeps a readable scale instead of being blown up to the page.
  const x1 = Math.max(Math.max(...all.map((b) => b.x + b.w)) + 60, x0 + 1400)
  const y1 = Math.max(Math.max(...all.map((b) => b.y + b.h)) + 40, y0 + 500)
  return { edges, boxes, all, racks, anchor, bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }
}

export type Region = { x: number; y: number; w: number; h: number }
