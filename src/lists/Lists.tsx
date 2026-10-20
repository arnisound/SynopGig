import { useMemo } from 'react'
import { CONNECTORS, SIGNALS } from '../data/connectors'
import { extId, intId } from '../data/panels'
import { cableOn, download, internalRack, otherEnd, rackOfNode, resolveCables, slug, toCsv } from '../project'
import type { Project } from '../types'

function Table({ head, rows, alerts }: { head: string[]; rows: (string | number | undefined)[][]; alerts?: boolean }) {
  return (
    <table className={alerts ? 'with-alerts' : undefined}>
      <thead>
        <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={head.length} className="muted">Aucune donnée</td></tr>
        )}
      </tbody>
    </table>
  )
}

export default function Lists({ project }: { project: Project }) {
  const { nodes, edges } = project
  const base = slug(project.name)

  const cables = useMemo(() => {
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
  }, [nodes, edges, project.cases])

  const panels = useMemo(() => {
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
  }, [nodes, edges])

  const bom = useMemo(() => {
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
  }, [nodes, edges])

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

  const blocks = [
    { title: 'Liste de câbles', file: 'cables', alerts: true, ...cables },
    { title: 'Nomenclature', file: 'nomenclature', ...bom },
    { title: 'Plan d’adressage IP', file: 'ip', ...ips },
    { title: 'Patch DMX', file: 'dmx', ...dmx },
    { title: 'Bandeaux de câblage', file: 'bandeaux', ...panels },
  ]

  return (
    <div className="page lists">
      <header className="page-head">
        <div>
          <h2>Listes & nomenclature</h2>
          <p>Générées automatiquement depuis le synoptique.</p>
        </div>
        <button className="no-print" onClick={() => window.print()}>Imprimer / PDF</button>
      </header>
      {blocks.map((b) => (
        <section key={b.file}>
          <div className="section-head">
            <h3>{b.title}</h3>
            <button className="no-print" onClick={() => download(`${base}-${b.file}.csv`, toCsv([b.head, ...b.rows]), 'text/csv')}>
              Export CSV
            </button>
          </div>
          <Table head={b.head} rows={b.rows} alerts={'alerts' in b} />
        </section>
      ))}
    </div>
  )
}
