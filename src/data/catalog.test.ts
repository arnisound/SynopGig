import { describe, expect, it } from 'vitest'
import { LIBRARY } from './library'
import { auditCatalog } from './catalog.audit'
import { sheetIds } from './catalog/sheets'
import { mediaIds } from './catalog/media'
import { symbolKey } from './symbolKey'

describe('catalogue', () => {
  it('follows the technician rules', () => {
    const bad = auditCatalog(LIBRARY).map(({ t, problems }) => `${t.brand} ${t.model} (${t.family}) : ${problems.join(' ; ')}`)
    expect(bad).toEqual([])
  })

  it('has no sheet or consumption written for a model that does not exist', () => {
    const ids = new Set(LIBRARY.map((t) => t.id))
    expect([...sheetIds(), ...mediaIds()].filter((id) => !ids.has(id))).toEqual([])
  })

  it('gives every brand model its documentation links', () => {
    expect(LIBRARY.filter((t) => t.brand && t.brand !== 'Générique' && !t.docs?.length).map((t) => t.id)).toEqual([])
    for (const t of LIBRARY) for (const d of t.docs ?? []) {
      expect(d.url).toMatch(/^https:\/\//)
      // Direct links only: never a search page.
      expect(d.url).not.toMatch(/duckduckgo|google\.|bing\.|\?q=/)
    }
  })

  it('shows photos from their own address, never copied in', () => {
    const photos = LIBRARY.filter((t) => t.image)
    expect(photos.length).toBeGreaterThan(500)
    for (const t of photos) expect(t.image).toMatch(/^https:\/\/[^\s"']+$/)
  })

  it('draws every model with a symbol of its kind', () => {
    expect(LIBRARY.filter((t) => !t.panel && symbolKey(t) === 'box').map((t) => t.id)).toEqual([])
  })

  it('says how many cards each product takes', () => {
    expect(LIBRARY.filter((t) => t.options?.length && !t.slots).map((t) => t.id)).toEqual([])
  })

  it('gives every mains-powered model a consumption for the power budget', () => {
    const mains = LIBRARY.filter((t) => !t.panel && t.category !== 'Énergie' && t.ports.some((p) => p.signal === 'power' && p.dir === 'in'))
    expect(mains.filter((t) => !t.watts).map((t) => t.id)).toEqual([])
  })

  it('has unique model ids', () => {
    const ids = LIBRARY.map((t) => t.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
  })
})
