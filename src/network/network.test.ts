import { expect, it } from 'vitest'
import { demoProject } from '../project'
import type { Project } from '../types'
import { ipIssues, netLinks, parseIp } from './network'

const withIps = (p: Project, ips: Record<number, string>) => ({ ...p, nodes: p.nodes.map((n, i) => (ips[i] ? { ...n, data: { ...n.data, config: { ...n.data.config, ip: ips[i] } } } : { ...n, data: { ...n.data, config: { ...n.data.config, ip: undefined } } })) })

it('reads addresses and flags duplicates, typos and the odd network out', () => {
  expect(parseIp('192.168.1.300')).toBeUndefined()
  expect(parseIp('10.0.0.5/16')).toEqual({ parts: [10, 0, 0, 5], prefix: 16 })
  const p = withIps(demoProject(), { 0: '192.168.1.10', 1: '192.168.1.10', 2: '192.168.1.11', 3: '192.168.2.20', 4: '192.168.1' })
  const issues = ipIssues(p)
  expect(issues.get(p.nodes[0].id)?.[0]).toContain('aussi sur')
  expect(issues.get(p.nodes[3].id)).toEqual(['hors du réseau 192.168.1.x des autres équipements'])
  expect(issues.get(p.nodes[4].id)).toEqual(['adresse IP mal écrite'])
  expect(issues.has(p.nodes[2].id)).toBe(false)
})

it('lists the links carrying network protocols', () => {
  const { links } = netLinks(demoProject())
  expect(links.length).toBeGreaterThan(0)
  expect(links.every((l) => l.protocol)).toBe(true)
})
