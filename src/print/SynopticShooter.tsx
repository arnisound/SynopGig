import { ConnectionMode, getNodesBounds, ReactFlow, ReactFlowProvider, useNodesInitialized, useReactFlow } from '@xyflow/react'
import { toPng } from 'html-to-image'
import { useEffect, useMemo, useRef } from 'react'
import CableEdgeView from '../synoptic/CableEdgeView'
import DeviceNodeView from '../synoptic/DeviceNodeView'
import RackFrameView from '../synoptic/RackFrameView'
import { useCanvasModel } from '../synoptic/useCanvasModel'
import { ViewContext } from '../synoptic/viewContext'
import type { Project, SynopticView } from '../types'

/** A picture of the synoptic; w and h in canvas pixels (zoom 1). */
export interface Shot {
  url: string
  w: number
  h: number
}

const nodeTypes = { device: DeviceNodeView, rackFrame: RackFrameView }
const edgeTypes = { cable: CableEdgeView }
const NONE = new Set<string>()
const PAD = 30

function Canvas({ project, onDone }: { project: Project; onDone: (shot?: Shot) => void }) {
  const { getNodes } = useReactFlow()
  const ready = useNodesInitialized()
  const stage = useRef<HTMLDivElement>(null)
  const done = useRef(false)
  // The caller's callback may change on every render: the picture must not restart for that.
  const finish = useRef(onDone)
  useEffect(() => {
    finish.current = onDone
  })
  const { view, used, viewEdges, viewNodes, frames } = useCanvasModel(project, NONE)

  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    // Once only, even if the canvas re-renders while it settles.
    if (!ready || done.current) return
    done.current = true
    // Lanes need the measured ports: let the cables be routed again before the picture.
    setTimeout(async () => {
      if (!alive.current) return
      try {
        const visible = getNodes().filter((n) => !n.hidden)
        const el = stage.current?.querySelector<HTMLElement>('.react-flow__viewport')
        if (visible.length === 0 || !el) return finish.current(undefined)
        const b = getNodesBounds(visible)
        const w = Math.ceil(b.width + PAD * 2)
        const h = Math.ceil(b.height + PAD * 2)
        const pixelRatio = Math.max(1, Math.min(3, 9000 / w, 9000 / h))
        const url = await toPng(el, {
          backgroundColor: '#ffffff',
          width: w,
          height: h,
          pixelRatio,
          style: { width: `${w}px`, height: `${h}px`, transform: `translate(${PAD - b.x}px, ${PAD - b.y}px) scale(1)` },
        })
        if (alive.current) finish.current({ url, w, h })
      } catch {
        if (alive.current) finish.current(undefined)
      }
    }, 500)
  }, [ready, getNodes])

  return (
    <div ref={stage} style={{ width: '100%', height: '100%' }}>
      <ViewContext.Provider value={{ used, compact: view.compact, highlight: NONE }}>
        <ReactFlow
          nodes={[...frames, ...viewNodes]}
          edges={viewEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          // Every port is a "source" handle: cables join them like in the editor.
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.05}
          proOptions={{ hideAttribution: true }}
        />
      </ViewContext.Provider>
    </div>
  )
}

/**
 * Draws the synoptic off screen, exactly as the editor shows it with the
 * given view settings (routes, lanes, labels, colours, filters), light theme,
 * and hands back a high-resolution picture for the printed file.
 */
export default function SynopticShooter({ project, view, onDone }: { project: Project; view: SynopticView; onDone: (shot?: Shot) => void }) {
  // Nothing selected or hovered: the printed view is the plain one.
  const p = useMemo(
    () => ({
      ...project,
      // An animation frozen on paper is just dashes.
      view: { ...view, flow: false },
      nodes: project.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: project.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
    }),
    [project, view],
  )
  return (
    <div className="shot-stage shot-light" aria-hidden>
      <ReactFlowProvider>
        <Canvas project={p} onDone={onDone} />
      </ReactFlowProvider>
    </div>
  )
}
