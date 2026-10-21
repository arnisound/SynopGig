/** Where a cable starts and ends on screen, and on which side of its devices. */
export interface CableEnds {
  id: string
  sx: number
  sy: number
  tx: number
  ty: number
  sp: 'left' | 'right' | 'top' | 'bottom'
  tp: 'left' | 'right' | 'top' | 'bottom'
}

export interface Lane {
  centerX?: number
  offset: number
}

const GAP = 10
const MARGIN = 16

/**
 * Gives every right-angle cable its own vertical run: when two runs would
 * sit on the same x over overlapping heights, the next one moves aside by
 * one lane. Cables that leave a device on the same side get different
 * stub lengths, so their first bends do not merge either.
 */
export function allocateLanes(cables: CableEnds[]): Map<string, Lane> {
  const lanes = new Map<string, Lane>()
  const placed: { x: number; y0: number; y1: number }[] = []
  const stubs = new Map<string, number>()

  const forward = (c: CableEnds) =>
    (c.sp === 'right' && c.tp === 'left' && c.tx - c.sx > MARGIN * 2) || (c.sp === 'left' && c.tp === 'right' && c.sx - c.tx > MARGIN * 2)

  const ordered = [...cables].sort((a, b) => (a.sx + a.tx) / 2 - (b.sx + b.tx) / 2 || a.sy - b.sy)
  for (const c of ordered) {
    // Cables starting from the same side of the same column fan out at different depths.
    const key = `${Math.round(c.sx / 40)}|${c.sp}`
    const k = stubs.get(key) ?? 0
    stubs.set(key, k + 1)
    const offset = 16 + (k % 6) * 6
    if (!forward(c)) {
      lanes.set(c.id, { offset })
      continue
    }
    const lo = Math.min(c.sx, c.tx) + MARGIN
    const hi = Math.max(c.sx, c.tx) - MARGIN
    const base = (c.sx + c.tx) / 2
    const y0 = Math.min(c.sy, c.ty) - GAP / 2
    const y1 = Math.max(c.sy, c.ty) + GAP / 2
    let x = base
    for (let i = 0; i < 80; i++) {
      // 0, +1, -1, +2, -2... lanes away from the middle.
      const step = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2)
      const cand = base + step * GAP
      if (cand < lo || cand > hi) continue
      if (!placed.some((p) => Math.abs(p.x - cand) < GAP - 1 && p.y0 < y1 && y0 < p.y1)) {
        x = cand
        break
      }
    }
    placed.push({ x, y0, y1 })
    lanes.set(c.id, { centerX: x, offset })
  }
  return lanes
}
