import {
  Background,
  ConnectionMode,
  Controls,
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
import { connectPorts, createCase, createDevice, setPanel, slug, uid } from '../project'
import type { CableEdge, Category, DeviceNode, DeviceTemplate, Project, SignalType, SynopticView } from '../types'
import CableEdgeView from './CableEdgeView'
import DeviceNodeView from './DeviceNodeView'
import { useCanvasModel } from './useCanvasModel'
import RackFrameView, { type FrameNode } from './RackFrameView'
import { DEFAULT_VIEW, viewOf } from './view'
import { ViewContext } from './viewContext'
import Inspector from './Inspector'
import Palette, { DND_TYPE } from './Palette'

const nodeTypes = { device: DeviceNodeView, rackFrame: RackFrameView }
const edgeTypes = { cable: CableEdgeView }

const DEPARTMENTS: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie']

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
  const { nodes, edges } = project
  const view = viewOf(project)
  const { compact } = view
  const setView = (patch: Partial<SynopticView>) => setProject((p) => ({ ...p, view: { ...viewOf(p), ...patch } }))
  const [viewPanel, setViewPanel] = useState(false)
  const [hoverEdge, setHoverEdge] = useState<string>()
  const highlight = useMemo(() => new Set(focus), [focus])
  const { cables, cableByEdge, used, viewEdges, viewNodes, frames } = useCanvasModel(project, highlight, hoverEdge)


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

  // Finding a cable by its tag selects it, isolates it and frames its two ends.
  const [find, setFind] = useState('')
  const findCable = (v: string) => {
    setFind(v)
    const e = edges.find((x) => (x.data?.cableId ?? '').toLowerCase() === v.trim().toLowerCase())
    if (!e) return
    setProject((p) => ({
      ...p,
      nodes: p.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: p.edges.map((x) => (x.id === e.id ? { ...x, selected: true } : x.selected ? { ...x, selected: false } : x)),
      view: { ...viewOf(p), focusSelection: true, hiddenSignals: [], department: 'all' },
    }))
    setTimeout(() => fitView({ nodes: [{ id: e.source }, { id: e.target }], duration: 500, padding: 0.3 }), 30)
  }

  const issueCount = cables.filter((c) => c.issues.length > 0).length

  return (
    <div className="synoptic">
      <Palette templates={templates} onAdd={addCentered} />
      <div className="canvas" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <div className="canvas-toolbar">
          <label className="toggle">
            <input type="checkbox" checked={compact} onChange={(e) => setView({ compact: e.target.checked })} />
            Masquer les ports libres
          </label>
          <button className={viewPanel ? 'active' : ''} onClick={() => setViewPanel((v) => !v)} aria-expanded={viewPanel}>
            Affichage ▾
          </button>
          <span className={issueCount ? 'badge warn' : 'badge ok'}>
            {issueCount ? `${issueCount} liaison(s) à vérifier` : 'Toutes les liaisons sont conformes'}
          </span>
          {nodes.some((n) => n.selected) && (
            <button onClick={createRackFromSelection}>Créer un rack avec la sélection</button>
          )}
          <input className="cable-find" list="cable-ids" placeholder="Trouver un câble (C012)…" value={find} onChange={(e) => findCable(e.target.value)} />
          <datalist id="cable-ids">
            {cables.map((c) => (
              <option key={c.edge.id} value={c.edge.data?.cableId}>{`${c.from?.data.name ?? '?'} → ${c.to?.data.name ?? '?'}`}</option>
            ))}
          </datalist>
          <button onClick={exportPng}>Exporter PNG</button>
          <button onClick={() => fitView({ duration: 400 })}>Tout voir</button>
        </div>
        {viewPanel && (
          <div className="view-panel">
            <label className="field">
              <span>Département</span>
              <select value={view.department} onChange={(e) => setView({ department: e.target.value as Category | 'all' })}>
                <option value="all">Tout le projet</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d} seulement</option>)}
              </select>
            </label>
            <label className="field">
              <span>Tracé des câbles</span>
              <select value={view.edgeStyle} onChange={(e) => setView({ edgeStyle: e.target.value as SynopticView['edgeStyle'] })}>
                <option value="smoothstep">Angles arrondis</option>
                <option value="step">Angles droits</option>
                <option value="default">Courbes</option>
                <option value="straight">Lignes droites</option>
              </select>
            </label>
            <label className="field">
              <span>Étiquettes</span>
              <select value={view.labels} onChange={(e) => setView({ labels: e.target.value as SynopticView['labels'] })}>
                <option value="full">Repère et longueur</option>
                <option value="id">Repère seul</option>
                <option value="none">Aucune</option>
              </select>
            </label>
            <label className="field">
              <span>Épaisseur des câbles</span>
              <input type="range" min={1} max={6} step={0.5} value={view.thickness} onChange={(e) => setView({ thickness: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Couleur des câbles</span>
              <select value={view.colorMode} onChange={(e) => setView({ colorMode: e.target.value as SynopticView['colorMode'] })}>
                <option value="signal">Selon le signal</option>
                <option value="cable">Une couleur par câble</option>
              </select>
            </label>
            <label className="toggle"><input type="checkbox" checked={view.lanes} onChange={(e) => setView({ lanes: e.target.checked })} /> Séparer les tracés (aucun segment commun)</label>
            {view.lanes && (
              <label className="field">
                <span>Écart entre les câbles : {view.laneGap} px</span>
                <input type="range" min={6} max={40} step={2} value={view.laneGap} onChange={(e) => setView({ laneGap: Number(e.target.value) })} />
              </label>
            )}
            <label className="toggle"><input type="checkbox" checked={view.endTags} onChange={(e) => setView({ endTags: e.target.checked })} /> Repère aux deux extrémités</label>
            <label className="toggle"><input type="checkbox" checked={view.focusSelection} onChange={(e) => setView({ focusSelection: e.target.checked })} /> Isoler la sélection (appareil ou câble)</label>
            <label className="toggle"><input type="checkbox" checked={view.flow} onChange={(e) => setView({ flow: e.target.checked })} /> Animer le sens du signal</label>
            <p className="muted small">Survolez un câble pour l’isoler et lire où il va. Cliquez sur un signal de la légende pour masquer ou afficher ses câbles.</p>
            <button onClick={() => setView(DEFAULT_VIEW)}>Réinitialiser l’affichage</button>
          </div>
        )}
        <ViewContext.Provider value={{ used, compact, highlight }}>
          <ReactFlow
            nodes={[...frames, ...viewNodes] as FlowNode[]}
            edges={viewEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onEdgeMouseEnter={(_, e) => setHoverEdge(e.id)}
            onEdgeMouseLeave={() => setHoverEdge(undefined)}
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
          {(Object.entries(SIGNALS) as [SignalType, (typeof SIGNALS)[SignalType]][]).map(([k, s]) => {
            const off = view.hiddenSignals.includes(k)
            return (
              <button
                key={k}
                className={off ? 'off' : ''}
                title={off ? 'Afficher ces câbles' : 'Masquer ces câbles'}
                onClick={() => setView({ hiddenSignals: off ? view.hiddenSignals.filter((x) => x !== k) : [...view.hiddenSignals, k] })}
              >
                <i style={{ background: s.color }} />
                {s.label}
              </button>
            )
          })}
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

