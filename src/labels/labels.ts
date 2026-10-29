import { CONNECTORS, SIGNALS } from '../data/connectors'
import { resolveCables } from '../project'
import { shareLink } from '../share/share'
import type { Project } from '../types'

/*
 * Labels to print and stick: cables (one at each end), devices and flight
 * cases. Devices and cases get a QR code opening them in the project's
 * read-only link, when the project has one.
 */

export interface CableLabel {
  id: string
  from: string
  to: string
  color: string
  signal: string
  connector: string
  length?: number
}

export interface ThingLabel {
  title: string
  lines: string[]
  qr?: string
  color?: string
  fg?: string
}

export function cableLabels(project: Project): CableLabel[] {
  return resolveCables(project.nodes, project.edges)
    .filter((c) => c.edge.data?.cableId)
    .map((c) => ({
      id: c.edge.data!.cableId,
      from: `${c.from?.data.name ?? '?'} · ${c.fromPort?.label ?? '?'}`,
      to: `${c.to?.data.name ?? '?'} · ${c.toPort?.label ?? '?'}`,
      color: c.fromPort ? SIGNALS[c.fromPort.signal].color : '#888',
      signal: c.fromPort ? SIGNALS[c.fromPort.signal].label : '',
      connector: c.fromPort ? CONNECTORS[c.fromPort.connector] : '',
      length: c.edge.data?.length,
    }))
}

export function deviceLabels(project: Project): ThingLabel[] {
  const share = project.share?.id
  return project.nodes
    .filter((n) => !n.data.panel)
    .map((n) => ({
      title: n.data.name,
      lines: [
        [n.data.brand, n.data.model].filter(Boolean).join(' '),
        n.data.zone,
        n.data.config.ip && `IP ${n.data.config.ip}`,
        n.data.config.dmxAddress && `DMX ${n.data.config.dmxUniverse || 1}.${n.data.config.dmxAddress}`,
      ].filter((l): l is string => !!l),
      qr: share ? shareLink(share, { kind: 'device', id: n.id }) : undefined,
    }))
}

export function caseLabels(project: Project): ThingLabel[] {
  const share = project.share?.id
  const byId = new Map(project.nodes.map((n) => [n.id, n]))
  return project.cases.map((c) => {
    const inside = c.devices.map((id) => byId.get(id)).filter((n) => n !== undefined)
    const weight = inside.reduce((s, n) => s + (n.data.weight ?? 0), 0) + (c.emptyWeight ?? 0)
    return {
      title: `${c.number} · ${c.name}`,
      lines: [
        `${c.banner.title}${c.banner.subtitle ? ` · ${c.banner.subtitle}` : ''}`,
        `${inside.length} équipement(s)${weight ? ` · ${weight.toFixed(1)} kg` : ''}`,
        inside
          .slice(0, 4)
          .map((n) => n.data.name)
          .join(', ') + (inside.length > 4 ? '…' : ''),
      ].filter(Boolean),
      qr: share ? shareLink(share, { kind: 'case', id: c.id }) : undefined,
      color: c.banner.bg,
      fg: c.banner.fg,
    }
  })
}
