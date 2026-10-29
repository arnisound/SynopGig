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
