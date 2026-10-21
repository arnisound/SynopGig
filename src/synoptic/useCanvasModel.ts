import { MarkerType, useStore, type ReactFlowState } from '@xyflow/react'
import { useCallback, useMemo } from 'react'
import { CONNECTORS, SIGNALS } from '../data/connectors'
import { resolveCables } from '../project'
import type { Project } from '../types'
import type { CableFlowEdge } from './CableEdgeView'
import { allocateLanes, type CableEnds } from './lanes'
import type { FrameNode } from './RackFrameView'
import { cableColor, viewOf, visibleParts } from './view'

/**
 * Everything the canvas draws for a project and its view settings: cables
 * with their own lanes, labels and colours, devices hidden or dimmed, rack
 * frames. Shared by the editor and by the snapshot printed in the file.
 * Must run inside a ReactFlowProvider (lanes use the measured port positions).
 */
export function useCanvasModel(project: Project, highlight: Set<string>, hoverEdge?: string) {
  const { nodes, edges } = project
  const view = viewOf(project)
  // viewOf() makes a new object on every render: the project alone decides when to recompute.
  const parts = useMemo(() => visibleParts(project, viewOf(project)), [project])

  // Isolation: the selected devices or cables, and what they reach; a hovered cable alone.
  const isolated = useMemo(() => {
    if (hoverEdge) {
      const e = edges.find((x) => x.id === hoverEdge)
      if (e) return { nodes: new Set([e.source, e.target]), edges: new Set([e.id]) }
    }
    if (!view.focusSelection) return undefined
    const sel = new Set(nodes.filter((n) => n.selected).map((n) => n.id))
    const selEdges = edges.filter((e) => e.selected)
    if (sel.size === 0 && selEdges.length === 0) return undefined
    const cablesIn = new Set(selEdges.map((e) => e.id))
    for (const e of edges) if (sel.has(e.source) || sel.has(e.target)) cablesIn.add(e.id)
    const reach = new Set(sel)
    for (const e of edges) if (cablesIn.has(e.id)) reach.add(e.source).add(e.target)
    return { nodes: reach, edges: cablesIn }
  }, [nodes, edges, view.focusSelection, hoverEdge])

  // Port positions on screen, as measured by React Flow (a string, so it only changes when they move).
  const endsKey = useStore(
    useCallback(
      (s: ReactFlowState) =>
        edges
          .map((e) => {
            const at = (node: string, handle?: string | null) => {
              const n = s.nodeLookup.get(node)
              const h = n?.internals.handleBounds?.source?.find((x) => x.id === handle)
              if (!n || !h) return undefined
              return [Math.round(n.internals.positionAbsolute.x + h.x + h.width / 2), Math.round(n.internals.positionAbsolute.y + h.y + h.height / 2), h.position]
            }
            const a = at(e.source, e.sourceHandle)
            const b = at(e.target, e.targetHandle)
            return a && b ? [e.id, ...a, ...b].join(',') : ''
          })
          .join(';'),
      [edges],
    ),
  )
  const lanes = useMemo(() => {
    const ends: CableEnds[] = endsKey
      .split(';')
      .filter(Boolean)
      .map((r) => {
        const [id, sx, sy, sp, tx, ty, tp] = r.split(',')
        return { id, sx: +sx, sy: +sy, sp: sp as CableEnds['sp'], tx: +tx, ty: +ty, tp: tp as CableEnds['tp'] }
      })
    return allocateLanes(ends, view.laneGap)
  }, [endsKey, view.laneGap])

  const cables = useMemo(() => resolveCables(nodes, edges), [nodes, edges])
  const cableByEdge = useMemo(() => new Map(cables.map((c) => [c.edge.id, c])), [cables])

  const used = useMemo(() => {
    const m = new Map<string, Set<string>>()
    const mark = (n: string, p?: string | null) => {
      if (!p) return
      if (!m.has(n)) m.set(n, new Set())
      m.get(n)!.add(p)
    }
    for (const e of edges) {
      mark(e.source, e.sourceHandle)
      mark(e.target, e.targetHandle)
    }
    return m
  }, [edges])

  const viewEdges = useMemo(
    (): CableFlowEdge[] =>
      edges.map((e, i) => {
        const c = cableByEdge.get(e.id)
        const signal = c?.fromPort ? SIGNALS[c.fromPort.signal].color : '#888'
        const color = view.colorMode === 'cable' ? cableColor(i) : signal
        const danger = c?.issues.some((x) => x.severity === 'danger')
        const warn = (c?.issues.length ?? 0) > 0
        const lit = highlight.has(e.id) || hoverEdge === e.id
        const faded = !!isolated && !isolated.edges.has(e.id)
        const id = e.data?.cableId ?? ''
        const text = view.labels === 'none' ? '' : `${id}${view.labels === 'full' && e.data?.length ? ` · ${e.data.length} m` : ''}`
        const lane = view.lanes ? lanes.get(e.id) : undefined
        const title = [
          `${id} — ${c?.from?.data.name ?? '?'} [${c?.fromPort?.label ?? '?'}] → ${c?.to?.data.name ?? '?'} [${c?.toPort?.label ?? '?'}]`,
          [c?.fromPort && CONNECTORS[c.fromPort.connector], c?.fromPort && SIGNALS[c.fromPort.signal].label, e.data?.length && `${e.data.length} m`].filter(Boolean).join(' · '),
          e.data?.note,
          ...(c?.issues.map((x) => `⚠ ${x.message}`) ?? []),
        ]
          .filter(Boolean)
          .join('\n')
        return {
          ...e,
          type: 'cable',
          hidden: !parts.edgeIds.has(e.id),
          animated: lit || (view.flow && !faded),
          zIndex: lit || e.selected ? 10 : 0,
          markerEnd: { type: MarkerType.ArrowClosed, color },
          data: {
            ...(e.data ?? { cableId: '' }),
            style: view.edgeStyle,
            centerX: lane?.centerX,
            offset: lane?.offset ?? 20,
            color,
            tag: id,
            label: `${text}${warn && view.labels !== 'none' ? ' ⚠' : ''}` || undefined,
            labelColor: danger ? '#e5484d' : warn ? '#f76b15' : 'var(--text)',
            endTags: view.endTags,
            title,
            faded,
          },
          style: {
            stroke: color,
            strokeWidth: e.selected || lit ? view.thickness + 2 : view.thickness,
            strokeDasharray: warn ? '6 4' : undefined,
            filter: danger ? 'drop-shadow(0 0 3px #e5484d)' : undefined,
            opacity: faded ? 0.08 : 1,
          },
        }
      }),
    [edges, cableByEdge, highlight, hoverEdge, view.edgeStyle, view.labels, view.thickness, view.flow, view.colorMode, view.lanes, view.endTags, lanes, parts, isolated],
  )

  const viewNodes = useMemo(
    () =>
      nodes.map((n) => {
        const hidden = !parts.nodeIds.has(n.id)
        const dim = parts.context.has(n.id) || (isolated && !isolated.nodes.has(n.id))
        return hidden || dim ? { ...n, hidden, className: dim ? 'dimmed' : undefined } : n
      }),
    [nodes, parts, isolated],
  )

  // A frame around each rack's devices; dragging its title moves the whole rack.
  const frames = useMemo(() => {
    const racks = project.cases.filter((c) => c.kind === 'rack')
    return racks.flatMap((c): FrameNode[] => {
      // Only what the view shows: a department view without the rack's gear has no frame.
      const members = nodes.filter((n) => c.devices.includes(n.id) && parts.nodeIds.has(n.id))
      if (members.length === 0) return []
      const pad = 24
      const x0 = Math.min(...members.map((n) => n.position.x)) - pad
      const y0 = Math.min(...members.map((n) => n.position.y)) - pad - 28
      const x1 = Math.max(...members.map((n) => n.position.x + (n.measured?.width ?? 220))) + pad
      const y1 = Math.max(...members.map((n) => n.position.y + (n.measured?.height ?? 200))) + pad
      return [{
        id: `frame-${c.id}`,
        type: 'rackFrame',
        position: { x: x0, y: y0 },
        data: { label: `${c.name} · ${c.rackU}U`, color: c.banner.bg },
        style: { width: x1 - x0, height: y1 - y0 },
        width: x1 - x0,
        height: y1 - y0,
        zIndex: -1,
        selectable: false,
        dragHandle: '.frame-head',
      }]
    })
  }, [project.cases, nodes, parts])
  return { view, parts, cables, cableByEdge, used, viewEdges, viewNodes, frames }
}
