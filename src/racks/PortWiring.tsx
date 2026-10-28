import { CONNECTORS } from '../data/connectors'
import { cableOn, connectPorts, otherEnd, unplug } from '../project'
import type { DeviceNode, Project } from '../types'
import ConnectorIcon from './ConnectorIcon'
import { compatible, insidePorts } from './wiring'
import { sameSignal } from '../data/connectors'

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
  node: DeviceNode
  /** Other devices of the rack, in rack order. */
  members: DeviceNode[]
}

/** Inside-rack cabling of one device: each port picks its destination. */
export default function PortWiring({ project, setProject, node, members }: Props) {
  const others = members.filter((m) => m.id !== node.id)
  const ports = insidePorts(node)
  const byId = new Map(project.nodes.map((n) => [n.id, n]))

  const plug = (portId: string, value: string) =>
    setProject((p) => {
      if (!value) return unplug(p, { node: node.id, port: portId })
      const [n, port] = value.split('|')
      return connectPorts(p, { node: node.id, port: portId }, { node: n, port }, true) ?? p
    })

  return (
    <table className="wiring">
      <thead>
        <tr><th>Port</th><th>Relié à</th></tr>
      </thead>
      <tbody>
        {ports.map((port) => {
          const e = cableOn(project.edges, { node: node.id, port: port.id })
          const end = e && otherEnd(e, { node: node.id, port: port.id })
          const endNode = end && byId.get(end.node)
          const endPort = endNode?.data.ports.find((x) => x.id === end?.port)
          const inside = !!endNode && others.some((o) => o.id === endNode.id)
          const value = end && inside ? `${end.node}|${end.port}` : ''
          return (
            <tr key={port.id}>
              <td>
                <span className="port-cell">
                  <ConnectorIcon connector={port.connector} signal={port.signal} size={18} wired={!!e} />
                  <span>
                    {port.label}
                    <small>{CONNECTORS[port.connector]}</small>
                  </span>
                </span>
              </td>
              <td>
                {e && !inside ? (
                  <span className="external">
                    {e.data?.cableId} · hors rack : {endNode?.data.name} · {endPort?.label}
                    <button className="icon" title="Débrancher" onClick={() => plug(port.id, '')}>×</button>
                  </span>
                ) : (
                  <select value={value} onChange={(ev) => plug(port.id, ev.target.value)}>
                    <option value="">— non câblé —</option>
                    {others.map((o) => {
                      const candidates = insidePorts(o).filter((q) => sameSignal(q.signal, port.signal))
                      if (candidates.length === 0) return null
                      return (
                        <optgroup key={o.id} label={o.data.name}>
                          {candidates.map((q) => {
                            const busy = cableOn(project.edges, { node: o.id, port: q.id })
                            const mine = value === `${o.id}|${q.id}`
                            return (
                              <option key={q.id} value={`${o.id}|${q.id}`}>
                                {q.label}
                                {q.connector !== port.connector ? ` (${CONNECTORS[q.connector]})` : ''}
                                {!compatible(port, q) ? ' ⚠ sens' : ''}
                                {busy && !mine ? ' · occupé' : ''}
                              </option>
                            )
                          })}
                        </optgroup>
                      )
                    })}
                  </select>
                )}
                {e && <small className="cable-id">{inside ? e.data?.cableId : ''}</small>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
