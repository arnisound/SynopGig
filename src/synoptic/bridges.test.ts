import { describe, expect, it } from 'vitest'
import { bridgedPath, corners, findBridges, type Pt } from './bridges'

describe('crossing bridges', () => {
  it('reads the corners of a right-angle path', () => {
    expect(corners('M0 0L20 0L 90,0Q 90,0 90,0L 90,100Q 90,100 90,100L180 100L200 100')).toEqual([[0, 0], [90, 0], [90, 100], [200, 100]])
  })

  it('makes the horizontal cable jump over the vertical one, away from the bends', () => {
    const paths = new Map<string, Pt[]>([
      ['h', [[0, 50], [200, 50]]],
      ['v', [[100, 0], [100, 120]]],
      ['corner', [[0, 0], [190, 0], [190, 120]]],
    ])
    const hops = findBridges(paths, 5, 8)
    expect(hops.get('h')).toEqual([[100]])
    expect(hops.has('v')).toBe(false)
    // Its bend is too close to where the other cable starts: no bridge there.
    expect(hops.has('corner')).toBe(false)
    expect(bridgedPath([[0, 50], [200, 50]], 6, [[100]], 5)).toBe('M0 50L95 50A5 5 0 0 1 105 50L200 50')
  })

  it('rounds the bends and draws the arc above when the cable runs leftwards', () => {
    expect(bridgedPath([[200, 50], [0, 50]], 6, [[100]], 5)).toBe('M200 50L105 50A5 5 0 0 0 95 50L0 50')
    expect(bridgedPath([[0, 0], [100, 0], [100, 100]], 6, undefined, 5)).toBe('M0 0L94 0Q100 0 100 6L100 100')
  })
})
