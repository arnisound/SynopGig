import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo, useContext } from 'react'
import { CONNECTORS, SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS } from '../data/library'
import type { DeviceNode, Port } from '../types'
import { ViewContext } from './viewContext'

function PortRow({ port, side, used }: { port: Port; side: 'left' | 'right'; used: boolean }) {
  const color = SIGNALS[port.signal].color
  return (
    <div className={`port port-${side} ${used ? 'used' : ''}`} title={`${CONNECTORS[port.connector]} · ${SIGNALS[port.signal].label}`}>
      <Handle
        type="source"
        id={port.id}
        position={side === 'left' ? Position.Left : Position.Right}
        style={{ background: used ? color : 'var(--panel)', borderColor: color }}
      />
      <span className="port-label">{port.label}</span>
      <span className="port-conn">{CONNECTORS[port.connector]}</span>
    </div>
  )
}

function DeviceNodeView({ id, data, selected }: NodeProps<DeviceNode>) {
  const { used, compact, highlight } = useContext(ViewContext)
  const usedHere = used.get(id) ?? new Set<string>()
  const visible = compact ? data.ports.filter((p) => usedHere.has(p.id)) : data.ports
  // Devices without plain inputs (switches, laptops...) get their
  // bidirectional ports spread on both sides to keep cables short.
  const spread = !data.ports.some((p) => p.dir === 'in' && p.signal !== 'power')
  const io = data.ports.filter((p) => p.dir === 'io')
  // Patch panels: inside face on the left, outside face on the right.
  const onLeft = (p: Port) =>
    p.face ? p.face === 'int' : p.dir === 'in' || (spread && p.dir === 'io' && io.indexOf(p) % 2 === 0)
  const inputs = visible.filter(onLeft)
  const outputs = visible.filter((p) => !onLeft(p))
  const hidden = data.ports.length - visible.length
  const addr = [
    data.config.ip,
    data.config.dmxAddress && `U${data.config.dmxUniverse || 1}.${data.config.dmxAddress}`,
  ].filter(Boolean)

  return (
    <div
      className={`device ${selected ? 'selected' : ''} ${highlight.has(id) ? 'highlight' : ''}`}
      style={{ ['--cat' as string]: CATEGORY_COLORS[data.category] }}
    >
      <div className="device-head">
        <div className="device-name">{data.name}</div>
        <div className="device-meta">
          {data.brand ? `${data.brand} ${data.model}` : data.model} · {data.zone}
        </div>
        {data.panel && <div className="panel-faces"><span>◂ intérieur rack</span><span>extérieur ▸</span></div>}
        {addr.length > 0 && <div className="device-addr">{addr.join(' · ')}</div>}
      </div>
      <div className="device-ports">
        <div className="col">
          {inputs.map((p) => (
            <PortRow key={p.id} port={p} side="left" used={usedHere.has(p.id)} />
          ))}
        </div>
        <div className="col">
          {outputs.map((p) => (
            <PortRow key={p.id} port={p} side="right" used={usedHere.has(p.id)} />
          ))}
        </div>
      </div>
      {hidden > 0 && <div className="device-hidden">+{hidden} ports libres masqués</div>}
    </div>
  )
}

export default memo(DeviceNodeView)
