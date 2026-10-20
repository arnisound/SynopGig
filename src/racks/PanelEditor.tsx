import { useState } from 'react'
import { HOLE_TYPES, HOLES_PER_U, holeTypeKey, toggleHole } from '../data/panels'
import type { PanelHole, PanelSpec, PortDirection } from '../types'
import ConnectorIcon from './ConnectorIcon'

const DIRS: Record<PortDirection, string> = {
  in: 'Entrée (vers le rack)',
  out: 'Sortie (vers l’extérieur)',
  io: 'Bidirectionnel',
}

interface Props {
  spec: PanelSpec
  selected: Set<string>
  onSelect: (s: Set<string>) => void
  onChange: (spec: PanelSpec) => void
}

/** Builds the layout of a D-series patch panel, hole by hole or in batches. */
export default function PanelEditor({ spec, selected, onSelect, onChange }: Props) {
  const [typeKey, setTypeKey] = useState(holeTypeKey(HOLE_TYPES[0]))
  const [dir, setDir] = useState<PortDirection>('in')
  const [prefix, setPrefix] = useState('MIC')
  const [start, setStart] = useState(1)

  const picked = spec.holes.filter((h) => selected.has(h.id))
  const one = picked.length === 1 ? picked[0] : undefined

  const resize = (heightU: number) => {
    const holes: PanelHole[] = Array.from({ length: heightU * HOLES_PER_U }, (_, i) =>
      spec.holes[i] ?? { id: `h${i + 1}`, label: '', connector: null, signal: 'audio-analog', dir: 'in' },
    )
    const dropped = spec.holes.slice(holes.length).filter((h) => h.connector).length
    if (dropped && !confirm(`${dropped} connecteur(s) seront retirés. Continuer ?`)) return
    onChange({ heightU, holes })
  }

  const apply = (clear = false) => {
    const type = HOLE_TYPES.find((t) => holeTypeKey(t) === typeKey)!
    let k = 0
    const holes = spec.holes.map((h) => {
      if (!selected.has(h.id)) return h
      if (clear) return { ...h, connector: null, label: '' }
      const n = start + k++
      const label = picked.length === 1 && !prefix.match(/\d$/) && start === 1 ? prefix : `${prefix} ${n}`.trim()
      return { ...h, connector: type.connector, signal: type.signal, dir, label }
    })
    onChange({ ...spec, holes })
    if (!clear) setStart(start + k)
  }

  const setOne = (patch: Partial<PanelHole>) =>
    one && onChange({ ...spec, holes: spec.holes.map((h) => (h.id === one.id ? { ...h, ...patch } : h)) })

  const row = (r: number) => new Set(spec.holes.slice(r * HOLES_PER_U, (r + 1) * HOLES_PER_U).map((h) => h.id))

  return (
    <div className="panel-editor">
      <div className="row">
        <label className="field">
          <span>Hauteur</span>
          <select value={spec.heightU} onChange={(e) => resize(Number(e.target.value))}>
            {[1, 2, 3, 4].map((u) => <option key={u} value={u}>{u}U · {u * HOLES_PER_U} trous</option>)}
          </select>
        </label>
        <span className="muted small">{spec.holes.filter((h) => h.connector).length} connecteurs</span>
      </div>

      <div className="mini-holes" style={{ gridTemplateColumns: `repeat(${HOLES_PER_U}, 1fr)` }}>
        {spec.holes.map((h, i) => (
          <button
            key={h.id}
            className={`hole ${selected.has(h.id) ? 'picked' : ''}`}
            title={`Trou ${i + 1}${h.label ? ` · ${h.label}` : ''}`}
            onClick={(e) => onSelect(toggleHole(selected, h.id, e.shiftKey || e.metaKey || e.ctrlKey))}
          >
            <ConnectorIcon connector={h.connector} signal={h.connector ? h.signal : undefined} size={16} title="" />
          </button>
        ))}
      </div>
      <div className="row wrap small">
        <span className="muted">Sélection : {picked.length} trou(s) · Maj+clic pour en ajouter</span>
        {Array.from({ length: spec.heightU }, (_, r) => (
          <button key={r} onClick={() => onSelect(row(r))}>Rangée {r + 1}</button>
        ))}
        <button onClick={() => onSelect(new Set(spec.holes.map((h) => h.id)))}>Tout</button>
        <button onClick={() => onSelect(new Set())}>Aucun</button>
      </div>

      {picked.length > 0 && (
        <div className="hole-form">
          <label className="field">
            <span>Connecteur</span>
            <select value={typeKey} onChange={(e) => setTypeKey(e.target.value)}>
              {HOLE_TYPES.map((t) => <option key={holeTypeKey(t)} value={holeTypeKey(t)}>{t.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Sens (vu de l’extérieur)</span>
            <select value={dir} onChange={(e) => setDir(e.target.value as PortDirection)}>
              {Object.entries(DIRS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="row">
            <label className="field">
              <span>Repère</span>
              <input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            </label>
            <label className="field">
              <span>Numéro de départ</span>
              <input type="number" min={0} value={start} onChange={(e) => setStart(Number(e.target.value))} />
            </label>
          </div>
          <div className="row">
            <button className="primary" onClick={() => apply()}>Poser sur {picked.length} trou(s)</button>
            <button onClick={() => apply(true)}>Obturer</button>
          </div>
          {one?.connector && (
            <label className="field">
              <span>Renommer ce trou</span>
              <input value={one.label} onChange={(e) => setOne({ label: e.target.value })} />
            </label>
          )}
        </div>
      )}
    </div>
  )
}
