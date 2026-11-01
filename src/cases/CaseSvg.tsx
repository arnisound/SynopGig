import type { Banner, FlightCase } from '../types'

import { bannerSize, caseHeightMm } from './geometry'
import { FLIGHT } from './models'

function fitText(text: string, fontSize: number, max: number) {
  // Rough glyph width for condensed display fonts.
  const est = text.length * fontSize * 0.58
  return est > max ? { textLength: max, lengthAdjust: 'spacingAndGlyphs' as const } : {}
}

export function BannerArt({ banner, number, w, h, x = 0, y = 0 }: { banner: Banner; number: string; w: number; h: number; x?: number; y?: number }) {
  const pad = h * 0.1
  const logoW = banner.logo ? h - pad * 2 : 0
  const numW = number ? h * 0.9 : 0
  const textX = x + pad + (logoW ? logoW + pad : 0)
  const textW = w - (textX - x) - pad - (numW ? numW + pad : 0)
  const titleSize = banner.subtitle ? h * 0.48 : h * 0.62
  const subSize = h * 0.24
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h * 0.06} fill={banner.bg} />
      {banner.logo && (
        <image href={banner.logo} x={x + pad} y={y + pad} width={logoW} height={h - pad * 2} preserveAspectRatio="xMidYMid meet" />
      )}
      <text
        x={textX}
        y={y + (banner.subtitle ? h * 0.52 : h * 0.7)}
        fill={banner.fg}
        fontFamily={banner.font}
        fontSize={titleSize}
        fontWeight={700}
        {...fitText(banner.title, titleSize, textW)}
      >
        {banner.title}
      </text>
      {banner.subtitle && (
        <text x={textX} y={y + h * 0.84} fill={banner.fg} fontFamily={banner.font} fontSize={subSize} opacity={0.9} {...fitText(banner.subtitle, subSize, textW)}>
          {banner.subtitle}
        </text>
      )}
      {number && (
        <g>
          <rect x={x + w - pad - numW} y={y + pad} width={numW} height={h - pad * 2} rx={h * 0.05} fill={banner.fg} />
          <text
            x={x + w - pad - numW / 2}
            y={y + h / 2 + h * 0.15}
            textAnchor="middle"
            fill={banner.bg}
            fontFamily={banner.font}
            fontSize={h * 0.42}
            fontWeight={700}
            {...fitText(number, h * 0.42, numW * 0.9)}
          >
            {number}
          </text>
        </g>
      )}
    </g>
  )
}

function Corner({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r={28} fill="url(#metal)" stroke="#6b6f76" strokeWidth={2} />
}

function Latch({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 38} y={y - 26} width={76} height={52} rx={8} fill="url(#metal)" stroke="#6b6f76" strokeWidth={2} />
      <circle cx={x} cy={y} r={12} fill="#9ca0a7" stroke="#6b6f76" strokeWidth={2} />
    </g>
  )
}

function Defs() {
  return (
    <defs>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f2f3f5" />
        <stop offset="0.5" stopColor="#b9bdc4" />
        <stop offset="1" stopColor="#e3e5e8" />
      </linearGradient>
    </defs>
  )
}

/** Storage that is not a flight case: its own shape, the banner as its label. */
function OtherFront({ fc, w, h }: { fc: FlightCase; w: number; h: number }) {
  const { bw, bh } = bannerSize(fc)
  const stroke = '#2b2d31'
  const label = (y: number, scale = 1) => <BannerArt banner={fc.banner} number={fc.number} w={bw * scale} h={bh * scale} x={(w - bw * scale) / 2} y={y} />
  switch (fc.kind) {
    case 'palox': {
      const foot = Math.min(140, h * 0.16)
      const body = h - foot
      return (
        <g>
          <rect x={0} y={0} width={w} height={body} rx={18} fill={fc.shell} stroke={stroke} strokeWidth={6} />
          {Array.from({ length: 7 }, (_, i) => <line key={i} x1={(w / 8) * (i + 1)} y1={30} x2={(w / 8) * (i + 1)} y2={body - 30} stroke="#0003" strokeWidth={12} />)}
          <rect x={0} y={0} width={w} height={40} fill="#0002" />
          {[0.04, 0.44, 0.84].map((f) => <rect key={f} x={w * f} y={body} width={w * 0.12} height={foot} fill={fc.shell} stroke={stroke} strokeWidth={6} />)}
          <rect x={0} y={body + foot * 0.55} width={w} height={foot * 0.25} fill={fc.shell} stroke={stroke} strokeWidth={4} />
          {label((body - bh) / 2)}
        </g>
      )
    }
    case 'bac': {
      const inset = w * 0.05
      const lid = Math.min(60, h * 0.14)
      return (
        <g>
          <path d={`M0 ${lid} L${w} ${lid} L${w - inset} ${h} L${inset} ${h} Z`} fill={fc.shell} stroke={stroke} strokeWidth={6} strokeLinejoin="round" />
          <rect x={-10} y={0} width={w / 2 + 6} height={lid} rx={8} fill={fc.shell} stroke={stroke} strokeWidth={6} />
          <rect x={w / 2 + 4} y={0} width={w / 2 + 6} height={lid} rx={8} fill={fc.shell} stroke={stroke} strokeWidth={6} />
          {[w * 0.12, w * 0.88].map((x) => <rect key={x} x={x - w * 0.06} y={lid + 40} width={w * 0.12} height={Math.min(60, h * 0.12)} rx={28} fill="#0006" />)}
          {Array.from({ length: 5 }, (_, i) => <line key={i} x1={inset + 20} y1={lid + 130 + i * ((h - lid - 160) / 5)} x2={w - inset - 20} y2={lid + 130 + i * ((h - lid - 160) / 5)} stroke="#0002" strokeWidth={8} />)}
          {label(lid + (h - lid - bh * 0.8) / 2 + 20, 0.8)}
        </g>
      )
    }
    case 'roll':
    case 'etagere': {
      const levels = fc.kind === 'roll' ? Math.max(2, Math.round(h / 700)) : Math.max(3, Math.round(h / 450))
      const post = 40
      return (
        <g>
          {[0, w - post].map((x) => <rect key={x} x={x} y={0} width={post} height={h} fill={fc.shell} stroke={stroke} strokeWidth={4} />)}
          {fc.kind === 'roll' && Array.from({ length: Math.floor(w / 120) }, (_, i) => <line key={i} x1={post + (i + 1) * 120} y1={0} x2={post + (i + 1) * 120} y2={h} stroke={fc.shell} strokeWidth={6} opacity={0.7} />)}
          {fc.kind === 'roll' && Array.from({ length: Math.floor(h / 120) }, (_, i) => <line key={`h${i}`} x1={post} y1={(i + 1) * 120} x2={w - post} y2={(i + 1) * 120} stroke={fc.shell} strokeWidth={6} opacity={0.7} />)}
          {Array.from({ length: levels + 1 }, (_, i) => <rect key={`l${i}`} x={0} y={Math.min(h - 40, (h / levels) * i)} width={w} height={40} fill={fc.shell} stroke={stroke} strokeWidth={4} />)}
          {fc.kind === 'etagere' && Array.from({ length: Math.floor(h / 60) }, (_, i) => <circle key={`t${i}`} cx={post / 2} cy={30 + i * 60} r={6} fill="#0005" />)}
          {label(Math.min(h - bh - 60, h / levels / 2 - bh / 2 + 20), 0.7)}
        </g>
      )
    }
    case 'chariot':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={10} fill={fc.shell} stroke={stroke} strokeWidth={6} />
          <rect x={20} y={h * 0.2} width={w - 40} height={h * 0.25} fill="#0003" />
        </g>
      )
    case 'housse':
    default:
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={Math.min(w, h) * 0.12} fill={fc.shell} stroke={stroke} strokeWidth={6} />
          <path d={`M${w * 0.06} ${h * 0.12} H${w * 0.94}`} stroke="#c9ccd1" strokeWidth={8} strokeDasharray="18 10" />
          {fc.handles > 0 && <path d={`M${w * 0.3} 0 C${w * 0.35} ${-h * 0.18}, ${w * 0.65} ${-h * 0.18}, ${w * 0.7} 0`} fill="none" stroke={stroke} strokeWidth={22} strokeLinecap="round" />}
          {label((h - bh * 0.8) / 2 + h * 0.06, 0.8)}
        </g>
      )
  }
}

/** Front view of the closed case, with its banner. */
export function CaseFront({ fc }: { fc: FlightCase }) {
  if (!FLIGHT.includes(fc.kind)) {
    const w = fc.width * 10
    const h = caseHeightMm(fc)
    const wheel = fc.wheels ? 90 : 0
    const m = 60
    return (
      <svg viewBox={`${-m} ${-m - (fc.kind === 'housse' ? h * 0.18 : 0)} ${w + m * 2} ${h + wheel + m * 2 + (fc.kind === 'housse' ? h * 0.18 : 0)}`} className="case-svg" role="img" aria-label={`${fc.name}`}>
        <Defs />
        {fc.wheels && [w * 0.1, w * 0.9].map((x) => (
          <g key={x}>
            <rect x={x - 30} y={h - 5} width={60} height={30} fill="#55585e" />
            <circle cx={x} cy={h + 52} r={38} fill="#2b2d31" stroke="#55585e" strokeWidth={6} />
          </g>
        ))}
        <OtherFront fc={fc} w={w} h={h} />
      </svg>
    )
  }
  const w = fc.width * 10
  const h = caseHeightMm(fc)
  const wheel = fc.wheels ? 90 : 0
  const { bw, bh } = bannerSize(fc)
  const lidY = fc.kind === 'rack' || fc.kind === 'tiroirs' ? 0 : fc.kind === 'console' ? h * 0.55 : h * 0.28
  const bannerY = fc.kind === 'valise' || fc.kind === 'malle' ? lidY + (h - lidY - bh) / 2 : (h - bh) / 2
  const m = 40
  return (
    <svg viewBox={`${-m} ${-m} ${w + m * 2} ${h + wheel + m * 2}`} className="case-svg" role="img" aria-label={`Flight case ${fc.name}`}>
      <Defs />
      {fc.wheels && [w * 0.12, w * 0.88].map((x) => (
        <g key={x}>
          <rect x={x - 30} y={h - 5} width={60} height={30} fill="#55585e" />
          <circle cx={x} cy={h + 52} r={38} fill="#2b2d31" stroke="#55585e" strokeWidth={6} />
        </g>
      ))}
      <rect x={0} y={0} width={w} height={h} rx={14} fill={fc.shell} />
      <rect x={6} y={6} width={w - 12} height={h - 12} rx={10} fill="none" stroke="url(#metal)" strokeWidth={14} />
      {lidY > 0 && <rect x={0} y={lidY - 9} width={w} height={18} fill="url(#metal)" />}
      {fc.kind === 'tiroirs' &&
        Array.from({ length: 4 }, (_, i) => {
          const dh = (h - 80) / 4
          return (
            <g key={i}>
              <rect x={40} y={40 + i * dh} width={w - 80} height={dh - 14} rx={6} fill="#0003" stroke="url(#metal)" strokeWidth={5} />
              <rect x={w / 2 - 80} y={40 + i * dh + dh / 2 - 20} width={160} height={22} rx={11} fill="url(#metal)" />
            </g>
          )
        })}
      {fc.kind === 'rack' && (
        <>
          {[w * 0.2, w * 0.8].map((x) => <Latch key={x} x={x} y={30} />)}
          {[w * 0.2, w * 0.8].map((x) => <Latch key={`b${x}`} x={x} y={h - 30} />)}
        </>
      )}
      {lidY > 0 && [w * 0.18, w * 0.82].map((x) => <Latch key={x} x={x} y={lidY} />)}
      {fc.handles > 0 &&
        Array.from({ length: Math.min(fc.handles, 4) }, (_, i) => {
          const x = (w / (Math.min(fc.handles, 4) + 1)) * (i + 1)
          return <rect key={i} x={x - 70} y={h - 70} width={140} height={34} rx={17} fill="#2b2d31" stroke="url(#metal)" strokeWidth={6} />
        })}
      {fc.kind !== 'tiroirs' && <BannerArt banner={fc.banner} number={fc.number} w={bw} h={bh} x={(w - bw) / 2} y={bannerY} />}
      <Corner cx={0} cy={0} />
      <Corner cx={w} cy={0} />
      <Corner cx={0} cy={h} />
      <Corner cx={w} cy={h} />
    </svg>
  )
}
