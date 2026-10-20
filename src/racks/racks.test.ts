import { describe, expect, it } from 'vitest'
import { LIBRARY } from '../data/library'
import { createCase, createDevice, emptyProject, resolveCables } from '../project'
import { mountRack } from './layout'
import { autoWire } from './wiring'

const tpl = (id: string) => LIBRARY.find((t) => t.id === id)!

describe('autoWire', () => {
  it('wires a stage patch panel into a stagebox, switch and power', () => {
    const panel = createDevice(tpl('panel-stage-1u'), { x: 0, y: 0 }, [])
    const sb = createDevice(tpl('yam-rio1608'), { x: 0, y: 0 }, [])
    const sw = createDevice(tpl('luminex-gc10'), { x: 0, y: 0 }, [])
    const pwr = createDevice(tpl('rack-power-1u'), { x: 0, y: 0 }, [])
    const p = { ...emptyProject(), nodes: [panel, sb, sw, pwr] }
    const { project, added } = autoWire(p, panel.id, [panel.id, sb.id, sw.id, pwr.id])
    // 8 mic + 4 returns + 2 network + mains in + mains thru
    expect(added).toBe(16)
    const cables = resolveCables(project.nodes, project.edges)
    expect(cables.filter((c) => c.issues.length)).toEqual([])
    const mic1 = cables.find((c) => c.fromPort?.id === 'h1-int')
    expect(mic1?.to?.id).toBe(sb.id)
    expect(mic1?.toPort?.id).toBe('in1')
    // Never touches the outside face of the panel.
    expect(project.edges.some((e) => e.sourceHandle?.endsWith('-ext') || e.targetHandle?.endsWith('-ext'))).toBe(false)
  })
})

describe('mountRack', () => {
  it('keeps saved positions and stacks the rest in free units', () => {
    const a = createDevice(tpl('yam-rio1608'), { x: 0, y: 0 }, []) // 3U
    const b = createDevice(tpl('luminex-gc10'), { x: 0, y: 0 }, []) // 1U
    const c = createDevice(tpl('la-la4x'), { x: 0, y: 0 }, []) // 2U
    const fc = { ...createCase([]), kind: 'rack' as const, rackU: 6, devices: [a.id, b.id, c.id], rackLayout: { [a.id]: 2 } }
    const { mounted, overflow } = mountRack(fc, [a, b, c])
    expect(mounted.map((m) => [m.node.id, m.top])).toEqual([[b.id, 1], [a.id, 2], [c.id, 5]])
    expect(overflow).toEqual([])
  })

  it('reports devices that do not fit', () => {
    const a = createDevice(tpl('yam-rio3224'), { x: 0, y: 0 }, []) // 4U
    const b = createDevice(tpl('la-la4x'), { x: 0, y: 0 }, []) // 2U
    const fc = { ...createCase([]), kind: 'rack' as const, rackU: 5, devices: [a.id, b.id] }
    expect(mountRack(fc, [a, b]).overflow.map((n) => n.id)).toEqual([b.id])
  })
})
