import { describe, expect, it } from 'vitest'
import { allocateLanes, type CableEnds } from './lanes'

const cable = (id: string, sy: number, ty: number, sx = 0, tx = 400): CableEnds => ({ id, sx, sy, tx, ty, sp: 'right', tp: 'left' })

describe('cable lanes', () => {
  it('never puts two overlapping vertical runs on the same x', () => {
    // Eight cables between the same two devices: the classic bundle.
    const list = Array.from({ length: 8 }, (_, i) => cable(`c${i}`, 100 + i * 28, 300 + i * 28))
    const lanes = allocateLanes(list)
    const xs = list.map((c) => lanes.get(c.id)!.centerX!)
    expect(new Set(xs).size).toBe(8)
    for (const x of xs) expect(x).toBeGreaterThan(0)
    for (const x of xs) expect(x).toBeLessThan(400)
  })

  it('lets cables share an x when their heights do not overlap', () => {
    const lanes = allocateLanes([cable('a', 0, 50), cable('b', 200, 260)])
    expect(lanes.get('a')!.centerX).toBe(lanes.get('b')!.centerX)
  })

  it('gives cables leaving the same side different bend depths', () => {
    const lanes = allocateLanes([cable('a', 0, 0, 0, 0), cable('b', 30, 30, 0, 0)])
    expect(lanes.get('a')!.offset).not.toBe(lanes.get('b')!.offset)
  })
})
