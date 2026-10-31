/*
 * Crossing bridges: where two right-angle cables cross, the horizontal one
 * jumps over the vertical one with a small arc, as on a wiring diagram, so
 * a crossing never reads as a junction.
 */

export type Pt = [number, number]

/** The corners of a right-angle path drawn without rounding (React Flow's smooth-step path). */
export function corners(d: string): Pt[] {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  const pts: Pt[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const p: Pt = [nums[i], nums[i + 1]]
    const last = pts.at(-1)
    if (!last || Math.abs(last[0] - p[0]) > 0.5 || Math.abs(last[1] - p[1]) > 0.5) pts.push(p)
  }
  // Drop the points in the middle of a straight run.
  return pts.filter((p, i) => {
    const a = pts[i - 1]
    const b = pts[i + 1]
    if (!a || !b) return true
    return !((Math.abs(a[0] - p[0]) < 0.5 && Math.abs(p[0] - b[0]) < 0.5) || (Math.abs(a[1] - p[1]) < 0.5 && Math.abs(p[1] - b[1]) < 0.5))
  })
}

const horizontal = (a: Pt, b: Pt) => Math.abs(a[1] - b[1]) < 0.5 && Math.abs(a[0] - b[0]) >= 0.5
const vertical = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) >= 0.5

/**
 * For each cable, the x of its bridges on each of its segments: wherever one
 * of its horizontal runs crosses another cable's vertical run. `clear` keeps
 * bridges away from the bends, where they would not read.
 */
export function findBridges(paths: Map<string, Pt[]>, hop: number, clear: number): Map<string, number[][]> {
  const verticals: { id: string; x: number; y0: number; y1: number }[] = []
  for (const [id, pts] of paths)
    for (let i = 0; i + 1 < pts.length; i++)
      if (vertical(pts[i], pts[i + 1])) verticals.push({ id, x: pts[i][0], y0: Math.min(pts[i][1], pts[i + 1][1]), y1: Math.max(pts[i][1], pts[i + 1][1]) })

  const out = new Map<string, number[][]>()
  for (const [id, pts] of paths) {
    const segs: number[][] = []
    let any = false
    for (let i = 0; i + 1 < pts.length; i++) {
      const [a, b] = [pts[i], pts[i + 1]]
      const xs: number[] = []
      if (horizontal(a, b)) {
        const lo = Math.min(a[0], b[0]) + clear + hop
        const hi = Math.max(a[0], b[0]) - clear - hop
        const y = a[1]
        for (const v of verticals) if (v.id !== id && v.x > lo && v.x < hi && y > v.y0 + clear && y < v.y1 - clear) xs.push(v.x)
        // In the direction of travel; two bridges never overlap.
        xs.sort((p, q) => (b[0] > a[0] ? p - q : q - p))
        const kept: number[] = []
        for (const x of xs) if (!kept.length || Math.abs(x - kept.at(-1)!) > hop * 2 + 2) kept.push(x)
        xs.splice(0, xs.length, ...kept)
      }
      if (xs.length) any = true
      segs.push(xs)
    }
    if (any) out.set(id, segs)
  }
  return out
}

/** The SVG path through the corners, rounded by `radius`, with a bridge (arc of radius `hop`) at each crossing. */
export function bridgedPath(pts: Pt[], radius: number, hops: number[][] | undefined, hop: number): string {
  if (pts.length < 2) return ''
  const r = (i: number) => {
    if (i <= 0 || i >= pts.length - 1) return 0
    const [a, p, b] = [pts[i - 1], pts[i], pts[i + 1]]
    return Math.min(radius, Math.hypot(p[0] - a[0], p[1] - a[1]) / 2, Math.hypot(b[0] - p[0], b[1] - p[1]) / 2)
  }
  const toward = (from: Pt, to: Pt, d: number): Pt => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
    return [from[0] + ((to[0] - from[0]) * d) / len, from[1] + ((to[1] - from[1]) * d) / len]
  }
  const f = (n: number) => Math.round(n * 10) / 10
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i + 1 < pts.length; i++) {
    const [a, b] = [pts[i], pts[i + 1]]
    const dir = b[0] > a[0] ? 1 : -1
    for (const x of hops?.[i] ?? []) {
      // The arc rises above the line, whichever way the cable runs.
      d += `L${f(x - dir * hop)} ${f(a[1])}A${hop} ${hop} 0 0 ${dir > 0 ? 1 : 0} ${f(x + dir * hop)} ${f(a[1])}`
    }
    const rb = r(i + 1)
    const end = toward(b, a, rb)
    d += `L${f(end[0])} ${f(end[1])}`
    if (rb > 0) {
      const next = toward(b, pts[i + 2], rb)
      d += `Q${f(b[0])} ${f(b[1])} ${f(next[0])} ${f(next[1])}`
    }
  }
  return d
}
