import { CONNECTORS, SIGNALS } from '../data/connectors'
import type { ConnectorType, SignalType } from '../types'

interface Props {
  connector: ConnectorType | null
  signal?: SignalType
  size?: number
  wired?: boolean
  title?: string
}

function pins(n: number, r: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return <circle key={i} cx={12 + Math.cos(a) * r} cy={12 + Math.sin(a) * r} r={1.4} fill="#c9ccd1" />
  })
}

/** Front view of a connector, drawn on a 24×24 grid. */
export default function ConnectorIcon({ connector, signal, size = 24, wired, title }: Props) {
  const ring = signal ? SIGNALS[signal].color : '#55585e'
  const label = title ?? (connector ? CONNECTORS[connector] : 'Obturateur')
  let face
  switch (connector) {
    case null:
      face = <circle cx={12} cy={12} r={9} fill="#2b2d31" stroke="#3b3f45" strokeWidth={1.5} />
      break
    case 'xlr3':
      face = <>{pins(3, 4.5)}</>
      break
    case 'xlr5':
      face = <>{pins(5, 4.5)}</>
      break
    case 'ethercon':
    case 'rj45':
      face = <rect x={7} y={8} width={10} height={8} rx={1} fill="#c9ccd1" />
      break
    case 'opticalcon':
      face = <>{[9, 15].map((x) => <circle key={x} cx={x} cy={12} r={2} fill="#ffc53d" />)}</>
      break
    case 'speakon':
    case 'speakon8':
      face = <circle cx={12} cy={12} r={5} fill="none" stroke="#c9ccd1" strokeWidth={2.4} strokeDasharray="5 3" />
      break
    case 'powercon':
    case 'powercon-true1':
      face = <path d="M12 6 a6 6 0 1 1 -0.1 0 M12 9 v6" stroke="#c9ccd1" strokeWidth={2} fill="none" />
      break
    case 'sdi':
    case 'bnc':
    case 'ntype':
      face = <><circle cx={12} cy={12} r={4.5} fill="none" stroke="#c9ccd1" strokeWidth={2} /><circle cx={12} cy={12} r={1.3} fill="#c9ccd1" /></>
      break
    case 'hdmi':
      face = <path d="M6 9 h12 v4 l-2 2 h-8 l-2 -2 z" fill="#c9ccd1" />
      break
    case 'usb':
      face = <rect x={7} y={10} width={10} height={4} rx={1} fill="#c9ccd1" />
      break
    case 'rmp54':
      face = <>{pins(8, 6)}{pins(5, 3)}<circle cx={12} cy={12} r={1.2} fill="#c9ccd1" /></>
      break
    case 'xlr-combo':
      face = <>{pins(3, 5.5)}<circle cx={12} cy={12} r={2.2} fill="#111" stroke="#c9ccd1" strokeWidth={1.2} /></>
      break
    case 'xlr4':
      face = <>{pins(4, 4.5)}</>
      break
    case 'mini-xlr':
      face = <><circle cx={12} cy={12} r={4} fill="none" stroke="#c9ccd1" strokeWidth={1} />{pins(3, 2.2)}</>
      break
    case 'midi':
      face = <path d="M7 14 a5 5 0 0 1 10 0" stroke="#c9ccd1" strokeWidth={2} fill="none" strokeDasharray="1.5 2" />
      break
    case 'rca':
      face = <><circle cx={12} cy={12} r={4.5} fill="#c9ccd1" /><circle cx={12} cy={12} r={1.5} fill="#111" /></>
      break
    case 'toslink':
      face = <path d="M8 8 h8 v6 l-2 2 h-4 l-2 -2 z" fill="#ffc53d" />
      break
    case 'euroblock':
      face = <><rect x={5} y={9} width={14} height={6} rx={1} fill="#2f8f3f" />{[8, 12, 16].map((x) => <circle key={x} cx={x} cy={12} r={1.3} fill="#c9ccd1" />)}</>
      break
    case 'binding-post':
      face = <>{[9, 15].map((x) => <circle key={x} cx={x} cy={12} r={2.6} fill={x === 9 ? '#e5484d' : '#111'} stroke="#c9ccd1" />)}</>
      break
    case 'db9':
    case 'db25':
    case 'vga':
    case 'dvi':
      face = <path d="M5 9 h14 l-2 6 h-10 z" fill="none" stroke="#c9ccd1" strokeWidth={1.8} />
      break
    case 'displayport':
      face = <path d="M6 9 h12 v6 h-10 l-2 -2 z" fill="#c9ccd1" />
      break
    case 'usb-c':
      face = <rect x={7} y={10} width={10} height={4} rx={2} fill="#c9ccd1" />
      break
    case 'lc-fiber':
    case 'smpte-fiber':
      face = <>{[9, 15].map((x) => <rect key={x} x={x - 2} y={10} width={4} height={4} fill="#ffc53d" />)}</>
      break
    case 'sfp':
      face = <><rect x={6} y={9} width={12} height={6} rx={1} fill="none" stroke="#c9ccd1" strokeWidth={1.6} />{[10, 14].map((x) => <rect key={x} x={x - 1} y={11} width={2} height={2} fill="#ffc53d" />)}</>
      break
    case 'lemo3':
      face = <><circle cx={12} cy={12} r={3.5} fill="none" stroke="#c9ccd1" strokeWidth={1.2} />{pins(3, 1.8)}</>
      break
    case 'ca-com':
    case 'harting':
      face = <><rect x={5} y={8} width={14} height={8} rx={1.5} fill="none" stroke="#c9ccd1" strokeWidth={1.6} />{[8, 11, 14, 17].map((x) => <circle key={x} cx={x - 0.5} cy={12} r={1} fill="#c9ccd1" />)}</>
      break
    case 'p17-32a-mono':
      face = <>{pins(3, 5)}<circle cx={12} cy={12} r={8} fill="none" stroke="#3e7bfa" strokeWidth={1.5} /></>
      break
    case 'jack':
    case 'minijack':
      face = <circle cx={12} cy={12} r={3} fill="#111" stroke="#c9ccd1" strokeWidth={1.5} />
      break
    default:
      face = <rect x={6} y={8} width={12} height={8} rx={1.5} fill="none" stroke="#c9ccd1" strokeWidth={2} />
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} className="conn-icon">
      <title>{label}</title>
      {connector && <circle cx={12} cy={12} r={10.5} fill="#1c1c1f" stroke={ring} strokeWidth={2} />}
      {face}
      {wired && <circle cx={20} cy={4} r={3.5} fill="#30a46c" stroke="#111" strokeWidth={1} />}
    </svg>
  )
}
