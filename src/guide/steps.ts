import { CONNECTORS, SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS } from '../data/library'
import { internalRack, rackOfNode, resolveCables, throughPanels, type ResolvedCable } from '../project'
import type { DeviceNode, Project } from '../types'

export interface Step {
  id: string
  focus: string[]
  title: string
  detail?: string
  warnings?: string[]
  color: string
}

function hasConfig(n: DeviceNode) {
  const c = n.data.config
  return Boolean(c.ip || c.dmxAddress || c.mode || c.notes)
}

export interface GuideSection {
  title: string
  steps: Step[]
}

/** The technician's checklist: workshop rack wiring, placement, cabling on site, configuration. */
export function buildGuide(project: Project): GuideSection[] {
  const { nodes, edges } = project
  const zones = [...new Set(nodes.map((n) => n.data.zone || 'Sans zone'))].sort()
  const placement: Step[] = zones.flatMap((z) =>
    nodes
      .filter((n) => (n.data.zone || 'Sans zone') === z)
      .map((n) => ({
        id: `place-${n.id}`,
        focus: [n.id],
        title: `${z} — installer « ${n.data.name} »`,
        detail: n.data.model,
        color: CATEGORY_COLORS[n.data.category],
      })),
  )
  const racks = rackOfNode(project.cases)
  const via = (node?: DeviceNode, portId?: string) => {
    if (!node || !portId) return undefined
    const end = throughPanels(nodes, edges, { node: node.id, port: portId })
    return end && `${end.node.data.name} [${end.port.label}]`
  }
  const toStep = (c: ResolvedCable): Step => {
    const rack = internalRack(racks, c.edge)
    const pass = rack ? undefined : via(c.to, c.toPort?.id) ?? via(c.from, c.fromPort?.id)
    const panelSide = c.to?.data.panel ? 'arrive sur' : 'part de'
    return {
      id: `cable-${c.edge.id}`,
      focus: [c.edge.id],
      title: `${c.edge.data?.cableId} — ${c.from?.data.name} [${c.fromPort?.label}] → ${c.to?.data.name} [${c.toPort?.label}]`,
      detail: [
        c.fromPort && CONNECTORS[c.fromPort.connector],
        c.toPort && c.toPort.connector !== c.fromPort?.connector && `vers ${CONNECTORS[c.toPort.connector]}`,
        c.edge.data?.length && `${c.edge.data.length} m`,
        pass && `via bandeau, ${panelSide} ${pass}`,
        c.edge.data?.note,
      ]
        .filter(Boolean)
        .join(' · '),
      warnings: c.issues.map((i) => i.message),
      color: c.fromPort ? SIGNALS[c.fromPort.signal].color : '#888',
    }
  }
  const all = resolveCables(nodes, edges)
  const rackNames = [...new Set(all.map((c) => internalRack(racks, c.edge)?.name).filter((n) => n !== undefined))]
  const workshop = rackNames.map((name) => ({
    title: `Atelier — câblage interne « ${name} »`,
    steps: all.filter((c) => internalRack(racks, c.edge)?.name === name).map(toStep),
  }))
  const cabling = all.filter((c) => !internalRack(racks, c.edge)).map(toStep)
  const config: Step[] = nodes.filter(hasConfig).map((n) => {
    const c = n.data.config
    return {
      id: `config-${n.id}`,
      focus: [n.id],
      title: `Configurer « ${n.data.name} »`,
      detail: [
        c.ip && `IP ${c.ip}`,
        c.dmxAddress && `DMX univers ${c.dmxUniverse || 1}, adresse ${c.dmxAddress}`,
        c.mode && `Mode : ${c.mode}`,
        c.notes,
      ]
        .filter(Boolean)
        .join('\n'),
      color: CATEGORY_COLORS[n.data.category],
    }
  })
  return [
    ...workshop.map((w, i) => ({ ...w, title: `0.${i + 1} ${w.title}` })),
    { title: '1. Mise en place', steps: placement },
    { title: '2. Câblage sur site', steps: cabling },
    { title: '3. Configuration', steps: config },
  ]
}
