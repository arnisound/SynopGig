import type { FlightCase } from '../types'

/** All dimensions in millimetres. */
export const U = 44.45

export function caseHeightMm(fc: FlightCase) {
  return fc.kind === 'rack' ? Math.round(fc.rackU * U + 120) : fc.height * 10
}

export function bannerSize(fc: FlightCase) {
  const w = fc.width * 10
  const h = caseHeightMm(fc)
  const bw = Math.round(w * 0.72)
  const bh = Math.round(Math.min(Math.max(h * 0.22, 90), 220))
  return { bw, bh }
}
