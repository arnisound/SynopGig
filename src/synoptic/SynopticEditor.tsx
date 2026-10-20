import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { toPng } from 'html-to-image'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS } from '../data/library'
import { connectPorts, createCase, createDevice, resolveCables, setPanel, slug, uid } from '../project'
import type { CableEdge, DeviceNode, DeviceTemplate, Project } from '../types'
import DeviceNodeView from './DeviceNodeView'
import RackFrameView, { type FrameNode } from './RackFrameView'
import { ViewContext } from './viewContext'
import Inspector from './Inspector'
import Palette, { DND_TYPE } from './Palette'

const nodeTypes = { device: DeviceNodeView, rackFrame: RackFrameView }

type FlowNode = DeviceNode | FrameNode

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
  templates: DeviceTemplate[]
  /** Elements to highlight and frame, sent from the technician guide. */
  focus: string[]
  onOpenRacks?: () => void
}

export default function SynopticEditor({ project, setProject, templates, focus, onOpenRacks }: Props) {
  const { screenToFlowPosition, fitView, getViewport } = useReactFlow()
  const [compact, setCompact] = useState(false)
  const { nodes, edges } = project

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

  const highlight = useMemo(() => new Set(focus), [focus])

  useEffect(() => {
    if (focus.length === 0) return
    const nodeIds = new Set<string>()
    for (const id of focus) {
      const e = edges.find((x) => x.id === id)
      if (e) {
        nodeIds.add(e.source)
        nodeIds.add(e.target)
      } else nodeIds.add(id)
    }
    // Wait for the canvas to be measured before framing.
    const t = setTimeout(() => fitView({ nodes: [...nodeIds].map((id) => ({ id })), duration: 500, padding: 0.4 }), 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  const viewEdges = useMemo(
    () =>
      edges.map((e) => {
        const c = cableByEdge.get(e.id)
        const color = c?.fromPort ? SIGNALS[c.fromPort.signal].color : '#888'
        const danger = c?.issues.some((i) => i.severity === 'danger')
        const warn = (c?.issues.length ?? 0) > 0
        const lit = highlight.has(e.id)
        return {
          ...e,
          type: 'smoothstep',
          animated: lit,
          label: `${e.data?.cableId ?? ''}${e.data?.length ? ` · ${e.data.length} m` : ''}${warn ? ' ⚠' : ''}`,
          labelStyle: { fill: danger ? '#e5484d' : warn ? '#f76b15' : 'var(--text)', fontWeight: 600, fontSize: 11 },
          labelBgStyle: { fill: 'var(--panel)' },
          labelBgPadding: [4, 2] as [number, number],
          markerEnd: { type: MarkerType.ArrowClosed, color },
          style: {
            stroke: color,
            strokeWidth: e.selected || lit ? 4 : 2,
            strokeDasharray: warn ? '6 4' : undefined,
            filter: danger ? 'drop-shadow(0 0 3px #e5484d)' : undefined,
          },
        }
      }),
    [edges, cableByEdge, highlight],
  )

  // A frame around each rack's devices; dragging its title moves the whole rack.
  const frames = useMemo(() => {
    const racks = project.cases.filter((c) => c.kind === 'rack')
    return racks.flatMap((c): FrameNode[] => {
      const members = nodes.filter((n) => c.devices.includes(n.id))
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
  }, [project.cases, nodes])
  const framesRef = useRef(frames)
  framesRef.current = frames

  const onNodesChange = useCallback(
    (all: NodeChange<FlowNode>[]) => {
      const isFrame = (c: NodeChange<FlowNode>) => 'id' in c && c.id.startsWith('frame-')
      const moves = all.filter((c) => isFrame(c) && c.type === 'position' && c.position)
      const changes = all.filter((c) => !isFrame(c)) as NodeChange<DeviceNode>[]
      setProject((p) => {
        let nodesNext = applyNodeChanges(changes, p.nodes)
        for (const m of moves) {
          if (m.type !== 'position' || !m.position) continue
          const frame = framesRef.current.find((f) => f.id === m.id)
          const rack = p.cases.find((c) => `frame-${c.id}` === m.id)
          if (!frame || !rack) continue
          const dx = m.position.x - frame.position.x
          const dy = m.position.y - frame.position.y
          nodesNext = nodesNext.map((n) => (rack.devices.includes(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n))
        }
        const removed = new Set(changes.filter((c) => c.type === 'remove').map((c) => c.id))
        return {
          ...p,
          nodes: nodesNext,
          edges: removed.size ? p.edges.filter((e) => !removed.has(e.source) && !removed.has(e.target)) : p.edges,
          cases: removed.size ? p.cases.map((c) => ({ ...c, devices: c.devices.filter((d) => !removed.has(d)) })) : p.cases,
        }
      })
    },
    [setProject],
  )

  const createRackFromSelection = () => {
    const sel = nodes.filter((n) => n.selected)
    const ids = new Set(sel.map((n) => n.id))
    const c = createCase(project.cases)
    c.kind = 'rack'
    c.name = `Rack ${project.cases.filter((x) => x.kind === 'rack').length + 1}`
    c.rackU = Math.max(4, sel.reduce((s, n) => s + (n.data.rackU ?? 0), 0) + 2)
    c.devices = sel.map((n) => n.id)
    c.banner = { ...c.banner, title: 'RACK', subtitle: c.name.toUpperCase() }
    setProject((p) => ({
      ...p,
      cases: [...p.cases.map((x) => ({ ...x, devices: x.devices.filter((d) => !ids.has(d)) })), c],
    }))
    onOpenRacks?.()
  }

  const onEdgesChange = useCallback(
    (changes: EdgeChange<CableEdge>[]) => setProject((p) => ({ ...p, edges: applyEdgeChanges(changes, p.edges) })),
    [setProject],
  )

  const onConnect = (c: Connection) => {
    const next = connectPorts(project, { node: c.source, port: c.sourceHandle ?? '' }, { node: c.target, port: c.targetHandle ?? '' })
    if (next) setProject(() => next)
    else alert('Ce port est déjà câblé. Supprimez le câble existant d’abord.')
  }

  const addAt = useCallback(
    (t: DeviceTemplate, position: { x: number; y: number }) =>
      setProject((p) => ({ ...p, nodes: [...p.nodes, createDevice(t, position, p.nodes)] })),
    [setProject],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    const t = templates.find((x) => x.id === e.dataTransfer.getData(DND_TYPE))
    if (t) addAt(t, screenToFlowPosition({ x: e.clientX, y: e.clientY }))
  }

  const addCentered = (t: DeviceTemplate) => {
    const { x, y, zoom } = getViewport()
    const el = document.querySelector('.react-flow')
    const w = el?.clientWidth ?? 800
    const h = el?.clientHeight ?? 600
    const target = { x: (w / 2 - x) / zoom - 100, y: (h / 2 - y) / zoom - 60 }
    // Successive clicks cascade instead of stacking on the same spot.
    let k = 0
    while (k < 20 && nodes.some((n) => Math.abs(n.position.x - (target.x + k * 40)) < 20 && Math.abs(n.position.y - (target.y + k * 40)) < 20)) k++
    addAt(t, { x: target.x + k * 40, y: target.y + k * 40 })
  }

  const selectedNode = nodes.find((n) => n.selected)
  const selectedEdge = edges.find((e) => e.selected)

  const exportPng = async () => {
    if (nodes.length === 0) return
    const bounds = getNodesBounds(nodes)
    const width = Math.min(6000, bounds.width + 200)
    const height = Math.min(6000, bounds.height + 200)
    const vp = getViewportForBounds(bounds, width, height, 0.1, 2, 0.05)
    const el = document.querySelector<HTMLElement>('.react-flow__viewport')
    if (!el) return
    const bg = getComputedStyle(document.body).getPropertyValue('--canvas').trim() || '#ffffff'
    const url = await toPng(el, {
      backgroundColor: bg,
      width,
      height,
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
    })
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug(project.name)}-synoptique.png`
    a.click()
  }

  const deleteSelection = () =>
    setProject((p) => {
      const sel = new Set(p.nodes.filter((n) => n.selected).map((n) => n.id))
      return {
        ...p,
        nodes: p.nodes.filter((n) => !sel.has(n.id)),
        edges: p.edges.filter((e) => !e.selected && !sel.has(e.source) && !sel.has(e.target)),
        cases: p.cases.map((c) => ({ ...c, devices: c.devices.filter((d) => !sel.has(d)) })),
      }
    })

  const issueCount = cables.filter((c) => c.issues.length > 0).length

  return (
    <div className="synoptic">
      <Palette templates={templates} onAdd={addCentered} />
      <div className="canvas" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <div className="canvas-toolbar">
          <label className="toggle">
            <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
            Masquer les ports libres
          </label>
          <span className={issueCount ? 'badge warn' : 'badge ok'}>
            {issueCount ? `${issueCount} liaison(s) à vérifier` : 'Toutes les liaisons sont conformes'}
          </span>
          {nodes.some((n) => n.selected) && (
            <button onClick={createRackFromSelection}>Créer un rack avec la sélection</button>
          )}
          <button onClick={exportPng}>Exporter PNG</button>
          <button onClick={() => fitView({ duration: 400 })}>Tout voir</button>
        </div>
        <ViewContext.Provider value={{ used, compact, highlight }}>
          <ReactFlow
            nodes={[...frames, ...nodes] as FlowNode[]}
            edges={viewEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionMode={ConnectionMode.Loose}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            snapToGrid
            snapGrid={[10, 10]}
            minZoom={0.1}
          >
            <Background gap={20} />
            <Controls />
            <MiniMap pannable zoomable nodeColor={(n) => (n.type === 'rackFrame' ? 'transparent' : CATEGORY_COLORS[(n as DeviceNode).data.category] ?? '#888')} />
          </ReactFlow>
        </ViewContext.Provider>
        <div className="legend">
          {Object.values(SIGNALS).map((s) => (
            <span key={s.label}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <Inspector
        node={selectedNode}
        cable={selectedEdge ? cableByEdge.get(selectedEdge.id) : undefined}
        onNode={(id, patch) =>
          setProject((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)) }))
        }
        onCable={(id, patch) =>
          setProject((p) => ({
            ...p,
            edges: p.edges.map((e) => (e.id === id ? { ...e, data: { cableId: '', ...e.data, ...patch } } : e)),
          }))
        }
        onPanel={(id, spec) => setProject((p) => setPanel(p, id, spec))}
        onSaveTemplate={(n) => {
          alert(`« ${n.data.model} » ajouté à la bibliothèque`)
          setProject((p) => ({
            ...p,
            customTemplates: [
              ...p.customTemplates,
              {
                id: `custom-${uid()}`,
                model: n.data.model,
                category: n.data.category,
                rackU: n.data.rackU,
                weight: n.data.weight,
                ports: structuredClone(n.data.ports),
                panel: n.data.panel && structuredClone(n.data.panel),
                brand: n.data.brand,
              },
            ],
          }))
        }}
        onDelete={deleteSelection}
      />
    </div>
  )
}

