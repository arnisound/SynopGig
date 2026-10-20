import { describe, expect, it } from 'vitest'
import { LIBRARY } from './data/library'
import { emptyPanel, fillHoles, HOLE_TYPES, panelPorts } from './data/panels'
import {
  connectPorts,
  createDevice,
  demoProject,
  emptyProject,
  internalRack,
  rackOfNode,
  resolveCables,
  setPanel,
  throughPanels,
} from './project'

const tpl = (id: string) => LIBRARY.find((t) => t.id === id)!

describe('library', () => {
  it('has unique template ids', () => {
    const ids = LIBRARY.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has unique port ids inside each template', () => {
    for (const t of LIBRARY) {
      const ids = t.ports.map((p) => p.id)
      expect(new Set(ids).size, t.id).toBe(ids.length)
    }
  })

  it('covers sound, lighting and video brands', () => {
    for (const cat of ['Son', 'Lumière', 'Vidéo'] as const) {
      expect(LIBRARY.filter((t) => t.category === cat && t.brand).length).toBeGreaterThan(15)
    }
  })
})

describe('patch panels', () => {
  it('turns each hole into an outside and an inside port', () => {
    const spec = fillHoles(emptyPanel(1), 0, 2, HOLE_TYPES[0], 'in', 'MIC')
    const ports = panelPorts(spec)
    expect(ports.map((p) => [p.id, p.dir, p.label])).toEqual([
      ['h1-int', 'out', 'MIC 1'],
      ['h1-ext', 'in', 'MIC 1'],
      ['h2-int', 'out', 'MIC 2'],
      ['h2-ext', 'in', 'MIC 2'],
    ])
  })

  it('drops cables on removed holes', () => {
    let p = emptyProject()
    const panel = createDevice(tpl('panel-stage-1u'), { x: 0, y: 0 }, [])
    const sb = createDevice(tpl('yam-rio1608'), { x: 0, y: 0 }, [])
    p = { ...p, nodes: [panel, sb] }
    p = connectPorts(p, { node: panel.id, port: 'h1-int' }, { node: sb.id, port: 'in1' })!
    expect(p.edges).toHaveLength(1)
    p = setPanel(p, panel.id, fillHoles(panel.data.panel!, 0, 1, null, 'in', ''))
    expect(p.edges).toHaveLength(0)
  })
})

describe('cabling', () => {
  it('stores cables from output to input', () => {
    const mic = createDevice(tpl('shure-sm58'), { x: 0, y: 0 }, [])
    const sb = createDevice(tpl('yam-rio1608'), { x: 0, y: 0 }, [])
    const p = connectPorts({ ...emptyProject(), nodes: [mic, sb] }, { node: sb.id, port: 'in1' }, { node: mic.id, port: 'out' })!
    expect(p.edges[0]).toMatchObject({ source: mic.id, target: sb.id })
  })

  it('refuses a busy port unless asked to replace', () => {
    const mic = createDevice(tpl('shure-sm58'), { x: 0, y: 0 }, [])
    const mic2 = createDevice(tpl('shure-sm58'), { x: 0, y: 0 }, [mic])
    const sb = createDevice(tpl('yam-rio1608'), { x: 0, y: 0 }, [])
    let p = connectPorts({ ...emptyProject(), nodes: [mic, mic2, sb] }, { node: mic.id, port: 'out' }, { node: sb.id, port: 'in1' })!
    expect(connectPorts(p, { node: mic2.id, port: 'out' }, { node: sb.id, port: 'in1' })).toBeNull()
    p = connectPorts(p, { node: mic2.id, port: 'out' }, { node: sb.id, port: 'in1' }, true)!
    expect(p.edges).toHaveLength(1)
    expect(p.edges[0].source).toBe(mic2.id)
  })
})

describe('demo project', () => {
  const p = demoProject()

  it('has no wiring issue', () => {
    const bad = resolveCables(p.nodes, p.edges).filter((c) => c.issues.length)
    expect(bad.map((c) => `${c.edge.data?.cableId}: ${c.issues.map((i) => i.message)}`)).toEqual([])
  })

  it('follows the mic through the patch panel to the stagebox', () => {
    const panel = p.nodes.find((n) => n.data.panel)!
    const end = throughPanels(p.nodes, p.edges, { node: panel.id, port: 'h1-ext' })
    expect(end?.node.data.name).toBe('Stagebox plateau')
    expect(end?.port.id).toBe('in1')
  })

  it('tells rack-internal cables from site cables', () => {
    const racks = rackOfNode(p.cases)
    const internal = p.edges.filter((e) => internalRack(racks, e))
    expect(internal.length).toBe(17)
    expect(p.edges.length - internal.length).toBe(9)
  })
})

describe('wireless and multipin chains', () => {
  const chain = (links: [string, string, string, string][]) => {
    const ids = [...new Set(links.flatMap(([a, , b]) => [a, b]))]
    const nodes = ids.map((id) => createDevice(tpl(id), { x: 0, y: 0 }, []))
    const byTpl = new Map(nodes.map((n) => [n.data.templateId, n.id]))
    let p = { ...emptyProject(), nodes }
    for (const [a, ap, b, bp] of links) {
      p = connectPorts(p, { node: byTpl.get(a)!, port: ap }, { node: byTpl.get(b)!, port: bp })!
      expect(p).not.toBeNull()
    }
    return resolveCables(p.nodes, p.edges).flatMap((c) => c.issues.map((i) => `${c.fromPort?.label} → ${c.toPort?.label}: ${i.message}`))
  }

  it('antennas → distributor → receiver', () => {
    expect(
      chain([
        ['shure-ua874', 'out', 'shure-ua844', 'antA'],
        ['shure-ua860', 'out', 'shure-ua844', 'antB'],
        ['shure-ua844', 'outA1', 'shure-ad4q', 'antA'],
        ['shure-ua844', 'outB1', 'shure-ad4q', 'antB'],
        ['shure-ad4q', 'out1', 'yam-rio1608', 'in1'],
      ]),
    ).toEqual([])
  })

  it('in-ear transmitters → combiner → helical antenna', () => {
    expect(
      chain([
        ['shure-p9t', 'ant', 'shure-pa821', 'in1'],
        ['senn-sr-iem-g4', 'ant', 'shure-pa821', 'in2'],
        ['shure-pa821', 'ant', 'rfvenue-cp-beam', 'in'],
      ]),
    ).toEqual([])
  })

  it('stage box → RMP 54p multicore → console fan-out', () => {
    expect(
      chain([
        ['rmp54-box', 'rmp', 'rmp54-fanout-out', 'rmp'],
        ['rmp54-fanout-out', 'out1', 'yam-cl5', 'in1'],
      ]),
    ).toEqual([])
  })

  it('includes the requested ranges', () => {
    const has = (brand: string, model: string) => LIBRARY.some((t) => t.brand === brand && t.model.includes(model))
    expect(has('Roland', 'V-160HD')).toBe(true)
    expect(has('Panasonic', 'AW-RP150')).toBe(true)
    expect(has('Fohhn', 'LFI-450')).toBe(true)
    expect(has('Axiom Pro Audio', 'AX2010A')).toBe(true)
    expect(has('Agora', 'Ghost G2')).toBe(true)
    expect(has('Shure', 'UA844')).toBe(true)
  })
})
