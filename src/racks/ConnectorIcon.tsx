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
