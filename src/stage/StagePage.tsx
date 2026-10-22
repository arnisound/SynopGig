import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { CATEGORY_COLORS } from '../data/library'
import { channelsBySource, familyLookup } from '../patch/patch'
import { uid } from '../project'
import type { DeviceNode, Project, StageItem, StageItemKind, StagePlot } from '../types'
import { KINDS, M, stageOf } from './stage'
import StageSvg from './StageSvg'

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
}

const GENERIC: StageItemKind[] = ['musician', 'riser', 'stand', 'wedge', 'drums', 'amp', 'keys', 'power', 'label']
const snap = (v: number) => Math.round(v * 20) / 20

/**
 * First free place for a new element, from the front centre outwards, so new
 * elements never land on top of each other (risers may go under things).
 */
function freeSpot(stage: StagePlot, w: number, h: number, riser: boolean) {
  const others = stage.items.filter((i) => riser || i.kind !== 'riser')
  const free = (x: number, y: number) => !others.some((o) => x < o.x + o.w + 0.1 && o.x < x + w + 0.1 && y < o.y + o.h + 0.1 && o.y < y + h + 0.1)
  const cols = Math.max(1, Math.floor((stage.width - w) / 0.5) + 1)
  const rows = Math.max(1, Math.floor((stage.depth - h) / 0.5) + 1)
  const mid = (cols - 1) / 2
  const order = Array.from({ length: cols }, (_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))
  for (let r = rows - 1; r >= 0; r--) for (const c of order) if (free(c * 0.5, r * 0.5)) return { x: snap(c * 0.5), y: snap(r * 0.5) }
  return { x: snap(Math.max(0, stage.width / 2 - w / 2)), y: snap(Math.max(0, stage.depth / 2 - h / 2)) }
}

/** How a synoptic device is drawn on the plot. */
function kindFor(n: DeviceNode, family?: string): StageItemKind {
  if (family === 'Micros filaires' || family === 'HF — émetteurs & micros HF' || n.data.templateId === 'mic') return 'stand'
  if (family === 'Retours' || n.data.templateId === 'wedge-active') return 'wedge'
  return 'device'
}

/** Stage plot: what stands where on stage, seen from above, at scale. */
export default function StagePage({ project, setProject }: Props) {
  const stage = stageOf(project)
  const [selected, setSelected] = useState<string>()
  const svgWrap = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const channels = useMemo(() => channelsBySource(project), [project])
  const familyOf = useMemo(() => familyLookup(project), [project])

  const setStage = (fn: (s: StagePlot) => StagePlot) => setProject((p) => ({ ...p, stage: fn(stageOf(p)) }))
  const update = (id: string, patch: Partial<StageItem>) => setStage((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))

  const add = (kind: StageItemKind, node?: DeviceNode) => {
    const k = KINDS[kind]
    const spot = freeSpot(stage, k.w, k.h, kind === 'riser')
    const item: StageItem = {
      id: `s-${uid()}`,
      kind,
      nodeId: node?.id,
      label: node ? node.data.name : k.label,
      x: spot.x,
      y: spot.y,
      w: k.w,
      h: k.h,
      rot: 0,
    }
    setStage((s) => ({ ...s, items: [...s.items, item] }))
    setSelected(item.id)
  }

  const placed = new Set(stage.items.map((i) => i.nodeId).filter(Boolean))
  const unplaced = project.nodes.filter((n) => !placed.has(n.id) && !n.data.panel && n.data.category !== 'Câblage')
  const zones = [...new Set(unplaced.map((n) => n.data.zone || 'Sans zone'))].sort((a, b) => Number(b === 'Plateau') - Number(a === 'Plateau') || a.localeCompare(b))

  // Drag with the mouse or a finger: pointer events, positions in metres.
  const toStage = (e: PointerEvent) => {
    const svg = svgWrap.current?.querySelector('svg')
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return { x: 0, y: 0 }
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: pt.x / M, y: pt.y / M }
  }
  const onItemDown = (it: StageItem, e: PointerEvent<SVGGElement>) => {
    e.stopPropagation()
    setSelected(it.id)
    const p = toStage(e)
    drag.current = { id: it.id, dx: p.x - it.x, dy: p.y - it.y }
    svgWrap.current?.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const p = toStage(e)
    const it = stage.items.find((i) => i.id === d.id)
    if (!it) return
    // Elements stay on stage (half a metre of slack for wings and edges).
    const clamp = (v: number, max: number) => Math.min(Math.max(v, -0.5), max + 0.5)
    update(d.id, { x: snap(clamp(p.x - d.dx, stage.width - it.w)), y: snap(clamp(p.y - d.dy, stage.depth - it.h)) })
  }
  const onUp = () => {
    drag.current = null
  }

  const sel = stage.items.find((i) => i.id === selected)
  const selNode = sel?.nodeId ? project.nodes.find((n) => n.id === sel.nodeId) : undefined

  return (
    <div className="page stage">
      <aside className="stage-side">
        <h3>Plan de scène</h3>
        <div className="row">
          <label className="field">
            <span>Ouverture (m)</span>
            <input type="number" min={2} max={60} step={0.5} value={stage.width} onChange={(e) => setStage((s) => ({ ...s, width: Math.max(2, Number(e.target.value) || 2) }))} />
          </label>
          <label className="field">
            <span>Profondeur (m)</span>
            <input type="number" min={2} max={40} step={0.5} value={stage.depth} onChange={(e) => setStage((s) => ({ ...s, depth: Math.max(2, Number(e.target.value) || 2) }))} />
          </label>
        </div>

        <h4>Ajouter</h4>
        <div className="stage-add">
          {GENERIC.map((k) => <button key={k} onClick={() => add(k)}>{KINDS[k].label}</button>)}
        </div>

        <h4>Matériel du synoptique <small className="muted">({unplaced.length} à placer)</small></h4>
        <p className="muted small">Touchez un appareil pour le poser sur scène, puis faites-le glisser. Les micros affichent leur numéro de voie (onglet Patch).</p>
        <div className="pick-list">
          {zones.map((z) => (
            <details key={z} open={z === 'Plateau'}>
              <summary>{z}</summary>
              {unplaced
                .filter((n) => (n.data.zone || 'Sans zone') === z)
                .map((n) => (
                  <button key={n.id} className="palette-item" onClick={() => add(kindFor(n, familyOf(n.data.templateId)), n)}>
                    <span className="dot" style={{ background: CATEGORY_COLORS[n.data.category] }} />
                    <span>{n.data.name}</span>
                    <small>{n.data.model}{channels.get(n.id) ? ` · voie ${channels.get(n.id)!.join(', ')}` : ''}</small>
                  </button>
                ))}
            </details>
          ))}
          {unplaced.length === 0 && <p className="muted small">Tout le matériel est placé.</p>}
        </div>
      </aside>

      <div className="stage-canvas" ref={svgWrap} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <StageSvg project={project} channels={channels} selected={selected} onItemDown={onItemDown} onBackground={() => setSelected(undefined)} />
      </div>

      <aside className="stage-side">
        {sel ? (
          <>
            <h3>{selNode ? selNode.data.name : KINDS[sel.kind].label}</h3>
            {selNode ? (
              <p className="muted small">{selNode.data.brand ? `${selNode.data.brand} ` : ''}{selNode.data.model}{channels.get(selNode.id) ? ` · voie ${channels.get(selNode.id)!.join(', ')}` : ''}</p>
            ) : (
              <label className="field">
                <span>Texte</span>
                <input value={sel.label} onChange={(e) => update(sel.id, { label: e.target.value })} />
              </label>
            )}
            <div className="row">
              <label className="field">
                <span>Largeur (m)</span>
                <input type="number" min={0.1} max={20} step={0.1} value={sel.w} onChange={(e) => update(sel.id, { w: Math.max(0.1, Number(e.target.value) || 0.1) })} />
              </label>
              <label className="field">
                <span>Profondeur (m)</span>
                <input type="number" min={0.1} max={20} step={0.1} value={sel.h} onChange={(e) => update(sel.id, { h: Math.max(0.1, Number(e.target.value) || 0.1) })} />
              </label>
            </div>
            <div className="actions">
              <button onClick={() => update(sel.id, { rot: (sel.rot + 315) % 360 })}>↺ 45°</button>
              <button onClick={() => update(sel.id, { rot: (sel.rot + 45) % 360 })}>↻ 45°</button>
              <button
                onClick={() => {
                  const copy = { ...sel, id: `s-${uid()}`, nodeId: undefined, x: snap(sel.x + 0.5), y: snap(sel.y + 0.5), label: selNode ? selNode.data.name : sel.label }
                  setStage((s) => ({ ...s, items: [...s.items, copy] }))
                  setSelected(copy.id)
                }}
              >
                Dupliquer
              </button>
              <button className="danger" onClick={() => { setStage((s) => ({ ...s, items: s.items.filter((i) => i.id !== sel.id) })); setSelected(undefined) }}>
                Retirer
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>Élément</h3>
            <p className="muted small">Touchez un élément du plan pour le régler (taille, rotation) ou le retirer. Le plan de scène est imprimé dans le dossier PDF.</p>
          </>
        )}
      </aside>
    </div>
  )
}
