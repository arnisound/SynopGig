import { CONNECTORS, SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS } from '../data/library'
import { familyOf } from '../data/cableFamily'
import { internalRack, rackOfNode, resolveCables, throughPanels, type ResolvedCable } from '../project'
import type { DeviceNode, Project } from '../types'

export interface Step {
  id: string
  focus: string[]
  title: string
  detail?: string
  warnings?: string[]
  color: string
  /** The trade it belongs to (Son, Lumière…), for the technician who only does that. */
  trade?: string
}

const TRADE_OF_FAMILY: Record<string, string> = { audio: 'Son', light: 'Lumière', video: 'Vidéo', network: 'Réseau', power: 'Énergie', control: 'Réseau' }

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
        trade: n.data.category,
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
      trade: TRADE_OF_FAMILY[familyOf(c.fromPort?.signal ?? c.toPort?.signal) ?? ''],
    }
  }
  const all = resolveCables(nodes, edges)
  const rackNames = [...new Set(all.map((c) => internalRack(racks, c.edge)?.name).filter((n) => n !== undefined))]
  // Gear that is not 19", strapped or tied on a shelf, before the rack is wired.
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const fixings = (rack: string): Step[] =>
    project.cases
      .filter((c) => c.kind === 'rack' && c.name === rack)
      .flatMap((c) =>
        Object.entries(c.held ?? {})
          .filter(([id, host]) => c.devices.includes(id) && c.devices.includes(host) && byId.has(id) && byId.has(host) && !((byId.get(id)!.data.rackU ?? 0) > 0))
          .map(([id, host]) => {
            const shelf = byId.get(host)!
            const how = /scratch/i.test(shelf.data.model) ? 'avec les sangles scratch' : /collier|perfor/i.test(shelf.data.model) ? 'avec des colliers serre-câbles' : /½|⅓|oreille/i.test(shelf.data.model) ? 'sur ses oreilles' : 'et le sangler'
            return { trade: byId.get(id)!.data.category, id: `fix-${id}`, focus: [id], title: `Fixer « ${byId.get(id)!.data.name} » sur « ${shelf.data.name} » ${how}`, color: CATEGORY_COLORS[byId.get(id)!.data.category] }
          }),
      )
  const heldRacks = project.cases.filter((c) => c.kind === 'rack' && Object.keys(c.held ?? {}).length).map((c) => c.name)
  const workshop = [...new Set([...heldRacks, ...rackNames])].map((name) => ({
    title: `Atelier — rack « ${name} » : fixations et câblage interne`,
    steps: [...fixings(name), ...all.filter((c) => internalRack(racks, c.edge)?.name === name).map(toStep)],
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
      trade: n.data.category,
    }
  })
  return [
    ...workshop.map((w, i) => ({ ...w, title: `0.${i + 1} ${w.title}` })),
    { title: '1. Mise en place', steps: placement },
    { title: '2. Câblage sur site', steps: cabling },
    { title: '3. Configuration', steps: config },
  ]
}

/** Lower case, no accents, no separators, no leading zeros: "C-042" and "c42" are the same. */
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .replace(/(^|[^0-9])0+(?=\d)/g, '$1')

/**
 * The steps that answer a question typed on site ("C-042", "console in 3",
 * "retour"): every word must appear in the step, case and accents aside.
 */
export function findSteps(sections: GuideSection[], query: string, onlyLeft?: Record<string, boolean>): GuideSection[] {
  const words = query.split(/\s+/).map(fold).filter(Boolean)
  const whole = fold(query)
  const matches = (st: Step) => !onlyLeft?.[st.id] && words.every((w) => fold(`${st.title} ${st.detail ?? ''}`).includes(w))
  // A cable id typed in full ("c1", "C-001") is that cable, not every C1x.
  const exact = (st: Step) => !!whole && fold(st.title.split(' — ')[0]) === whole
  const anyExact = sections.some((s) => s.steps.some((st) => matches(st) && exact(st)))
  return sections
    .map((s) => ({ ...s, steps: s.steps.filter((st) => matches(st) && (!anyExact || exact(st))) }))
    .filter((s) => s.steps.length > 0 || (!words.length && !onlyLeft))
}
