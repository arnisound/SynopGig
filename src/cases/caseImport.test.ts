import { describe, expect, it } from 'vitest'
import { applySpec, cleanSpec, parseCaseText } from './caseImport'
import { createCase } from '../project'

describe('case from a shop page', () => {
  it('reads a rack case page', () => {
    const s = parseCaseText(
      `Titre : Flyht Pro Rack 8U Double Door - Thomann
       Dimensions extérieures (l x h x p) | 53 x 44 x 60 cm
       Dimensions intérieures (l x h x p) | 48 x 36 x 45 cm
       Poids | 14,5 kg
       Roulettes : non`,
      'Flyht Pro Rack 8U Double Door - Thomann',
    )
    expect(s).toMatchObject({ name: 'Flyht Pro Rack 8U Double Door', kind: 'rack', rackU: 8, width: 53, height: 44, depth: 60, weight: 14.5 })
  })

  it('reads labelled sizes in millimetres, prefers outside sizes', () => {
    const s = parseCaseText(
      `Innenmaße: Breite 600 mm, Höhe 300 mm
       Width: 820 mm
       Height: 410 mm
       Depth: 700 mm
       Weight: 32 kg
       With 4 castors`,
      'Console case for DM7 - Shop',
    )
    expect(s).toMatchObject({ kind: 'console', width: 82, height: 41, depth: 70, weight: 32, wheels: true })
  })

  it('keeps only sane values', () => {
    expect(cleanSpec({ rackU: 99, width: -3, weight: 'x', kind: 'boat', name: '<b>' })).toEqual({
      name: 'b',
      kind: undefined,
      rackU: undefined,
      width: undefined,
      height: undefined,
      depth: undefined,
      weight: undefined,
      wheels: undefined,
      handles: undefined,
    })
  })

  it('builds the case', () => {
    const fc = applySpec(createCase([]), { name: 'Malle 120', kind: 'malle', width: 120, height: 60, depth: 60, weight: 25, wheels: true, source: 'https://shop.example/malle' })
    expect(fc).toMatchObject({ name: 'Malle 120', kind: 'malle', width: 120, emptyWeight: 25, wheels: true, source: 'https://shop.example/malle' })
  })
})
