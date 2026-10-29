import { describe, expect, it } from 'vitest'
import { demoProject } from '../project'
import { projectChanges } from './changes'

describe('project changes', () => {
  const p = demoProject()

  it('sees nothing when nothing changed', () => {
    expect(projectChanges(p, structuredClone(p))).toEqual([])
  })

  it('names what changed', () => {
    const next = structuredClone(p)
    const [a, b] = next.nodes
    a.data.name = 'Nouveau nom'
    b.data.config.ip = '10.0.0.9'
    const gone = next.edges.pop()!
    next.edges[0].data = { ...next.edges[0].data!, length: 25 }
    next.nodes.push({ ...structuredClone(a), id: 'd-new', data: { ...structuredClone(a.data), name: 'Ajout' } })
    const c = projectChanges(p, next)
    expect(c).toContain(`Équipement renommé : ${p.nodes[0].data.name} → Nouveau nom`)
    expect(c.some((l) => l.startsWith(`${b.data.name} : IP`))).toBe(true)
    expect(c.some((l) => l.startsWith(`Câble ${gone.data?.cableId} retiré`))).toBe(true)
    expect(c.some((l) => l.includes('→ 25 m'))).toBe(true)
    expect(c.some((l) => l.startsWith('Équipement ajouté : Ajout'))).toBe(true)
    expect(c.some((l) => l.includes('rebranché'))).toBe(false)
  })
})
