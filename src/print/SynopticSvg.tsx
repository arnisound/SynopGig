import { SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS } from '../data/library'
import { resolveCables } from '../project'
import { portSides } from '../synoptic/portLayout'
import type { DeviceNode, Port, Project } from '../types'

const HEAD = 40
const ROW = 15

interface Box {
  node: DeviceNode
  x: number
  y: number
  w: number
  h: number
  left: Port[]
  right: Port[]
}

/**
 * Static drawing of the synoptic for printing: same positions as on screen,
 * vector output that stays sharp at any paper size, nothing to mount.
 */
export default function SynopticSvg({ project, usedOnly, nodeIds, edgeIds }: { project: Project; usedOnly: boolean; nodeIds?: Set<string>; edgeIds?: Set<string> }) {
  const nodes = project.nodes.filter((n) => !nodeIds || nodeIds.has(n.id))
  const edges = project.edges.filter((e) => (!edgeIds || edgeIds.has(e.id)) && nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target))
  if (nodes.length === 0) return <p className="muted">Synoptique vide.</p>

  const used = new Set(edges.flatMap((e) => [`${e.source}/${e.sourceHandle}`, `${e.target}/${e.targetHandle}`]))
  const boxes = new Map<string, Box>()
  for (const n of nodes) {
    const visible = usedOnly ? n.data.ports.filter((p) => used.has(`${n.id}/${p.id}`)) : n.data.ports
    const { left, right } = portSides(n.data.ports, visible)
    const w = Math.max(180, n.measured?.width ?? 220)
    boxes.set(n.id, { node: n, x: n.position.x, y: n.position.y, w, h: HEAD + Math.max(left.length, right.length, 1) * ROW + 6, left, right })
  }

  const anchor = (nodeId: string, portId?: string | null) => {
    const b = boxes.get(nodeId)!
    const li = b.left.findIndex((p) => p.id === portId)
    const ri = b.right.findIndex((p) => p.id === portId)
    const onLeft = li >= 0
    const i = onLeft ? li : Math.max(0, ri)
    return { x: onLeft ? b.x : b.x + b.w, y: b.y + HEAD + i * ROW + ROW / 2, dir: onLeft ? -1 : 1 }
  }

  const racks = project.cases
    .filter((c) => c.kind === 'rack')
    .map((c) => ({ c, members: [...boxes.values()].filter((b) => c.devices.includes(b.node.id)) }))
    .filter((r) => r.members.length > 0)

  const all = [...boxes.values()]
  const x0 = Math.min(...all.map((b) => b.x)) - 60
  const y0 = Math.min(...all.map((b) => b.y)) - 70
  // A small drawing keeps a readable scale instead of being blown up to the page.
  const x1 = Math.max(Math.max(...all.map((b) => b.x + b.w)) + 60, x0 + 1400)
  const y1 = Math.max(Math.max(...all.map((b) => b.y + b.h)) + 40, y0 + 500)
  const cables = new Map(resolveCables(project.nodes, project.edges).map((c) => [c.edge.id, c]))

  return (
    <svg className="synoptic-svg" viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} role="img" aria-label="Synoptique">
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
          const s = cables.get(e.id)?.fromPort?.signal
          return s ? SIGNALS[s].color : '#888'
        })()
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const label = e.data?.cableId ?? ''
        return (
          <g key={e.id}>
            <path d={`M${a.x} ${a.y} C${a.x + a.dir * k} ${a.y} ${b.x + b.dir * k} ${b.y} ${b.x} ${b.y}`} fill="none" stroke={color} strokeWidth={1.8} />
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
    </svg>
  )
}
