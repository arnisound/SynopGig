import type { PointerEvent } from 'react'
import { CATEGORY_COLORS } from '../data/library'
import type { Project, StageItem } from '../types'
import { M, stageOf } from './stage'


function Shape({ item, color, channels }: { item: StageItem; color: string; channels?: string[] }) {
  const w = item.w * M
  const h = item.h * M
  const text = (t: string, y = h / 2, size = 15, weight = 700) => (
    <text x={w / 2} y={y} fontSize={size} fontWeight={weight} textAnchor="middle" dominantBaseline="middle" fill="#111">{t}</text>
  )
  switch (item.kind) {
    case 'musician':
      return <><circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2} fill="#fff" stroke="#333" strokeWidth={3} />{text(item.label, h / 2, 13)}</>
    case 'riser':
      return <><rect width={w} height={h} fill="#e7e2d6" stroke="#8a8170" strokeWidth={3} strokeDasharray="10 6" />{text(item.label, 18, 14, 600)}</>
    case 'stand':
      return (
        <>
          <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2} fill="#fff" stroke="#333" strokeWidth={3} />
          <line x1={w / 2} y1={h / 2} x2={w} y2={0} stroke="#333" strokeWidth={4} />
          {text(channels?.join(' ') || '', h / 2, 16)}
          <text x={w / 2} y={h + 14} fontSize={12} textAnchor="middle" fill="#333">{item.label}</text>
        </>
      )
    case 'wedge':
      return <><path d={`M0 ${h} L${w * 0.15} 0 L${w * 0.85} 0 L${w} ${h} Z`} fill="#3b3f45" stroke="#111" strokeWidth={2} /><text x={w / 2} y={h * 0.6} fontSize={13} fontWeight={700} textAnchor="middle" fill="#fff">{item.label}</text></>
    case 'drums':
      return (
        <>
          <circle cx={w * 0.5} cy={h * 0.62} r={h * 0.3} fill="#fff" stroke="#333" strokeWidth={3} />
          {[[0.2, 0.3], [0.8, 0.3], [0.15, 0.7], [0.85, 0.72], [0.5, 0.18]].map(([cx, cy], i) => <circle key={i} cx={w * cx} cy={h * cy} r={h * 0.13} fill="#fff" stroke="#333" strokeWidth={2} />)}
          {text(item.label, h * 0.62, 15)}
        </>
      )
    case 'amp':
      return <><rect width={w} height={h} rx={4} fill="#2b2b2e" stroke="#111" strokeWidth={2} /><text x={w / 2} y={h / 2} fontSize={12} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill="#fff">{item.label}</text></>
    case 'keys':
      return (
        <>
          <rect width={w} height={h} fill="#fff" stroke="#333" strokeWidth={3} />
          {Array.from({ length: 13 }, (_, i) => <rect key={i} x={(w / 14) * (i + 0.7)} y={0} width={w / 28} height={h * 0.55} fill="#333" />)}
          <text x={w / 2} y={h + 14} fontSize={12} textAnchor="middle" fill="#333">{item.label}</text>
        </>
      )
    case 'power':
      return <><rect width={w} height={h} rx={3} fill="#ffe08a" stroke="#b58900" strokeWidth={2} />{text(item.label, h / 2, 11)}</>
    case 'label':
      return text(item.label, h / 2, 22)
    default:
      return (
        <>
          <rect width={w} height={h} rx={6} fill="#fff" stroke={color} strokeWidth={4} />
          {text(item.label, channels?.length ? h * 0.38 : h / 2, 12)}
          {channels?.length ? text(`voie ${channels.join(', ')}`, h * 0.75, 11, 500) : null}
        </>
      )
  }
}

/** The stage seen from above, audience at the bottom; also printed in the file. */
export default function StageSvg({
  project,
  channels,
  selected,
  onItemDown,
  onBackground,
  className = 'stage-svg',
}: {
  project: Project
  channels: Map<string, string[]>
  selected?: string
  onItemDown?: (item: StageItem, e: PointerEvent<SVGGElement>) => void
  onBackground?: () => void
  className?: string
}) {
  const stage = stageOf(project)
  const W = stage.width * M
  const D = stage.depth * M
  const nodes = new Map(project.nodes.map((n) => [n.id, n]))
  return (
    <svg className={className} viewBox={`-80 -90 ${W + 160} ${D + 190}`} role="img" aria-label="Plan de scène" onPointerDown={(e) => e.target === e.currentTarget && onBackground?.()}>
      <text x={W / 2} y={-45} fontSize={22} fontWeight={700} textAnchor="middle" fill="#666">LOINTAIN</text>
      <rect x={0} y={0} width={W} height={D} fill="#faf8f3" stroke="#333" strokeWidth={4} onPointerDown={() => onBackground?.()} />
      {Array.from({ length: Math.floor(stage.width) - 1 }, (_, i) => <line key={`x${i}`} x1={(i + 1) * M} y1={0} x2={(i + 1) * M} y2={D} stroke="#0001" strokeWidth={2} pointerEvents="none" />)}
      {Array.from({ length: Math.floor(stage.depth) - 1 }, (_, i) => <line key={`y${i}`} x1={0} y1={(i + 1) * M} x2={W} y2={(i + 1) * M} stroke="#0001" strokeWidth={2} pointerEvents="none" />)}
      <text x={-20} y={D / 2} fontSize={18} fontWeight={700} textAnchor="middle" fill="#666" transform={`rotate(-90 -20 ${D / 2})`}>JARDIN</text>
      <text x={W + 20} y={D / 2} fontSize={18} fontWeight={700} textAnchor="middle" fill="#666" transform={`rotate(90 ${W + 20} ${D / 2})`}>COUR</text>
      <text x={W / 2} y={D + 50} fontSize={24} fontWeight={700} textAnchor="middle" fill="#666">FACE — PUBLIC</text>
      <text x={W} y={D + 85} fontSize={16} textAnchor="end" fill="#888">{stage.width} × {stage.depth} m · carreaux de 1 m</text>
      {[...stage.items]
        .sort((a, b) => Number(b.kind === 'riser') - Number(a.kind === 'riser'))
        .map((it) => {
          const n = it.nodeId ? nodes.get(it.nodeId) : undefined
          const color = n ? CATEGORY_COLORS[n.data.category] : '#888'
          const w = it.w * M
          const h = it.h * M
          return (
            <g
              key={it.id}
              transform={`translate(${it.x * M} ${it.y * M}) rotate(${it.rot} ${w / 2} ${h / 2})`}
              className={`stage-item ${selected === it.id ? 'selected' : ''}`}
              onPointerDown={onItemDown ? (e) => onItemDown(it, e) : undefined}
            >
              {selected === it.id && <rect x={-8} y={-8} width={w + 16} height={h + 16} fill="none" stroke="#c8892b" strokeWidth={4} strokeDasharray="10 6" />}
              <Shape item={{ ...it, label: n ? n.data.name : it.label }} color={color} channels={it.nodeId ? channels.get(it.nodeId) : undefined} />
            </g>
          )
        })}
    </svg>
  )
}
