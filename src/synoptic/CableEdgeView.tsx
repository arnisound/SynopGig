import { EdgeLabelRenderer, getBezierPath, getSmoothStepPath, getStraightPath, Position, type Edge, type EdgeProps } from '@xyflow/react'
import { memo } from 'react'
import type { CableData, SynopticView } from '../types'

/** What the synoptic adds to a cable for drawing it; never saved in the project. */
export type CableView = CableData & {
  style: SynopticView['edgeStyle']
  /** Own lane: x of the vertical run, so no two cables share a segment. */
  centerX?: number
  /** Distance from the port before the first bend. */
  offset: number
  color: string
  tag: string
  label?: string
  labelColor: string
  /** Cable tag next to both ports, like a real cable label. */
  endTags: boolean
  title: string
  faded: boolean
}

export type CableFlowEdge = Edge<CableView, 'cable'>

function path(p: EdgeProps<CableFlowEdge>) {
  const d = p.data!
  const base = { sourceX: p.sourceX, sourceY: p.sourceY, targetX: p.targetX, targetY: p.targetY, sourcePosition: p.sourcePosition, targetPosition: p.targetPosition }
  if (d.style === 'straight') return getStraightPath(base)
  if (d.style === 'default') return getBezierPath(base)
  return getSmoothStepPath({ ...base, borderRadius: d.style === 'step' ? 0 : 6, offset: d.offset, centerX: d.centerX })
}

function EndTag({ x, y, side, text, color }: { x: number; y: number; side: Position; text: string; color: string }) {
  const right = side === Position.Right
  return (
    <div
      className="cable-end-tag"
      style={{ transform: `translate(${right ? x + 10 : x - 10}px, ${y - 15}px) translateX(${right ? '0' : '-100%'})`, borderColor: color }}
    >
      {text}
    </div>
  )
}

/** One cable: its own route, tags at both ends, a tooltip with where it goes. */
function CableEdgeView(p: EdgeProps<CableFlowEdge>) {
  const d = p.data!
  const [d0, labelX, labelY] = path(p)
  const width = Number(p.style?.strokeWidth ?? 2)
  return (
    <>
      <path id={p.id} className="react-flow__edge-path" d={d0} style={p.style} markerEnd={p.markerEnd} fill="none" />
      <path d={d0} fill="none" stroke="transparent" strokeWidth={Math.max(14, width + 10)} className="react-flow__edge-interaction">
        <title>{d.title}</title>
      </path>
      {!d.faded && (
        <EdgeLabelRenderer>
          {d.label && (
            <div className={`cable-label ${p.selected ? 'selected' : ''}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, color: d.labelColor, borderColor: d.color }}>
              {d.label}
            </div>
          )}
          {d.endTags && d.tag && (
            <>
              <EndTag x={p.sourceX} y={p.sourceY} side={p.sourcePosition} text={d.tag} color={d.color} />
              <EndTag x={p.targetX} y={p.targetY} side={p.targetPosition} text={d.tag} color={d.color} />
            </>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default memo(CableEdgeView)
