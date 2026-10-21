import { CONNECTORS, SIGNALS } from '../data/connectors'
import { extId, intId } from '../data/panels'
import { cableOn, internalRack, otherEnd, rackOfNode, resolveCables } from '../project'
import type { Project } from '../types'

export type Cell = string | number | undefined

export interface TableBlock {
  title: string
  file: string
  head: string[]
  rows: Cell[][]
  /** Last column holds the alerts. */
  alerts?: boolean
}

/** Every list generated from the synoptic: Lists tab, CSV exports and the printed file. */
export function buildTables(project: Project): TableBlock[] {
  const { nodes, edges } = project
  const cables = (() => {
    const racks = rackOfNode(project.cases)
    const head = ['Repère', 'Liaison', 'De', 'Port', 'Vers', 'Port', 'Connecteurs', 'Signal', 'Longueur (m)', 'Alertes']
    const rows = resolveCables(nodes, edges).map((c) => [
      c.edge.data?.cableId,
      internalRack(racks, c.edge) ? `Interne ${internalRack(racks, c.edge)!.name}` : 'Site',
      c.from?.data.name,
      c.fromPort?.label,
      c.to?.data.name,
      c.toPort?.label,
      c.fromPort && c.toPort
        ? c.fromPort.connector === c.toPort.connector
          ? CONNECTORS[c.fromPort.connector]
          : `${CONNECTORS[c.fromPort.connector]} → ${CONNECTORS[c.toPort.connector]}`
        : '',
      c.fromPort ? SIGNALS[c.fromPort.signal].label : '',
      c.edge.data?.length,
      c.issues.map((i) => i.message).join(' / '),
    ])
    return { head, rows }
  })()

  const panels = (() => {
    const head = ['Bandeau', 'Trou', 'Repère', 'Connecteur', 'Sens', 'Extérieur', 'Intérieur rack']
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const end = (nodeId: string, port: string) => {
      const e = cableOn(edges, { node: nodeId, port })
      if (!e) return ''
      const o = otherEnd(e, { node: nodeId, port })
      const n = byId.get(o.node)
      return `${e.data?.cableId} · ${n?.data.name} [${n?.data.ports.find((p) => p.id === o.port)?.label}]`
    }
    const rows = nodes
      .filter((n) => n.data.panel)
      .flatMap((n) =>
        n.data.panel!.holes
          .map((h, i) => ({ h, i }))
          .filter(({ h }) => h.connector)
          .map(({ h, i }) => [
            n.data.name,
            i + 1,
            h.label,
            CONNECTORS[h.connector!],
            h.dir === 'in' ? 'Entrée' : h.dir === 'out' ? 'Sortie' : 'Bidir.',
            end(n.id, extId(h.id)),
            end(n.id, intId(h.id)),
          ]),
      )
    return { head, rows }
  })()

  const bom = (() => {
    const devices = new Map<string, { cat: string; qty: number; weight: number }>()
    for (const n of nodes) {
      const k = n.data.brand ? `${n.data.brand} ${n.data.model}` : n.data.model
      const cur = devices.get(k) ?? { cat: n.data.category, qty: 0, weight: 0 }
      devices.set(k, { cat: cur.cat, qty: cur.qty + 1, weight: cur.weight + (n.data.weight ?? 0) })
    }
    const cableTypes = new Map<string, { qty: number; length: number }>()
    for (const c of resolveCables(nodes, edges)) {
      const k = c.fromPort ? CONNECTORS[c.fromPort.connector] : '?'
      const cur = cableTypes.get(k) ?? { qty: 0, length: 0 }
      cableTypes.set(k, { qty: cur.qty + 1, length: cur.length + (c.edge.data?.length ?? 0) })
    }
    return {
      head: ['Type', 'Catégorie', 'Désignation', 'Quantité', 'Total'],
      rows: [
        ...[...devices].map(([k, v]) => ['Équipement', v.cat, k, v.qty, v.weight ? `${v.weight} kg` : '']),
        ...[...cableTypes].map(([k, v]) => ['Câble', '', k, v.qty, v.length ? `${v.length} m` : '']),
      ],
    }
  })()

  const ips = {
    head: ['Équipement', 'Modèle', 'Zone', 'Adresse IP'],
    rows: nodes
      .filter((n) => n.data.config.ip)
      .sort((a, b) => (a.data.config.ip ?? '').localeCompare(b.data.config.ip ?? '', undefined, { numeric: true }))
      .map((n) => [n.data.name, n.data.model, n.data.zone, n.data.config.ip]),
  }

  const dmx = {
    head: ['Univers', 'Adresse', 'Équipement', 'Modèle', 'Mode', 'Zone'],
    rows: nodes
      .filter((n) => n.data.config.dmxAddress)
      .sort((a, b) =>
        Number(a.data.config.dmxUniverse || 1) - Number(b.data.config.dmxUniverse || 1) ||
        Number(a.data.config.dmxAddress) - Number(b.data.config.dmxAddress),
      )
      .map((n) => [n.data.config.dmxUniverse || '1', n.data.config.dmxAddress, n.data.name, n.data.model, n.data.config.mode, n.data.zone]),
  }

  const blocks: TableBlock[] = [
    { title: 'Liste de câbles', file: 'cables', alerts: true, ...cables },
    { title: 'Nomenclature', file: 'nomenclature', ...bom },
    { title: 'Plan d’adressage IP', file: 'ip', ...ips },
    { title: 'Patch DMX', file: 'dmx', ...dmx },
    { title: 'Bandeaux de câblage', file: 'bandeaux', ...panels },
  ]
  return blocks
}
