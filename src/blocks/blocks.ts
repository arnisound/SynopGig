import { nextCableId, uid } from '../project'
import type { CableEdge, DeviceNode, Project } from '../types'

/*
 * Blocks: a group of devices with the cables between them (a drum kit's
 * mics on their stagebox, a FOH rack), saved once and dropped into any
 * project. Kept in this browser, apart from the projects.
 */

export interface Block {
  id: string
  name: string
  /** Positions relative to the block's top-left corner. */
  nodes: DeviceNode[]
  edges: CableEdge[]
}

const KEY = 'synopgig.blocks'

export function loadBlocks(): Block[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((b) => b && typeof b.name === 'string' && Array.isArray(b.nodes) && Array.isArray(b.edges)) : []
  } catch {
    return []
  }
}

export function saveBlocks(blocks: Block[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(blocks))
  } catch {
    // Storage full or blocked: the blocks stay for this session.
  }
}

/** The selected devices and the cables between them, as a block. */
export function makeBlock(project: Project, ids: string[], name: string): Block {
  const keep = new Set(ids)
  const nodes = project.nodes.filter((n) => keep.has(n.id))
  const x0 = Math.min(...nodes.map((n) => n.position.x))
  const y0 = Math.min(...nodes.map((n) => n.position.y))
  return {
    id: `b-${uid()}`,
    name,
    nodes: nodes.map((n) => ({ id: n.id, type: 'device', position: { x: n.position.x - x0, y: n.position.y - y0 }, data: structuredClone(n.data) })),
    edges: project.edges
      .filter((e) => keep.has(e.source) && keep.has(e.target))
      .map((e) => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, targetHandle: e.targetHandle, data: { ...e.data, cableId: e.data?.cableId ?? '' } })),
  }
}

/**
 * Drops a block at `at`: new ids, names made unique in the project, cables
 * numbered after the project's own. The placed devices come selected.
 */
export function placeBlock(project: Project, block: Block, at: { x: number; y: number }): Project {
  const ids = new Map(block.nodes.map((n) => [n.id, `d-${uid()}`]))
  const names = new Set(project.nodes.map((n) => n.data.name))
  const unique = (name: string) => {
    let k = 2
    let out = name
    while (names.has(out)) out = `${name} ${k++}`
    names.add(out)
    return out
  }
  const nodes: DeviceNode[] = block.nodes.map((n) => ({
    ...n,
    id: ids.get(n.id)!,
    position: { x: at.x + n.position.x, y: at.y + n.position.y },
    selected: true,
    data: { ...structuredClone(n.data), name: unique(n.data.name) },
  }))
  const edges = [...project.edges]
  for (const e of block.edges) {
    const source = ids.get(e.source)
    const target = ids.get(e.target)
    if (!source || !target) continue
    edges.push({ ...e, id: `e-${uid()}`, source, target, data: { ...e.data, cableId: nextCableId(edges) } })
  }
  return {
    ...project,
    nodes: [...project.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), ...nodes],
    edges: edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
  }
}
