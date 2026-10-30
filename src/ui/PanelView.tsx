import { CONNECTORS, SIGNALS } from '../data/connectors'
import type { ConnectorType, Port } from '../types'

/*
 * The connection panel of a product, drawn from its ports in panel order:
 * the shape of each socket, the colour of its signal, its short name.
 * Rackable products get their rack ears.
 */

const CELL = 34
const ROW = 44

/** One socket, drawn around (0, 0) in a 28 × 28 box. */
function Socket({ c }: { c: ConnectorType }) {
  switch (c) {
    case 'xlr3':
    case 'xlr4':
    case 'xlr5':
      return <><circle r="11" /><g fill="currentColor" stroke="none">{(c === 'xlr3' ? [[-4, -3], [4, -3], [0, 4]] : c === 'xlr4' ? [[-4, -4], [4, -4], [-4, 4], [4, 4]] : [[-5, -2], [5, -2], [0, -6], [-3, 5], [3, 5]]).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" />)}</g></>
    case 'xlr-combo':
      return <><circle r="11" /><circle r="4" /><circle cy="-7.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="-6" cy="5" r="1.2" fill="currentColor" stroke="none" /><circle cx="6" cy="5" r="1.2" fill="currentColor" stroke="none" /></>
    case 'jack':
      return <><circle r="8" /><circle r="3" fill="currentColor" stroke="none" /></>
    case 'minijack':
    case 'microdot':
    case 'dc':
      return <><circle r="5" /><circle r="1.6" fill="currentColor" stroke="none" /></>
    case 'speakon':
    case 'speakon8':
      return <><circle r="12" /><circle r="6" /><rect x="-2" y="-12" width="4" height="4" fill="currentColor" stroke="none" /></>
    case 'rj45':
    case 'ethercon':
      return <>{c === 'ethercon' && <circle r="12" />}<rect x="-7" y="-6" width="14" height="11" rx="1" /><rect x="-3" y="5" width="6" height="3" /></>
    case 'opticalcon':
    case 'lc-fiber':
    case 'sfp':
      return <><rect x="-9" y="-7" width="18" height="14" rx="2" /><circle cx="-4" r="2" /><circle cx="4" r="2" /></>
    case 'smpte-fiber':
    case 'lemo3':
    case 'mini-xlr':
      return <><circle r="7" /><circle r="3" /></>
    case 'powercon':
    case 'powercon-true1':
      return <><circle r="12" fill={c === 'powercon' ? '#2563eb33' : '#facc1533'} /><path d="M-5 -6h10M-6 3h12" /></>
    case 'iec':
      return <path d="M-10 -7h20v8l-5 6h-10l-5-6z" />
    case 'schuko':
    case 'p17-16a':
    case 'p17-32a':
    case 'p17-32a-mono':
    case 'p17-63a':
    case 'p17-125a':
    case 'socapex':
    case 'harting':
    case 'rmp54':
    case 'ca-com':
      return <><circle r="13" /><circle cx="-5" r="2" /><circle cx="5" r="2" /><circle cy="-6" r="1.5" /></>
    case 'bnc':
    case 'sdi':
    case 'ntype':
      return <><circle r="8" /><circle r="4" /><circle r="1.2" fill="currentColor" stroke="none" /></>
    case 'rca':
      return <><circle r="7" /><circle r="2.5" /></>
    case 'usb':
    case 'usb-c':
      return <rect x="-7" y="-3.5" width="14" height="7" rx={c === 'usb-c' ? 3.5 : 1} />
    case 'hdmi':
    case 'displayport':
      return <path d="M-11 -5h22v5l-4 5h-14l-4-5z" />
    case 'dvi':
    case 'vga':
    case 'db9':
    case 'db25':
      return <path d="M-13 -6h26l-3 12h-20z" />
    case 'euroblock':
    case 'binding-post':
      return <><rect x="-12" y="-6" width="24" height="12" rx="1" /><circle cx="-6" r="2" /><circle cx="6" r="2" /></>
    case 'toslink':
      return <rect x="-6" y="-6" width="12" height="12" rx="2" />
    case 'midi':
      return <><circle r="10" /><g fill="currentColor" stroke="none">{[-60, -30, 0, 30, 60].map((a) => <circle key={a} cx={6 * Math.sin((a * Math.PI) / 180)} cy={-6 * Math.cos((a * Math.PI) / 180) + 2} r="1.2" />)}</g></>
    default:
      return <rect x="-9" y="-7" width="18" height="14" rx="2" />
  }
}

/** Short name under a socket: "In 12", "AES50 A", "Secteur". */
const shortName = (p: Port) => p.label.replace(/\s*\(.*\)$/, '').replace(/^Sortie /, 'Out ').replace(/^Entrée /, 'In ').slice(0, 9)

export default function PanelView({ ports, rackU, columns = 8 }: { ports: Port[]; rackU?: number; columns?: number }) {
  if (!ports.length) return <p className="muted small">Aucun connecteur : appareil sans fil ou passif.</p>
  const ear = rackU ? 18 : 0
  const perRow = columns
  const rows = Math.ceil(ports.length / perRow)
  const w = Math.min(ports.length, perRow) * CELL + 16 + 2 * ear
  const h = rows * ROW + 12
  return (
    <svg className="panel-view" viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: w * 1.6 }} role="img" aria-label="Panneau de connexions">
      <rect x={ear} y="1" width={w - 2 * ear} height={h - 2} rx="4" className="panel-face" />
      {ear > 0 && (
        <>
          <rect x="1" y="1" width={ear} height={h - 2} rx="2" className="panel-ear" />
          <rect x={w - ear - 1} y="1" width={ear} height={h - 2} rx="2" className="panel-ear" />
          {[10, h - 10].flatMap((y) => [ear / 2 + 1, w - ear / 2 - 1].map((x) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="4" ry="2.5" className="panel-hole" />))}
        </>
      )}
      {ports.map((p, i) => {
        const x = ear + 8 + (i % perRow) * CELL + CELL / 2
        const y = 6 + Math.floor(i / perRow) * ROW + 16
        return (
          <g key={p.id} transform={`translate(${x} ${y})`} style={{ color: SIGNALS[p.signal].color }}>
            <title>{`${p.label} · ${CONNECTORS[p.connector]} · ${SIGNALS[p.signal].label}`}</title>
            <g transform="scale(0.85)" fill="none" stroke="currentColor" strokeWidth="1.6">
              <Socket c={p.connector} />
            </g>
            <text y="24" textAnchor="middle" className="panel-label">{shortName(p)}</text>
          </g>
        )
      })}
    </svg>
  )
}
