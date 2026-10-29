import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('location', { origin: 'https://arnisoundtools.com', pathname: '/synopgig/', hash: '' })
import { demoProject } from '../project'
import { sharedIdFromHash, sharedTargetFromHash, shareLink } from '../share/share'
import { cableLabels, caseLabels, deviceLabels } from './labels'

describe('labels', () => {
  const p = demoProject()

  it('has a label per cable with its two ends', () => {
    const l = cableLabels(p)
    expect(l.length).toBe(p.edges.filter((e) => e.data?.cableId).length)
    expect(l[0].from).toContain(' · ')
    expect(l[0].to).toContain(' · ')
  })

  it('gives devices and cases a QR code once the project is shared, opening them', () => {
    expect(deviceLabels(p)[0].qr).toBeUndefined()
    const shared = { ...p, share: { id: 'AbCdEf1234' } }
    const dev = deviceLabels(shared)[0]
    expect(dev.qr).toMatch(/#\/p\/AbCdEf1234\/device\//)
    if (p.cases.length) expect(caseLabels(shared)[0].qr).toMatch(/#\/p\/AbCdEf1234\/case\//)
  })

  it('reads the target of a shared link', () => {
    const link = shareLink('AbCdEf1234', { kind: 'case', id: 'fc-12' })
    const hash = link.slice(link.indexOf('#'))
    expect(sharedIdFromHash(hash)).toBe('AbCdEf1234')
    expect(sharedTargetFromHash(hash)).toEqual({ kind: 'case', id: 'fc-12' })
    expect(sharedTargetFromHash('#/p/AbCdEf1234')).toBeUndefined()
  })
})
