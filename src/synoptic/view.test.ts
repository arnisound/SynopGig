import { describe, expect, it } from 'vitest'
import { demoProject } from '../project'
import { DEFAULT_VIEW, viewOf, visibleParts } from './view'

describe('synoptic view options', () => {
  const p = demoProject()

  it('shows everything by default, older projects included', () => {
    const v = viewOf({ ...p, view: undefined })
    expect(v).toEqual(DEFAULT_VIEW)
    const parts = visibleParts(p, v)
    expect(parts.nodeIds.size).toBe(p.nodes.length)
    expect(parts.edgeIds.size).toBe(p.edges.length)
  })

  it('hides the cables of a signal', () => {
    const parts = visibleParts(p, { ...DEFAULT_VIEW, hiddenSignals: ['power'] })
    expect(parts.edgeIds.size).toBeLessThan(p.edges.length)
    expect(parts.edgeIds.size).toBeGreaterThan(0)
  })

  it('keeps one department, with what it is plugged into as context', () => {
    const parts = visibleParts(p, { ...DEFAULT_VIEW, department: 'Lumière' })
    const light = p.nodes.filter((n) => n.data.category === 'Lumière')
    for (const n of light) expect(parts.nodeIds.has(n.id)).toBe(true)
    for (const id of parts.context) expect(p.nodes.find((n) => n.id === id)?.data.category).not.toBe('Lumière')
    expect(parts.nodeIds.size).toBeLessThan(p.nodes.length)
  })
})
