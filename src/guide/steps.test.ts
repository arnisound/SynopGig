import { describe, expect, it } from 'vitest'
import { demoProject } from '../project'
import { buildGuide, findSteps } from './steps'

describe('guide search', () => {
  const p = demoProject()
  const sections = buildGuide(p)
  const edge = p.edges.find((e) => e.data?.cableId)!
  const cable = edge.data!.cableId

  it('finds a cable by its id, however it is typed', () => {
    const typed = cable.toLowerCase().replace(/-/g, ' ')
    const found = findSteps(sections, typed).flatMap((s) => s.steps)
    expect(found.length).toBeGreaterThan(0)
    expect(found.map((st) => st.id)).toContain(`cable-${edge.id}`)
    expect(found).toHaveLength(1)
  })

  it('leaves out what is done', () => {
    const first = sections.flatMap((s) => s.steps)[0]
    const left = findSteps(sections, '', { [first.id]: true }).flatMap((s) => s.steps)
    expect(left.some((st) => st.id === first.id)).toBe(false)
    expect(left.length).toBe(sections.flatMap((s) => s.steps).length - 1)
  })
})
