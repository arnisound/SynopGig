import { useMemo, type DragEvent } from 'react'
import { CATEGORY_COLORS } from '../data/library'
import { extId, intId } from '../data/panels'
import type { CableEdge, DeviceNode, FlightCase } from '../types'
import ConnectorIcon from './ConnectorIcon'
import { mountRack } from './layout'

export const RACK_DND = 'application/x-synopgig-rack'
const UH = 40

interface Props {
  fc: FlightCase
  nodes: DeviceNode[]
  edges: CableEdge[]
  side: 'front' | 'rear'
  selected?: string
  selectedHoles?: Set<string>
  onSelect?: (nodeId: string) => void
  onHole?: (nodeId: string, holeId: string, extend: boolean) => void
  onDrop?: (payload: string, top: number) => void
}

/** "Port → destination" for every plugged port, keyed by `node/port`. */
function useDestinations(nodes: DeviceNode[], edges: CableEdge[]) {
  return useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const label = (n?: string, p?: string | null) => {
      const node = n ? byId.get(n) : undefined
      return `${node?.data.name ?? '?'} · ${node?.data.ports.find((x) => x.id === p)?.label ?? p}`
    }
    const m = new Map<string, string>()
    for (const e of edges) {
      const id = e.data?.cableId ?? ''
      m.set(`${e.source}/${e.sourceHandle}`, `${id} → ${label(e.target, e.targetHandle)}`)
      m.set(`${e.target}/${e.targetHandle}`, `${id} ← ${label(e.source, e.sourceHandle)}`)
    }
    return m
  }, [nodes, edges])
}

export default function RackFace({ fc, nodes, edges, side, selected, selectedHoles, onSelect, onHole, onDrop }: Props) {
  const { mounted } = mountRack(fc, nodes)
  const dest = useDestinations(nodes, edges)

  const drop = (e: DragEvent, top: number) => {
    const payload = e.dataTransfer.getData(RACK_DND)
    if (!payload || !onDrop) return
    e.preventDefault()
    e.stopPropagation()
    onDrop(payload, top)
  }

  return (
    <div className={`rack rack-${side}`}>
      <div className="rack-title">{side === 'front' ? 'Face avant' : 'Face arrière'}</div>
      <div className="rack-body" style={{ height: fc.rackU * UH }}>
        {Array.from({ length: fc.rackU }, (_, i) => (
          <div
            key={i}
            className="rack-slot"
            style={{ top: i * UH, height: UH }}
            onDragOver={(e) => onDrop && e.preventDefault()}
            onDrop={(e) => drop(e, i + 1)}
          >
            <span className="u-num">{i + 1}</span>
            <span className="u-num right">{i + 1}</span>
          </div>
        ))}
        {mounted.map(({ node, top, height }) => {
          const d = node.data
          return (
            <div
              key={node.id}
              className={`rack-item ${selected === node.id ? 'selected' : ''} ${d.panel ? 'panel' : ''}`}
              style={{ top: (top - 1) * UH, height: height * UH, ['--cat' as string]: CATEGORY_COLORS[d.category] }}
              draggable={!!onDrop}
              onDragStart={(e) => {
                e.dataTransfer.setData(RACK_DND, `node:${node.id}`)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => onDrop && e.preventDefault()}
              onDrop={(e) => {
                // Dropping on an item targets the unit under the cursor.
                const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
                drop(e, top + Math.floor((e.clientY - box.top) / UH))
              }}
              onClick={() => onSelect?.(node.id)}
            >
              <span className="ear" />
              {d.panel ? (
                <div className="holes" style={{ gridTemplateRows: `repeat(${d.panel.heightU}, 1fr)` }}>
                  {d.panel.holes.map((h) => {
                    const portId = side === 'front' ? extId(h.id) : intId(h.id)
                    const to = dest.get(`${node.id}/${portId}`)
                    return (
                      <button
                        key={h.id}
                        className={`hole ${selectedHoles?.has(h.id) && selected === node.id ? 'picked' : ''}`}
                        onClick={(e) => {
                          if (!onHole) return
                          e.stopPropagation()
                          onSelect?.(node.id)
                          onHole(node.id, h.id, e.shiftKey || e.metaKey || e.ctrlKey)
                        }}
                        title={h.connector ? `${h.label || h.id}${to ? `\n${to}` : '\nNon câblé'}` : 'Obturateur'}
                      >
                        <ConnectorIcon connector={h.connector} signal={h.connector ? h.signal : undefined} size={20} wired={!!to} title="" />
                        <small>{h.label}</small>
                      </button>
                    )
                  })}
                </div>
              ) : side === 'front' ? (
                <div className="face-front">
                  <b>{d.brand ? `${d.brand} ${d.model}` : d.model}</b>
                  <span>{d.name}</span>
                  {d.config.ip && <code>{d.config.ip}</code>}
                  <i className="leds" />
                </div>
              ) : (
                <div className="face-rear">
                  <span className="rear-name">{d.name}</span>
                  <div className="rear-ports">
                    {d.ports.map((p) => {
                      const to = dest.get(`${node.id}/${p.id}`)
                      return (
                        <span key={p.id} className="rear-port" title={`${p.label}${to ? `\n${to}` : '\nNon câblé'}`}>
                          <ConnectorIcon connector={p.connector} signal={p.signal} size={18} wired={!!to} title="" />
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
              <span className="ear" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
