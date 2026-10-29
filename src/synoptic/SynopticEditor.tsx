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
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { SIGNAL_OPTIONS, SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS } from '../data/library'
import { ipIssues } from '../network/network'
import { connectPorts, createCase, createDevice, setPanel, slug, uid } from '../project'
import type { CableEdge, Category, DeviceNode, DeviceTemplate, Project, SignalType, SynopticView } from '../types'
import CableEdgeView from './CableEdgeView'
import { THEME_LABELS, type Theme } from '../theme'
import DeviceNodeView from './DeviceNodeView'
import { useCanvasModel } from './useCanvasModel'
import RackFrameView, { type FrameNode } from './RackFrameView'
import { DEFAULT_VIEW, viewOf } from './view'
import { ViewContext } from './viewContext'
import Inspector from './Inspector'
import Palette, { DND_TYPE } from './Palette'
import LibraryPage from '../library/LibraryPage'
import type { NewProductRequest } from '../library/newProduct'
import type { UserLibrary } from '../library/useUserLibrary'

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
  theme: Theme
  onTheme: (t: Theme) => void
  /** For creating a product not in the base, without leaving the synoptic (absent on a shared, read-only project). */
  userLibrary?: UserLibrary
}

const INSPECTOR_W = 340
const INSPECTOR_MIN = 280
const INSPECTOR_MAX = 820

export default function SynopticEditor({ project, setProject, templates, focus, onOpenRacks, theme, onTheme, userLibrary }: Props) {
  const { screenToFlowPosition, fitView, getViewport } = useReactFlow()
  const { nodes, edges } = project
  const view = viewOf(project)
  // Width of the inspector, chosen by dragging its edge, kept for the next visits.
  const [inspectorW, setInspectorW] = useState(() => {
    try {
      return Math.min(INSPECTOR_MAX, Math.max(INSPECTOR_MIN, Number(localStorage.getItem('synopgig.inspector')) || INSPECTOR_W))
    } catch {
      return INSPECTOR_W
    }
  })
  const saveInspectorW = (w: number) => {
    setInspectorW(w)
    try {
      localStorage.setItem('synopgig.inspector', String(w))
    } catch {
      // Storage blocked: the width lasts for this visit only.
    }
  }
  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    const startX = e.clientX
    const startW = inspectorW
    let w = startW
    const move = (ev: PointerEvent) => {
      w = Math.min(INSPECTOR_MAX, Math.max(INSPECTOR_MIN, startW + startX - ev.clientX))
      setInspectorW(w)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      saveInspectorW(w)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  // "Ajouter un nouveau produit": made in a window over the synoptic; the newest ones head the palette.
  const [newProduct, setNewProduct] = useState<NewProductRequest>()
  const [creating, setCreating] = useState(false)
  const recent = useMemo(() => [...project.customTemplates].reverse().slice(0, 5).map((t) => t.id), [project.customTemplates])
  // The legend lists the signals of this project only: there are many kinds of network signals.
  const usedSignals = useMemo(() => new Set<SignalType>(project.nodes.flatMap((n) => n.data.ports.map((p) => p.signal))), [project.nodes])
  const { compact } = view
  const setView = (patch: Partial<SynopticView>) => setProject((p) => ({ ...p, view: { ...viewOf(p), ...patch } }))
  const [viewPanel, setViewPanel] = useState(false)
  const [hoverEdge, setHoverEdge] = useState<string>()
  const highlight = useMemo(() => new Set(focus), [focus])
  const ips = useMemo(() => ipIssues(project), [project])
  const { cables, cableByEdge, used, viewEdges, viewNodes, frames } = useCanvasModel(project, highlight, hoverEdge)


  // A shared project arrives after the page: frame its devices once they are there.
  const focusReady = focus.some((id) => project.nodes.some((n) => n.id === id))
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
  }, [focus, focusReady])

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

  // On small screens, touching a device or a cable opens the inspector sheet.
  const [drawer, setDrawer] = useState<'palette' | 'inspector' | 'legend'>()
  const selectedId = selectedNode?.id ?? selectedEdge?.id
  const [lastSelected, setLastSelected] = useState(selectedId)
  if (selectedId !== lastSelected) {
    setLastSelected(selectedId)
    if (selectedId && window.matchMedia('(max-width: 900px)').matches) setDrawer('inspector')
  }

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
    <div className={`synoptic ${drawer ? `show-${drawer}` : ''}`} style={{ '--inspector-w': `${inspectorW}px` } as CSSProperties}>
      {/* Drag to widen the inspector; a double click brings it back to its usual width. */}
      <div className="inspector-resize" title="Glisser pour élargir le panneau (double-clic : largeur d’origine)" onPointerDown={startResize} onDoubleClick={() => saveInspectorW(INSPECTOR_W)} />
      {/* Phones and tablets: the palette slides in from the left, the inspector rises from the bottom. */}
      {drawer && drawer !== 'legend' && <div className="drawer-backdrop" onClick={() => setDrawer(undefined)} />}
      <div className="palette-wrap">
        <button className="sheet-close" onClick={() => setDrawer(undefined)} aria-label="Fermer">✕</button>
        <Palette
          templates={templates}
          onNew={userLibrary ? (query) => { setNewProduct((p) => ({ mode: 'find', query, n: (p?.n ?? 0) + 1 })); setCreating(true) } : undefined}
          recent={recent}
          onAdd={(t) => {
            addCentered(t)
            setDrawer(undefined)
          }}
        />
      </div>
      <div className="canvas" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <div className="canvas-toolbar">
          <button className="mobile-only" onClick={() => setDrawer(drawer === 'palette' ? undefined : 'palette')}>+ Matériel</button>
          <button className="mobile-only" onClick={() => setDrawer(drawer === 'inspector' ? undefined : 'inspector')}>Inspecteur</button>
          <button className="mobile-only" onClick={() => setDrawer(drawer === 'legend' ? undefined : 'legend')}>Légende</button>
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
              <span>Thème (fond)</span>
              <select value={theme} onChange={(e) => onTheme(e.target.value as Theme)}>
                {(Object.keys(THEME_LABELS) as Theme[]).map((t) => <option key={t} value={t}>{THEME_LABELS[t]}</option>)}
              </select>
            </label>
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
            <label className="toggle"><input type="checkbox" checked={view.images} onChange={(e) => setView({ images: e.target.checked })} /> Photo ou symbole des appareils</label>
            <label className="toggle"><input type="checkbox" checked={view.endTags} onChange={(e) => setView({ endTags: e.target.checked })} /> Repère aux deux extrémités</label>
            <label className="toggle"><input type="checkbox" checked={view.focusSelection} onChange={(e) => setView({ focusSelection: e.target.checked })} /> Isoler la sélection (appareil ou câble)</label>
            <label className="toggle"><input type="checkbox" checked={view.flow} onChange={(e) => setView({ flow: e.target.checked })} /> Animer le sens du signal</label>
            <p className="muted small">Survolez un câble pour l’isoler et lire où il va. Cliquez sur un signal de la légende pour masquer ou afficher ses câbles.</p>
            <button onClick={() => setView(DEFAULT_VIEW)}>Réinitialiser l’affichage</button>
          </div>
        )}
        <ViewContext.Provider value={{ used, compact, highlight, images: view.images }}>
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
          {SIGNAL_OPTIONS.filter((k) => usedSignals.has(k) || view.hiddenSignals.includes(k)).map((k) => {
            const s = SIGNALS[k]
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
      <div className="inspector-wrap">
      <button className="sheet-close" onClick={() => setDrawer(undefined)} aria-label="Fermer">✕</button>
      <Inspector
        node={selectedNode}
        ipIssues={selectedNode ? ips.get(selectedNode.id) : undefined}
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
                family: n.data.family,
                image: n.data.image,
              },
            ],
          }))
        }}
        onDelete={deleteSelection}
      />
      </div>
      {creating && userLibrary && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setCreating(false)}>
          <div className="modal new-product" role="dialog" aria-label="Ajouter un nouveau produit">
            <div className="section-head">
              <h3>Ajouter un nouveau produit</h3>
              <button className="icon" onClick={() => setCreating(false)} aria-label="Fermer">✕</button>
            </div>
            <LibraryPage
              project={project}
              setProject={setProject}
              userLibrary={userLibrary}
              request={newProduct}
              embedded={{ onSaved: () => setCreating(false) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

