import { resolveCables } from '../project'
import type { Project, SynopticView } from '../types'

export const DEFAULT_VIEW: SynopticView = {
  edgeStyle: 'smoothstep',
  labels: 'full',
  thickness: 2,
  hiddenSignals: [],
  department: 'all',
  focusSelection: false,
  flow: false,
  compact: false,
}

/** The project's view settings, completed with the defaults (older projects have none). */
export function viewOf(p: Project): SynopticView {
  const v = { ...DEFAULT_VIEW, ...p.view }
  return { ...v, hiddenSignals: Array.isArray(v.hiddenSignals) ? v.hiddenSignals : [] }
}

/**
 * What the view shows: cables whose signal is not hidden; with a department
 * chosen, its devices, the cables that reach them, and the devices at their
 * other end (as context).
 */
export function visibleParts(p: Project, v: SynopticView) {
  const hidden = new Set(v.hiddenSignals)
  const cables = resolveCables(p.nodes, p.edges).filter((c) => !c.fromPort || !hidden.has(c.fromPort.signal))
  if (v.department === 'all') {
    return { nodeIds: new Set(p.nodes.map((n) => n.id)), edgeIds: new Set(cables.map((c) => c.edge.id)), context: new Set<string>() }
  }
  const core = new Set(p.nodes.filter((n) => n.data.category === v.department).map((n) => n.id))
  const kept = cables.filter((c) => core.has(c.edge.source) || core.has(c.edge.target))
  // Patch panels pass the signal on: follow them one step further.
  const panels = new Set(p.nodes.filter((n) => n.data.category === 'Câblage' && kept.some((c) => c.edge.source === n.id || c.edge.target === n.id)).map((n) => n.id))
  for (const c of cables) if (!kept.includes(c) && (panels.has(c.edge.source) || panels.has(c.edge.target))) kept.push(c)
  const context = new Set(kept.flatMap((c) => [c.edge.source, c.edge.target]).filter((id) => !core.has(id)))
  return { nodeIds: new Set([...core, ...context]), edgeIds: new Set(kept.map((c) => c.edge.id)), context }
}
