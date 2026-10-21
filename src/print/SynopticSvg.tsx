import { SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS } from '../data/library'
import { resolveCables } from '../project'
import { cableColor } from '../synoptic/view'
import type { Project } from '../types'
import { HEAD, ROW, synopticLayout, type Region, type SynopticFilter } from './synopticLayout'

/**
 * Static drawing of the synoptic for printing: same positions as on screen,
 * vector output that stays sharp at any paper size, nothing to mount.
 * It is sized in millimetres to fit the given box; a region prints one tile.
 */
export default function SynopticSvg({
  project,
  filter,
  boxMm,
  region,
  grid,
  colorByCable = false,
  endTags = false,
}: {
  project: Project
  filter: SynopticFilter
  /** Printable box: the drawing keeps its proportions inside it. */
  boxMm: { w: number; h: number }
  region?: Region
  /** Overview of a tiled print: the sheets' outlines and names. */
  grid?: { cols: number; rows: number; tw: number; th: number }
  colorByCable?: boolean
  endTags?: boolean
}) {
  const l = synopticLayout(project, filter)
  if (!l) return <p className="muted">Synoptique vide.</p>
  const { edges, all, racks, anchor } = l
  const v = region ?? l.bounds
  const scale = Math.min(boxMm.w / v.w, boxMm.h / v.h)
  const cables = new Map(resolveCables(project.nodes, project.edges).map((c) => [c.edge.id, c]))

  return (
    <svg className="synoptic-svg" viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} width={`${v.w * scale}mm`} height={`${v.h * scale}mm`} role="img" aria-label="Synoptique">
      {racks.map(({ c, members }) => {
        const rx = Math.min(...members.map((b) => b.x)) - 20
        const ry = Math.min(...members.map((b) => b.y)) - 44
        const rw = Math.max(...members.map((b) => b.x + b.w)) + 20 - rx
        const rh = Math.max(...members.map((b) => b.y + b.h)) + 20 - ry
        return (
          <g key={c.id}>
            <rect x={rx} y={ry} width={rw} height={rh} rx={8} fill="none" stroke={c.banner.bg} strokeWidth={2} strokeDasharray="8 5" />
            <text x={rx + 10} y={ry + 18} fontSize={13} fontWeight={700} fill={c.banner.bg}>{c.name} · {c.rackU}U</text>
          </g>
        )
      })}
      {edges.map((e) => {
        const a = anchor(e.source, e.sourceHandle)
        const b = anchor(e.target, e.targetHandle)
        const k = Math.max(40, Math.abs(b.x - a.x) / 2)
        const color = (() => {
          if (colorByCable) return cableColor(project.edges.indexOf(e))
          const s = cables.get(e.id)?.fromPort?.signal
          return s ? SIGNALS[s].color : '#888'
        })()
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const label = e.data?.cableId ?? ''
        return (
          <g key={e.id}>
            <path d={`M${a.x} ${a.y} C${a.x + a.dir * k} ${a.y} ${b.x + b.dir * k} ${b.y} ${b.x} ${b.y}`} fill="none" stroke={color} strokeWidth={1.8} />
            {endTags && label && [a, b].map((end, i) => (
              <text key={i} x={end.x + end.dir * 8} y={end.y - 3} fontSize={7} fontWeight={700} textAnchor={end.dir > 0 ? 'start' : 'end'} fill={color}>{label}</text>
            ))}
            {label && (
              <g>
                <rect x={mx - label.length * 3.4 - 3} y={my - 7} width={label.length * 6.8 + 6} height={13} rx={2} fill="#fff" stroke={color} strokeWidth={0.8} />
                <text x={mx} y={my + 3} fontSize={9} textAnchor="middle" fontWeight={700} fill="#111">{label}</text>
              </g>
            )}
          </g>
        )
      })}
      {all.map((b) => (
        <g key={b.node.id}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill="#fff" stroke="#9a9aa3" />
          <rect x={b.x} y={b.y} width={b.w} height={4} rx={2} fill={CATEGORY_COLORS[b.node.data.category]} />
          <text x={b.x + 8} y={b.y + 19} fontSize={12} fontWeight={700} fill="#111">{b.node.data.name}</text>
          <text x={b.x + 8} y={b.y + 32} fontSize={9} fill="#555">
            {[b.node.data.brand ? `${b.node.data.brand} ${b.node.data.model}` : b.node.data.model, b.node.data.zone, b.node.data.config.ip].filter(Boolean).join(' · ')}
          </text>
          {b.left.map((p, i) => (
            <g key={p.id}>
              <circle cx={b.x} cy={b.y + HEAD + i * ROW + ROW / 2} r={3} fill={SIGNALS[p.signal].color} />
              <text x={b.x + 7} y={b.y + HEAD + i * ROW + ROW / 2 + 3} fontSize={9} fill="#222">{p.label}</text>
            </g>
          ))}
          {b.right.map((p, i) => (
            <g key={p.id}>
              <circle cx={b.x + b.w} cy={b.y + HEAD + i * ROW + ROW / 2} r={3} fill={SIGNALS[p.signal].color} />
              <text x={b.x + b.w - 7} y={b.y + HEAD + i * ROW + ROW / 2 + 3} fontSize={9} textAnchor="end" fill="#222">{p.label}</text>
            </g>
          ))}
        </g>
      ))}
      {grid &&
        Array.from({ length: grid.rows }, (_, r) =>
          Array.from({ length: grid.cols }, (_, c) => (
            <g key={`${r}-${c}`}>
              <rect x={v.x + c * grid.tw} y={v.y + r * grid.th} width={grid.tw} height={grid.th} fill="none" stroke="#c8892b" strokeWidth={2} strokeDasharray="14 8" />
              <text x={v.x + c * grid.tw + 12} y={v.y + r * grid.th + 34} fontSize={30} fontWeight={700} fill="#c8892b" opacity={0.8}>
                {String.fromCharCode(65 + (c % 26))}{r + 1}
              </text>
            </g>
          )),
        )}
    </svg>
  )
}
