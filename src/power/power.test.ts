import { describe, expect, it } from 'vitest'
import { LIBRARY } from '../data/library'
import { connectPorts, createDevice, emptyProject } from '../project'
import type { DeviceTemplate, Project } from '../types'
import { powerBudget, wattsOf } from './power'

const distro = LIBRARY.find((t) => t.id === 'distro-32')!
const amp = (id: string, watts?: number): DeviceTemplate => ({ id, model: id, category: 'Son', watts, ports: [{ id: 'pwr', label: 'Secteur', connector: 'powercon-true1', signal: 'power', dir: 'in' }, { id: 'thru', label: 'Recopie', connector: 'powercon-true1', signal: 'power', dir: 'out' }] })

function show() {
  let p: Project = emptyProject()
  const add = (t: DeviceTemplate) => {
    const n = createDevice(t, { x: 0, y: 0 }, p.nodes)
    p = { ...p, nodes: [...p.nodes, n] }
    return n
  }
  const d = add(distro)
  const a1 = add(amp('LA4X', 2000))
  const a2 = add(amp('LA4X-2', 2000))
  const a3 = add(amp('Retour', undefined))
  const plug = (from: { id: string }, port: string, to: { id: string }, inPort = 'pwr') => (p = connectPorts(p, { node: from.id, port }, { node: to.id, port: inPort })!)
  const outs = d.data.ports.filter((x) => x.signal === 'power' && x.dir === 'out')
  plug(d, outs[0].id, a1)
  plug(a1, 'thru', a2) // linked: the first outlet carries both
  plug(d, outs[1].id, a3)
  return { p, d, outs }
}

describe('power budget', () => {
  it('adds up what each outlet carries, through linked devices', () => {
    const { p } = show()
    const b = powerBudget(p)
    expect(b.sources).toHaveLength(1)
    const [first, second] = b.sources[0].outlets
    expect(first.watts).toBe(4000)
    expect(first.amps).toBeCloseTo(17.4, 1)
    expect(first.fed.map((n) => n.data.model)).toEqual(['LA4X', 'LA4X-2'])
    // A P17 16 A outlet carrying 17 A: overloaded.
    expect(b.alerts.some((a) => a.includes('surcharge'))).toBe(true)
    expect(second.unknown.map((n) => n.data.model)).toEqual(['Retour'])
  })

  it('spreads the outlets of a three-phase source on L1, L2, L3, as the user sets them', () => {
    const { p, d, outs } = show()
    expect(powerBudget(p).sources[0].outlets.map((o) => o.phase)).toEqual(['L1', 'L2'])
    const set = { ...p, power: { phases: { [`${d.id}:${outs[1].id}`]: 'L1' as const } } }
    const s = powerBudget(set).sources[0]
    expect(s.outlets.map((o) => o.phase)).toEqual(['L1', 'L1'])
    expect(s.phases.L1).toBeCloseTo(17.4, 1)
  })

  it('follows the phases from a supply point through a conversion cabinet', () => {
    let p: Project = emptyProject()
    const add = (t: DeviceTemplate) => {
      const n = createDevice(t, { x: 0, y: 0 }, p.nodes)
      p = { ...p, nodes: [...p.nodes, n] }
      return n
    }
    const tpl = (id: string) => LIBRARY.find((t) => t.id === id)!
    const src = add(tpl('src-63-tri'))
    const box = add(tpl('conv-63-32mono'))
    p = connectPorts(p, { node: src.id, port: 'out' }, { node: box.id, port: 'in' })!
    // 3 kW on the first 32 A outlet (L1), 1.5 kW on the second one (L2).
    const loads = [3000, 1500].map((w, i) => {
      const a = add(amp(`Ampli ${i + 1}`, w))
      p = connectPorts(p, { node: box.id, port: `p32m${i + 1}` }, { node: a.id, port: 'pwr' })!
      return a
    })
    const b = powerBudget(p)
    expect(b.sources.map((s) => s.node.id)).toEqual([src.id, box.id])
    const [supply, cabinet] = b.sources
    expect(supply.threePhase && cabinet.threePhase).toBe(true)
    expect(supply.inletRating).toBe(63)
    expect(cabinet.parent?.id).toBe(src.id)
    expect(cabinet.outlets.map((o) => o.phase)).toEqual(['L1', 'L2'])
    // The supply point sees the cabinet's phases, not an even split.
    expect(supply.phases.L1).toBeCloseTo(3000 / 230, 1)
    expect(supply.phases.L2).toBeCloseTo(1500 / 230, 1)
    expect(supply.phases.L3).toBe(0)
    expect(supply.outlets[0].amps).toBeCloseTo(3000 / 230, 1)
    expect(loads).toHaveLength(2)
  })

  it('reads the consumption written in the characteristics', () => {
    expect(wattsOf({ specs: [{ group: 'Alimentation', label: 'Consommation', value: '1,2', unit: 'kW' }] } as never)).toBe(1200)
    expect(wattsOf({ specs: [{ group: 'Alimentation', label: 'Power consumption', value: '45 W' }] } as never)).toBe(45)
  })

  it('lists the devices fed by nothing', () => {
    const { p } = show()
    const lone = createDevice(amp('Seule', 300), { x: 0, y: 0 }, p.nodes)
    expect(powerBudget({ ...p, nodes: [...p.nodes, lone] }).unpowered.map((n) => n.data.model)).toEqual(['Seule'])
  })
})

describe('PoE', () => {
  it('counts a PoE camera on its switch, not as unpowered', () => {
    let p: Project = emptyProject()
    const add = (id: string) => {
      const n = createDevice(LIBRARY.find((t) => t.id === id)!, { x: 0, y: 0 }, p.nodes)
      p = { ...p, nodes: [...p.nodes, n] }
      return n
    }
    const src = add('src-16-mono')
    const box = add('distro-16-6')
    const sw = add('netgear-m4250')
    const cam = add('pana-ue150')
    p = connectPorts(p, { node: src.id, port: 'out' }, { node: box.id, port: 'in' })!
    const swIn = sw.data.ports.find((x) => x.signal === 'power' && x.dir === 'in')!
    const swPort = sw.data.ports.find((x) => x.signal === 'network' && x.dir === 'io')!
    p = connectPorts(p, { node: box.id, port: 'out1' }, { node: sw.id, port: swIn.id }) ?? p
    p = connectPorts(p, { node: cam.id, port: 'net' }, { node: sw.id, port: swPort.id })!
    const b = powerBudget(p)
    expect(b.unpowered.map((n) => n.data.name)).not.toContain(cam.data.name)
    expect(b.poe[0]?.devices.map((d) => d.id)).toEqual([cam.id])
  })
})
