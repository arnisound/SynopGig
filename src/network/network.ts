import { SIGNALS } from '../data/connectors'
import { resolveCables } from '../project'
import type { DeviceNode, Project } from '../types'

/*
 * The show's network: IP addresses checked (duplicates, typos, a device
 * outside the network the others are on) and the links that carry network
 * protocols, with Dante's redundancy.
 */

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/

export function parseIp(raw: string) {
  const m = IPV4.exec(raw.trim())
  if (!m) return undefined
  const parts = m.slice(1, 5).map(Number)
  if (parts.some((n) => n > 255)) return undefined
  return { parts, prefix: m[5] ? Number(m[5]) : 24 }
}

/** What is wrong with each device's address, by device id. */
export function ipIssues(project: Project): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const add = (id: string, msg: string) => out.set(id, [...(out.get(id) ?? []), msg])
  const withIp = project.nodes.filter((n) => n.data.config.ip?.trim())
  const byIp = new Map<string, DeviceNode[]>()
  const nets = new Map<string, number>()
  for (const n of withIp) {
    const ip = parseIp(n.data.config.ip!)
    if (!ip) {
      add(n.id, 'adresse IP mal écrite')
      continue
    }
    const key = ip.parts.join('.')
    byIp.set(key, [...(byIp.get(key) ?? []), n])
    const [a, b, c, d] = ip.parts
    if (d === 0 || d === 255) add(n.id, 'adresse de réseau ou de diffusion')
    const net = `${a}.${b}.${c}`
    nets.set(net, (nets.get(net) ?? 0) + 1)
  }
  for (const [ip, list] of byIp) if (list.length > 1) for (const n of list) add(n.id, `adresse ${ip} aussi sur ${list.filter((o) => o !== n).map((o) => o.data.name).join(', ')}`)
  // Most devices share one network: the odd one out is probably a typo.
  const main = [...nets.entries()].sort((x, y) => y[1] - x[1])[0]
  if (main && main[1] >= 2) {
    for (const n of withIp) {
      const ip = parseIp(n.data.config.ip!)
      if (ip && ip.parts.slice(0, 3).join('.') !== main[0]) add(n.id, `hors du réseau ${main[0]}.x des autres équipements`)
    }
  }
  return out
}

export interface NetLink {
  cable: string
  from: string
  to: string
  protocol: string
  /** Dante primary / secondary, read from the port names. */
  role?: 'primaire' | 'secondaire'
}

const roleOf = (label: string) => (/secondaire|secondary|\bsec\b|\bb\b/i.test(label) ? 'secondaire' : /primaire|primary|\bpri\b|\ba\b/i.test(label) ? 'primaire' : undefined)

/** Links carrying network protocols, and the redundancy notes. */
export function netLinks(project: Project): { links: NetLink[]; notes: string[] } {
  const links: NetLink[] = []
  const dante = new Map<string, Set<string>>()
  for (const c of resolveCables(project.nodes, project.edges)) {
    const p = c.fromPort
    if (!p || !c.from || !c.to || !(SIGNALS[p.signal].ip || p.signal === 'audio-link')) continue
    const role = p.signal === 'dante' ? roleOf(p.label) ?? roleOf(c.toPort?.label ?? '') : undefined
    links.push({ cable: c.edge.data?.cableId ?? '', from: `${c.from.data.name} · ${p.label}`, to: `${c.to.data.name} · ${c.toPort?.label ?? '?'}`, protocol: SIGNALS[p.signal].label, ...(role ? { role } : {}) })
    if (p.signal === 'dante' || c.toPort?.signal === 'dante') {
      for (const [n, port] of [[c.from, p], [c.to, c.toPort]] as const) {
        if (!port) continue
        const r = roleOf(port.label)
        if (r) dante.set(n.id, new Set([...(dante.get(n.id) ?? []), r]))
      }
    }
  }
  const notes: string[] = []
  for (const n of project.nodes) {
    const ports = n.data.ports.filter((p) => p.signal === 'dante')
    const hasSecondary = ports.some((p) => roleOf(p.label) === 'secondaire')
    const used = dante.get(n.id)
    if (hasSecondary && used?.has('primaire') && !used.has('secondaire')) notes.push(`${n.data.name} : Dante secondaire libre, pas de redondance`)
  }
  return { links, notes }
}
