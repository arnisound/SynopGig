import { useState, type DragEvent } from 'react'
import { CONNECTOR_OPTIONS, CONNECTORS, SIGNAL_OPTIONS, SIGNALS } from '../data/connectors'
import { uid } from '../project'
import type { ConnectorType, Port, PortDirection, SignalType } from '../types'
import { portSides } from './portLayout'

const DIRS: Record<PortDirection, string> = { in: 'Entrée', out: 'Sortie', io: 'Bidir.' }
type Side = 'left' | 'right'
const SIDE_LABEL: Record<Side, string> = { left: 'Côté gauche', right: 'Côté droit' }

const natural = (a: Port, b: Port) => a.label.localeCompare(b.label, 'fr', { numeric: true, sensitivity: 'base' })

/**
 * The ports of a device as they sit on its box: left side, right side, each
 * in order from top to bottom. A port is dragged to another place or side, or
 * sent to the other side with ⇆; every change shows on the synoptic at once.
 */
export default function PortsEditor({ ports, onChange }: { ports: Port[]; onChange: (ports: Port[]) => void }) {
  const [dragged, setDragged] = useState<string>()
  const [over, setOver] = useState<string>()
  const [closed, setClosed] = useState<Set<Side>>(new Set())
  const sides = portSides(ports)
  const sideOf = (p: Port): Side => (sides.left.includes(p) ? 'left' : 'right')

  const set = (id: string, patch: Partial<Port>) => onChange(ports.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  /** Moves a port before `beforeId` (or to the end of `side`), on that side. */
  const move = (id: string, side: Side, beforeId?: string) => {
    const port = ports.find((p) => p.id === id)
    if (!port || id === beforeId) return
    const rest = ports.filter((p) => p.id !== id)
    const placed = { ...port, side }
    let at = beforeId ? rest.findIndex((p) => p.id === beforeId) : -1
    if (at < 0) {
      // After the last port of that side.
      const last = [...rest].reverse().find((p) => (portSides(rest).left.includes(p) ? 'left' : 'right') === side)
      at = last ? rest.indexOf(last) + 1 : rest.length
    }
    onChange([...rest.slice(0, at), placed, ...rest.slice(at)])
  }

  const sortSide = (side: Side) => {
    const mine = (side === 'left' ? sides.left : sides.right).slice().sort(natural)
    let k = 0
    onChange(ports.map((p) => (sideOf(p) === side ? { ...mine[k++], side } : p)))
  }

  const add = (side: Side) =>
    onChange([...ports, { id: `p-${uid()}`, label: side === 'left' ? 'Entrée' : 'Sortie', connector: 'xlr3', signal: 'audio-analog', dir: side === 'left' ? 'in' : 'out', side }])

  const drop = (side: Side, beforeId?: string) => (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragged) move(dragged, side, beforeId)
    setDragged(undefined)
    setOver(undefined)
  }

  return (
    <div className="ports-editor">
      {(['left', 'right'] as Side[]).map((side) => {
        const list = side === 'left' ? sides.left : sides.right
        const isClosed = closed.has(side)
        return (
          <section
            key={side}
            className={`port-side ${over === side ? 'drop' : ''}`}
            onDragOver={(e) => {
              if (!dragged) return
              e.preventDefault()
              setOver(side)
            }}
            onDrop={drop(side)}
          >
            <header>
              <button className="link" onClick={() => setClosed((c) => (c.has(side) ? new Set([...c].filter((x) => x !== side)) : new Set([...c, side])))}>
                {isClosed ? '▸' : '▾'} {SIDE_LABEL[side]} <span className="count">{list.length}</span>
              </button>
              <span className="grow" />
              {list.length > 1 && <button className="small-btn" title="Trier par nom (1, 2… 10)" onClick={() => sortSide(side)}>Trier</button>}
              <button className="small-btn" onClick={() => add(side)}>+ Ajouter</button>
            </header>
            {!isClosed && list.length === 0 && <p className="muted small drop-hint">Aucun port de ce côté : glissez-en un ici, ou ajoutez-le.</p>}
            {!isClosed &&
              list.map((p) => (
                <div
                  key={p.id}
                  className={`port-row ${dragged === p.id ? 'dragging' : ''} ${over === p.id ? 'over' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    setDragged(p.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => {
                    setDragged(undefined)
                    setOver(undefined)
                  }}
                  onDragOver={(e) => {
                    if (!dragged) return
                    e.preventDefault()
                    e.stopPropagation()
                    setOver(p.id)
                  }}
                  onDrop={drop(side, p.id)}
                >
                  <span className="grip" title="Glisser pour déplacer" aria-hidden>⋮⋮</span>
                  <span className="dot" style={{ background: SIGNALS[p.signal].color }} />
                  <input className="port-name" aria-label="Nom du port" value={p.label} onChange={(e) => set(p.id, { label: e.target.value })} />
                  <span className="port-meta">
                  <select aria-label="Sens" value={p.dir} onChange={(e) => set(p.id, { dir: e.target.value as PortDirection })}>
                    {Object.entries(DIRS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select aria-label="Signal" value={p.signal} onChange={(e) => set(p.id, { signal: e.target.value as SignalType })}>
                    {SIGNAL_OPTIONS.map((k) => <option key={k} value={k}>{SIGNALS[k].label}</option>)}
                  </select>
                  <select aria-label="Connecteur" value={p.connector} onChange={(e) => set(p.id, { connector: e.target.value as ConnectorType })}>
                    {CONNECTOR_OPTIONS.map((k) => <option key={k} value={k}>{CONNECTORS[k]}</option>)}
                  </select>
                  </span>
                  <span className="port-actions">
                    <button className="icon" title={`Passer ${side === 'left' ? 'à droite' : 'à gauche'}`} onClick={() => move(p.id, side === 'left' ? 'right' : 'left')}>⇆</button>
                    <button
                      className="icon"
                      title="Dupliquer"
                      onClick={() => {
                        const at = ports.findIndex((x) => x.id === p.id)
                        onChange([...ports.slice(0, at + 1), { ...p, id: `p-${uid()}`, label: `${p.label} (copie)`, side }, ...ports.slice(at + 1)])
                      }}
                    >
                      ⧉
                    </button>
                    <button className="icon" title="Supprimer" onClick={() => onChange(ports.filter((x) => x.id !== p.id))}>×</button>
                  </span>
                </div>
              ))}
          </section>
        )
      })}
    </div>
  )
}
