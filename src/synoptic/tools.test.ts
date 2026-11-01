import { describe, expect, it } from 'vitest'
import { LIBRARY } from '../data/library'
import { balancePhases, powerBudget } from '../power/power'
import { connectPorts, createDevice, emptyProject } from '../project'
import type { DeviceTemplate, Project } from '../types'
import { addressDmx, autoLayout, chainDevices, dmxIssues } from './tools'

const tpl = (id: string) => LIBRARY.find((t) => t.id === id)!
function withDevices(ids: string[], spread = 300): Project {
  let p = emptyProject()
  ids.forEach((id, i) => {
    const n = createDevice(tpl(id), { x: i * spread, y: 0 }, p.nodes)
    p = { ...p, nodes: [...p.nodes, n] }
  })
  return p
}

describe('synoptic tools', () => {
  it('chains a row of fixtures, DMX and power through, left to right', () => {
    const p = withDevices(['robe-megapointe', 'robe-megapointe', 'robe-megapointe'])
    const { project, added } = chainDevices(p, p.nodes.map((n) => n.id))
    expect(added).toBe(4)
    const [a, b] = project.nodes
    expect(project.edges.some((e) => e.source === a.id && e.sourceHandle === 'dmxOut' && e.target === b.id && e.targetHandle === 'dmxIn')).toBe(true)
    expect(project.edges.some((e) => e.source === a.id && e.sourceHandle === 'pwr-out' && e.target === b.id && e.targetHandle === 'pwr')).toBe(true)
  })

  it('addresses fixtures one after the other by their mode, and finds overlaps', () => {
    let p = withDevices(['robe-megapointe', 'robe-megapointe'])
    p = { ...p, nodes: p.nodes.map((n) => ({ ...n, data: { ...n.data, config: { mode: 'Mode 1 (39 ch)' } } })) }
    p = addressDmx(p, p.nodes.map((n) => n.id), 1, 1, 16)
    expect(p.nodes.map((n) => n.data.config.dmxAddress)).toEqual(['1', '40'])
    expect(dmxIssues(p).size).toBe(0)
    const clash = { ...p, nodes: p.nodes.map((n, i) => (i === 1 ? { ...n, data: { ...n.data, config: { ...n.data.config, dmxAddress: '20' } } } : n)) }
    expect([...dmxIssues(clash).values()].flat()[0]).toMatch(/chevauche/)
  })

  it('balances the phases of a three-phase cabinet', () => {
    let p = withDevices(['src-63-tri', 'conv-63-32mono'])
    const [src, box] = p.nodes
    p = connectPorts(p, { node: src.id, port: 'out' }, { node: box.id, port: 'in' })!
    const amp = (w: number): DeviceTemplate => ({ id: `a${w}`, model: `Ampli ${w}`, category: 'Son', watts: w, ports: [{ id: 'pwr', label: 'Secteur', connector: 'p17-32a-mono', signal: 'power', dir: 'in' }] })
    for (const [i, w] of [3000, 3000, 1000].entries()) {
      const n = createDevice(amp(w), { x: 0, y: 0 }, p.nodes)
      p = { ...p, nodes: [...p.nodes, n] }
      p = connectPorts(p, { node: box.id, port: `p32m${i + 1}` }, { node: n.id, port: 'pwr' })!
    }
    // Everything on L1 first: unbalanced.
    p = { ...p, power: { phases: Object.fromEntries([1, 2, 3].map((i) => [`${box.id}:p32m${i}`, 'L1' as const])) } }
    expect(powerBudget(p).boardAlerts.length).toBeGreaterThan(0)
    const balanced = { ...p, power: { phases: balancePhases(p) } }
    const s = powerBudget(balanced).sources.find((x) => x.node.id === box.id)!
    expect(new Set(s.outlets.map((o) => o.phase)).size).toBe(3)
  })

  it('lays the drawing out without two devices on the same spot', () => {
    const p = withDevices(['shure-sm58', 'yam-cl5', 'robe-megapointe', 'luminex-gc10'], 0)
    const out = autoLayout(p, () => ({ w: 200, h: 150 }))
    expect(new Set(out.nodes.map((n) => `${n.position.x},${n.position.y}`)).size).toBe(4)
  })
})
