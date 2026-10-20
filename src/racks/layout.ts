import type { DeviceNode, FlightCase } from '../types'

export interface Mounted {
  node: DeviceNode
  /** Top rack unit, 1 = top of the rack. */
  top: number
  height: number
}

function overlaps(a: { top: number; height: number }, b: { top: number; height: number }) {
  return a.top < b.top + b.height && b.top < a.top + a.height
}

/**
 * Resolves where each rackable device of a case sits. Devices without a saved
 * position take the first free slot, so the rack never shows two devices on
 * the same unit; what does not fit is returned in `overflow`.
 */
export function mountRack(fc: FlightCase, nodes: DeviceNode[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const members = fc.devices.map((id) => byId.get(id)).filter((n) => n !== undefined)
  const rackable = members.filter((n) => (n.data.rackU ?? 0) > 0)
  const loose = members.filter((n) => !((n.data.rackU ?? 0) > 0))
  const mounted: Mounted[] = []
  const overflow: DeviceNode[] = []
  const fits = (m: { top: number; height: number }) =>
    m.top >= 1 && m.top + m.height - 1 <= fc.rackU && !mounted.some((x) => overlaps(x, m))

  const placed = rackable.filter((n) => fc.rackLayout?.[n.id] != null)
  const unplaced = rackable.filter((n) => fc.rackLayout?.[n.id] == null)
  for (const node of placed) {
    const m = { node, top: fc.rackLayout![node.id], height: node.data.rackU! }
    if (fits(m)) mounted.push(m)
    else unplaced.push(node)
  }
  for (const node of unplaced) {
    const top = firstFree(fc.rackU, mounted, node.data.rackU!)
    if (top == null) overflow.push(node)
    else mounted.push({ node, top, height: node.data.rackU! })
  }
  mounted.sort((a, b) => a.top - b.top)
  const usedU = mounted.reduce((s, m) => s + m.height, 0)
  return { mounted, overflow, loose, usedU }
}

export function firstFree(rackU: number, mounted: { top: number; height: number; node?: { id: string } }[], height: number, ignore?: string) {
  const others = mounted.filter((m) => m.node?.id !== ignore)
  for (let top = 1; top + height - 1 <= rackU; top++) {
    if (!others.some((m) => overlaps(m, { top, height }))) return top
  }
  return undefined
}

export function canPlace(rackU: number, mounted: Mounted[], nodeId: string, top: number, height: number) {
  if (top < 1 || top + height - 1 > rackU) return false
  return !mounted.some((m) => m.node.id !== nodeId && overlaps(m, { top, height }))
}
