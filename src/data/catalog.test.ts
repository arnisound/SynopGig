import { describe, expect, it } from 'vitest'
import { LIBRARY } from './library'
import { auditCatalog } from './catalog.audit'
import { sheetIds } from './catalog/sheets'
import { symbolKey } from './symbolKey'

describe('catalogue', () => {
  it('follows the technician rules', () => {
    const bad = auditCatalog(LIBRARY).map(({ t, problems }) => `${t.brand} ${t.model} (${t.family}) : ${problems.join(' ; ')}`)
    expect(bad).toEqual([])
  })

  it('has no sheet or consumption written for a model that does not exist', () => {
    const ids = new Set(LIBRARY.map((t) => t.id))
    expect(sheetIds().filter((id) => !ids.has(id))).toEqual([])
  })

  it('gives every brand model its documentation links', () => {
    expect(LIBRARY.filter((t) => t.brand && t.brand !== 'Générique' && !t.docs?.length).map((t) => t.id)).toEqual([])
    for (const t of LIBRARY) for (const d of t.docs ?? []) expect(d.url).toMatch(/^https:\/\//)
  })

  it('draws every model with a symbol of its kind', () => {
    expect(LIBRARY.filter((t) => !t.panel && symbolKey(t) === 'box').map((t) => t.id)).toEqual([])
  })

  it('has unique model ids', () => {
    const ids = LIBRARY.map((t) => t.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
  })
})
