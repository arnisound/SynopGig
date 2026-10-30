import { describe, expect, it } from 'vitest'
import { LIBRARY } from './library'
import { auditCatalog } from './catalog.audit'

describe('catalogue', () => {
  it('follows the technician rules', () => {
    const bad = auditCatalog(LIBRARY).map(({ t, problems }) => `${t.brand} ${t.model} (${t.family}) : ${problems.join(' ; ')}`)
    expect(bad).toEqual([])
  })
})
