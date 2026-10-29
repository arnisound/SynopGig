import { describe, expect, it } from 'vitest'
import { demoProject } from '../project'
import { makeBlock, placeBlock } from './blocks'

describe('blocks', () => {
  const p = demoProject()
  const linked = p.edges.find((e) => e.source !== e.target)!
  const ids = [linked.source, linked.target]

  it('keeps the devices and the cables between them only', () => {
    const b = makeBlock(p, ids, 'Test')
    expect(b.nodes).toHaveLength(2)
    expect(b.edges.length).toBeGreaterThan(0)
    expect(b.edges.every((e) => ids.includes(e.source) && ids.includes(e.target))).toBe(true)
    expect(Math.min(...b.nodes.map((n) => n.position.x))).toBe(0)
  })

  it('drops a copy with new ids, unique names and new cable numbers', () => {
    const b = makeBlock(p, ids, 'Test')
    const next = placeBlock(p, b, { x: 1000, y: 1000 })
    const added = next.nodes.slice(p.nodes.length)
    expect(added).toHaveLength(2)
    expect(added.every((n) => !p.nodes.some((o) => o.id === n.id || o.data.name === n.data.name))).toBe(true)
    const newEdges = next.edges.slice(p.edges.length)
    expect(newEdges).toHaveLength(b.edges.length)
    const cableIds = next.edges.map((e) => e.data?.cableId)
    expect(new Set(cableIds).size).toBe(cableIds.length)
    expect(newEdges.every((e) => added.some((n) => n.id === e.source) && added.some((n) => n.id === e.target))).toBe(true)
  })
})
