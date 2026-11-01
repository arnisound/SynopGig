import { CONNECTORS, SIGNALS } from '../data/connectors'
import { extId, intId } from '../data/panels'
import { cableOn, internalRack, otherEnd, qtyOf, rackOfNode, resolveCables, weightOf } from '../project'
import { ipIssues, netLinks } from '../network/network'
import { powerBudget, wattsOf } from '../power/power'
import { FAMILIES, familyOf } from '../data/cableFamily'
import { dmxFootprint, dmxIssues } from '../synoptic/tools'
import type { Project } from '../types'

export type Cell = string | number | undefined

export interface TableBlock {
  title: string
  file: string
  head: string[]
  rows: Cell[][]
  /** Last column holds the alerts. */
  alerts?: boolean
  /** Left out when it has no row. */
  optional?: boolean
}

/** Every list generated from the synoptic: Lists tab, CSV exports and the printed file. */
export function buildTables(project: Project): TableBlock[] {
  const { nodes, edges } = project
  const cables = (() => {
    const racks = rackOfNode(project.cases)
    const head = ['Repère', 'Nature', 'Liaison', 'De', 'Port', 'Vers', 'Port', 'Connecteurs', 'Signal', 'Longueur (m)', 'Alertes']
    const nature = (s?: Parameters<typeof familyOf>[0]) => (familyOf(s) ? FAMILIES[familyOf(s)!].label : '')
    const rows = resolveCables(nodes, edges).map((c) => [
      c.edge.data?.cableId,
      nature(c.fromPort?.signal ?? c.toPort?.signal),
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
      devices.set(k, { cat: cur.cat, qty: cur.qty + qtyOf(n.data), weight: cur.weight + weightOf(n.data) })
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

  const ips = (() => {
    const issues = ipIssues(project)
    return {
      head: ['Équipement', 'Modèle', 'Zone', 'Adresse IP', 'Alertes'],
      rows: nodes
        .filter((n) => n.data.config.ip)
        .sort((a, b) => (a.data.config.ip ?? '').localeCompare(b.data.config.ip ?? '', undefined, { numeric: true }))
        .map((n) => [n.data.name, n.data.model, n.data.zone, n.data.config.ip, (issues.get(n.id) ?? []).join(' / ')]),
    }
  })()

  const network = (() => {
    const { links, notes } = netLinks(project)
    const rows: Cell[][] = links
      .sort((a, b) => a.protocol.localeCompare(b.protocol, 'fr') || a.cable.localeCompare(b.cable, 'fr', { numeric: true }))
      .map((l) => [l.cable, l.from, l.to, l.protocol, l.role ?? '', ''])
    for (const n of notes) rows.push(['—', '', '', '', '', n])
    return { head: ['Repère', 'De', 'Vers', 'Protocole', 'Rôle', 'Alertes'], rows }
  })()

  const dmxProblems = dmxIssues(project)
  const dmx = {
    head: ['Univers', 'Adresse', 'Canaux', 'Équipement', 'Modèle', 'Mode', 'Zone', 'Alertes'],
    rows: nodes
      .filter((n) => n.data.config.dmxAddress)
      .sort((a, b) =>
        Number(a.data.config.dmxUniverse || 1) - Number(b.data.config.dmxUniverse || 1) ||
        Number(a.data.config.dmxAddress) - Number(b.data.config.dmxAddress),
      )
      .map((n) => {
        const size = dmxFootprint(n.data)
        const a = Number(n.data.config.dmxAddress)
        return [n.data.config.dmxUniverse || '1', n.data.config.dmxAddress, size ? `${a}-${a + size - 1}` : '', n.data.name, n.data.model, n.data.config.mode, n.data.zone, (dmxProblems.get(n.id) ?? []).join(' / ')]
      }),
  }

  const power = (() => {
    const b = powerBudget(project)
    const head = ['Source / armoire', 'Alimentée par', 'Départ', 'Phase', 'Équipements', 'Puissance (W)', 'Intensité (A)', 'Calibre (A)', 'Alertes']
    const rows: Cell[][] = b.sources.flatMap((s) =>
      s.outlets.map((o) => [
        s.node.data.name,
        s.parent?.data.name ?? '—',
        o.port.label,
        o.threePhase ? 'L1 L2 L3' : s.threePhase ? o.phase : 'mono',
        o.shown.map((n) => n.data.name).join(', '),
        Math.round(o.watts),
        o.amps.toFixed(1),
        o.rating,
        [o.load !== undefined && o.load > 1 ? 'surcharge' : o.load !== undefined && o.load > 0.8 ? 'peu de marge' : '', o.unknown.length ? `consommation inconnue : ${o.unknown.map((n) => n.data.name).join(', ')}` : '']
          .filter(Boolean)
          .join(' / '),
      ]),
    )
    for (const n of b.unpowered) rows.push(['—', '', '—', '', n.data.name, wattsOf(n.data) ?? '', '', '', 'non alimenté sur le synoptique'])
    // Alerts of a whole board (inlet overloaded, phases unbalanced) besides those of its outlets.
    for (const a of b.boardAlerts) rows.push(['—', '', '', '', '', '', '', '', a])
    return { head, rows }
  })()

  // Rigging: what hangs from each point, against the motors' working load.
  const rigging = (() => {
    const cmu = (n: (typeof nodes)[number]) => {
      const s = n.data.specs?.find((x) => /CMU|charge maximale/i.test(x.label))
      return s ? Number(s.value.replace(',', '.')) || 0 : 0
    }
    const points = [...new Set(nodes.map((n) => n.data.config.rigPoint?.trim()).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, 'fr'))
    const rows: Cell[][] = points.map((point) => {
      const here = nodes.filter((n) => n.data.config.rigPoint?.trim() === point)
      const motors = here.filter((n) => cmu(n) > 0)
      // The motors' own weight hangs from the roof, not from their hooks.
      const load = here.filter((n) => cmu(n) === 0).reduce((s, n) => s + weightOf(n.data), 0)
      const capacity = motors.reduce((s, m) => s + cmu(m) * qtyOf(m.data), 0)
      const alert = !motors.length ? 'aucun palan : préciser le moyen d’accroche' : load > capacity ? 'SURCHARGE' : load > capacity * 0.8 ? 'au-delà de 80 % de la CMU' : ''
      return [
        point,
        here.filter((n) => cmu(n) === 0).map((n) => (qtyOf(n.data) > 1 ? `${n.data.name} (× ${qtyOf(n.data)})` : n.data.name)).join(', '),
        motors.map((m) => `${qtyOf(m.data) > 1 ? `${qtyOf(m.data)} × ` : ''}${m.data.model}`).join(', '),
        Math.round(load),
        capacity || '',
        capacity ? `${Math.round((load / capacity) * 100)} %` : '',
        alert,
      ]
    })
    return { head: ['Point d’accroche', 'Charge', 'Palans', 'Poids suspendu (kg)', 'CMU totale (kg)', 'Utilisation', 'Alertes'], rows }
  })()

  // Wireless: one row per transmitter or receiver, conflicts between links.
  const rf = (() => {
    const isRf = (n: (typeof nodes)[number]) =>
      !!n.data.config.freq || !!n.data.config.pair || (/HF|Ears|Sans fil/i.test(n.data.family ?? '') && !/antennes|distribution/i.test(n.data.family ?? ''))
    const list = nodes.filter(isRf)
    // A dual receiver carries two frequencies: « 606,125 / 607,250 ».
    const all = (n: (typeof nodes)[number]) => (n.data.config.freq ?? '').split(/[/+;]|\s{2,}/).map((x) => Number(x.trim().replace(',', '.'))).filter((x) => x > 0)
    const mhz = (n: (typeof nodes)[number]) => all(n)[0]
    const linked = (a: (typeof nodes)[number], b: (typeof nodes)[number]) => a.data.config.pair === b.id || b.data.config.pair === a.id
    const role = (n: (typeof nodes)[number]) =>
      /récepteurs/i.test(n.data.family ?? '') ? 'Récepteur' : /émetteurs/i.test(n.data.family ?? '') ? 'Émetteur' : /ears/i.test(n.data.family ?? '') ? (n.data.ports.some((p) => p.signal === 'rf') ? 'Émetteur ears' : 'Récepteur ears') : 'Sans fil'
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const rows: Cell[][] = list
      .sort((a, b) => (mhz(a) ?? 1e9) - (mhz(b) ?? 1e9))
      .map((n) => {
        const f = mhz(n)
        const pair = n.data.config.pair ? byId.get(n.data.config.pair) : list.find((o) => o.data.config.pair === n.id)
        const alerts: string[] = []
        if (!f && (n.data.config.pair || /récepteurs|émetteurs|ears/i.test(n.data.family ?? ''))) alerts.push('fréquence à renseigner')
        if (f && pair && all(pair).length && !all(n).some((x) => all(pair).some((y) => Math.abs(x - y) < 0.001))) alerts.push(`différente de ${pair.data.name} (${pair.data.config.freq})`)
        for (const o of list) {
          if (o === n || linked(n, o)) continue
          // Two receivers fed by the same transmitters share their frequencies on purpose.
          if (n.data.config.pair && n.data.config.pair === o.data.config.pair) continue
          for (const x of all(n))
            for (const y of all(o)) {
              if (Math.abs(x - y) < 0.025) alerts.push(`même fréquence que ${o.data.name}`)
              else if (Math.abs(x - y) < 0.3) alerts.push(`à moins de 300 kHz de ${o.data.name}`)
            }
        }
        return [n.data.config.freq ?? '', n.data.name, n.data.model, role(n), pair?.data.name ?? '', alerts.join(' / ')]
      })
    return { head: ['Fréquence (MHz)', 'Appareil', 'Modèle', 'Rôle', 'Associé à', 'Alertes'], rows }
  })()

  // Audio over IP: names, clock, subscriptions.
  const aoip = (() => {
    const list = nodes.filter((n) => n.data.ports.some((p) => p.signal === 'dante' || p.signal === 'avb'))
    const leaders = list.filter((n) => n.data.config.clockLeader)
    const rows: Cell[][] = list.map((n, i) => [
      n.data.config.danteName ?? '',
      n.data.name,
      n.data.config.ip ?? '',
      [...new Set(n.data.ports.filter((p) => p.signal === 'dante' || p.signal === 'avb').map((p) => (p.signal === 'dante' ? 'Dante' : 'AVB / Milan')))].join(', '),
      n.data.config.clockLeader ? 'leader' : '',
      n.data.config.subscriptions ?? '',
      [
        i === 0 && list.length > 1 && leaders.length === 0 ? 'aucune horloge leader désignée' : '',
        n.data.config.clockLeader && leaders.length > 1 ? 'plusieurs horloges leader' : '',
        !n.data.config.danteName && list.length > 1 ? 'nom réseau à donner' : '',
      ]
        .filter(Boolean)
        .join(' / '),
    ])
    return { head: ['Nom réseau', 'Appareil', 'IP', 'Protocole', 'Horloge', 'Abonnements', 'Alertes'], rows }
  })()

  // Cables to load: each run rounded up to a stock length, plus spares.
  const loading = (() => {
    const STOCK = [0.5, 1, 2, 3, 5, 10, 15, 20, 25, 30, 50, 75, 100]
    const stock = (m: number) => STOCK.find((s) => s >= m) ?? Math.ceil(m / 50) * 50
    const count = new Map<string, { type: string; length: number; qty: number }>()
    for (const c of resolveCables(nodes, edges)) {
      if (!c.fromPort || !c.toPort) continue
      const a = CONNECTORS[c.fromPort.connector]
      const b = CONNECTORS[c.toPort.connector]
      const type = a === b ? a : `${a} → ${b}`
      const length = c.edge.data?.length ? stock(c.edge.data.length) : 0
      const k = `${type}|${length}`
      const cur = count.get(k) ?? { type, length, qty: 0 }
      count.set(k, { ...cur, qty: cur.qty + 1 })
    }
    const rows: Cell[][] = [...count.values()]
      .sort((x, y) => x.type.localeCompare(y.type, 'fr') || x.length - y.length)
      .map((r) => [r.type, r.length ? `${r.length} m` : 'longueur à renseigner', r.qty, Math.max(1, Math.ceil(r.qty * 0.1)), r.qty + Math.max(1, Math.ceil(r.qty * 0.1))])
    return { head: ['Câble', 'Longueur (stock)', 'Utilisés', 'Secours (10 %)', 'À charger'], rows }
  })()

  // The truck: volume and weight of the cases, and the vehicle that takes them.
  const truck = (() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const rows: Cell[][] = project.cases.map((c) => {
      const h = c.kind === 'rack' ? c.rackU * 4.445 + 12 : c.height
      const m3 = (c.width * h * c.depth) / 1e6
      const kg = c.devices.reduce((s, id) => s + (byId.get(id) ? weightOf(byId.get(id)!.data) : 0), 0) + (c.emptyWeight ?? 0)
      return [`${c.number} · ${c.name}`, `${c.width} × ${Math.round(h)} × ${c.depth}`, m3.toFixed(2), Math.round(kg), c.wheels ? 'oui' : 'non']
    })
    const m3 = rows.reduce((s, r) => s + Number(r[2]), 0)
    const kg = rows.reduce((s, r) => s + Number(r[3]), 0)
    // Usable volume (about 70 % of the box, cases do not stack perfectly) and payload.
    const VEHICLES: [string, number, number][] = [['Utilitaire 12 m³', 12, 1100], ['Utilitaire 20 m³', 20, 1000], ['Porteur 30 m³ (hayon)', 30, 3000], ['Porteur 50 m³', 50, 6000], ['Semi-remorque 90 m³', 90, 24000]]
    const fit = VEHICLES.find(([, v, p]) => m3 <= v * 0.7 && kg <= p)
    if (rows.length) rows.push(['Total', '', m3.toFixed(2), Math.round(kg), fit ? `→ ${fit[0]}` : '→ plusieurs véhicules'])
    return { head: ['Rangement', 'Dimensions (cm)', 'Volume (m³)', 'Poids (kg)', 'Roulettes'], rows }
  })()

  const blocks: TableBlock[] = [
    { title: 'Liste de câbles', file: 'cables', alerts: true, ...cables },
    { title: 'Nomenclature', file: 'nomenclature', ...bom },
    { title: 'Plan d’adressage IP', file: 'ip', alerts: true, ...ips },
    { title: 'Liaisons réseau', file: 'reseau', alerts: true, ...network },
    { title: 'Patch DMX', file: 'dmx', alerts: true, ...dmx },
    { title: 'Bandeaux de câblage', file: 'bandeaux', ...panels },
    { title: 'Bilan électrique', file: 'energie', alerts: true, ...power },
    { title: 'Accroche', file: 'accroche', alerts: true, optional: true, ...rigging },
    { title: 'Plan de fréquences HF', file: 'frequences', alerts: true, optional: true, ...rf },
    { title: 'Audio sur IP (Dante, AVB)', file: 'audio-ip', alerts: true, optional: true, ...aoip },
    { title: 'Câbles à charger', file: 'cables-a-charger', ...loading },
    { title: 'Chargement du camion', file: 'camion', optional: true, ...truck },
  ]
  return blocks
}
