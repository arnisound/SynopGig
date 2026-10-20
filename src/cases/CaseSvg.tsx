import type { Banner, DeviceNode, FlightCase } from '../types'

import { U, bannerSize, caseHeightMm } from './geometry'

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

/** Front view of the closed case, with its banner. */
export function CaseFront({ fc }: { fc: FlightCase }) {
  const w = fc.width * 10
  const h = caseHeightMm(fc)
  const wheel = fc.wheels ? 90 : 0
  const { bw, bh } = bannerSize(fc)
  const lidY = fc.kind === 'rack' ? 0 : fc.kind === 'console' ? h * 0.55 : h * 0.28
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
      <BannerArt banner={fc.banner} number={fc.number} w={bw} h={bh} x={(w - bw) / 2} y={bannerY} />
      <Corner cx={0} cy={0} />
      <Corner cx={w} cy={0} />
      <Corner cx={0} cy={h} />
      <Corner cx={w} cy={h} />
    </svg>
  )
}

/** Open rack view showing devices in their rack units. */
export function RackView({ fc, devices }: { fc: FlightCase; devices: DeviceNode[] }) {
  const rail = 30
  const w = 482.6
  const h = fc.rackU * U
  const racked = devices.filter((d) => d.data.rackU)
  const slots = racked.map((d, i) => ({
    d,
    hU: d.data.rackU!,
    y: racked.slice(0, i).reduce((sum, x) => sum + x.data.rackU!, 0) * U,
  }))
  const cursor = racked.reduce((sum, x) => sum + x.data.rackU!, 0)
  const over = cursor > fc.rackU
  return (
    <svg viewBox={`-10 -10 ${w + 20} ${Math.max(h, cursor * U) + 20}`} className="rack-svg" role="img" aria-label="Vue rack">
      <rect x={0} y={0} width={w} height={h} fill="#111214" />
      {Array.from({ length: fc.rackU }, (_, i) => (
        <g key={i}>
          <line x1={rail} x2={w - rail} y1={i * U} y2={i * U} stroke="#2b2d31" />
          <text x={8} y={i * U + U / 2 + 5} fill="#8b8d98" fontSize={14}>{fc.rackU - i}</text>
        </g>
      ))}
      <rect x={0} y={0} width={rail} height={h} fill="#55585e" opacity={0.6} />
      <rect x={w - rail} y={0} width={rail} height={h} fill="#55585e" opacity={0.6} />
      {slots.map(({ d, y, hU }) => {
        const outside = y + hU * U > h
        return (
          <g key={d.id}>
            <rect x={rail + 4} y={y + 2} width={w - rail * 2 - 8} height={hU * U - 4} rx={4} fill={outside ? '#5c1a1b' : '#2b2d31'} stroke={outside ? '#e5484d' : '#55585e'} strokeWidth={2} />
            <text x={w / 2} y={y + (hU * U) / 2 + 6} textAnchor="middle" fill="#ececee" fontSize={16} fontWeight={600}>
              {d.data.name} ({hU}U)
            </text>
          </g>
        )
      })}
      {over && (
        <text x={w / 2} y={h - 8} textAnchor="middle" fill="#e5484d" fontSize={18} fontWeight={700}>
          Rack trop petit : {cursor}U pour {fc.rackU}U
        </text>
      )}
    </svg>
  )
}
