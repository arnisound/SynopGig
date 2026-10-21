import type { ReactNode } from 'react'
import { SIGNALS } from '../data/connectors'
import type { Project } from '../types'
import SynopticSvg from './SynopticSvg'
import { synopticLayout, type Region, type SynopticFilter } from './synopticLayout'

export type SynopticMode = 'fit' | 'tiles'

// A4 printable area with the file's 12 mm margins, minus the title and the legend.
// Wide drawings are turned a quarter on the sheet (262 × 186 mm once turned).
const PORTRAIT = { w: 186, h: 236 }
const LANDSCAPE = { w: 262, h: 160 }
/** Sheets print at a readable scale: 0.22 mm per screen pixel (port labels ≈ 5.6 pt, names ≈ 7.5 pt). */
const TILE_SCALE = 0.22
const OVERLAP = 30

const letters = (i: number) => String.fromCharCode(65 + (i % 26))

/** A4 sheet; a wide drawing is turned a quarter on it. */
function Page({ wide, children }: { wide: boolean; children: ReactNode }) {
  return wide ? (
    <section className="d-page d-wide">
      <div className="d-turn">{children}</div>
    </section>
  ) : (
    <section className="d-page">{children}</section>
  )
}

function Legend() {
  return (
    <div className="d-legend">
      {Object.values(SIGNALS).map((s) => (
        <span key={s.label}>
          <i style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

/**
 * The synoptic on A4: the whole drawing on one page (portrait or landscape,
 * whichever fits it best), or, for big shows, an overview with a grid and
 * one sheet per grid cell, printed large enough to read every port.
 */
export default function SynopticPages({
  project,
  title,
  filter,
  mode,
  colorByCable,
  endTags,
}: {
  project: Project
  title: string
  filter: SynopticFilter
  mode: SynopticMode
  colorByCable: boolean
  endTags: boolean
}) {
  const layout = synopticLayout(project, filter)
  if (!layout) return null
  const { bounds } = layout
  const sheets = (b: { w: number; h: number }) => ({
    cols: Math.max(1, Math.ceil((bounds.w * TILE_SCALE) / b.w)),
    rows: Math.max(1, Math.ceil((bounds.h * TILE_SCALE) / b.h)),
  })
  const count = (b: { w: number; h: number }) => sheets(b).cols * sheets(b).rows
  // One page: the orientation that matches the drawing. Sheets: the one that needs fewer.
  const landscape =
    mode === 'tiles' && count(LANDSCAPE) !== count(PORTRAIT) ? count(LANDSCAPE) < count(PORTRAIT) : bounds.w / bounds.h > 1.15
  const box = landscape ? LANDSCAPE : PORTRAIT
  const common = { project, filter, colorByCable, endTags }
  const { cols, rows } = sheets(box)
  const tiled = mode === 'tiles' && cols * rows > 1
  const tw = bounds.w / cols
  const th = bounds.h / rows
  const region = (c: number, r: number): Region => ({
    x: bounds.x + c * tw - (c > 0 ? OVERLAP : 0),
    y: bounds.y + r * th - (r > 0 ? OVERLAP : 0),
    w: tw + (c > 0 ? OVERLAP : 0) + (c < cols - 1 ? OVERLAP : 0),
    h: th + (r > 0 ? OVERLAP : 0) + (r < rows - 1 ? OVERLAP : 0),
  })

  return (
    <>
      <Page wide={landscape}>
        <h2>
          {title}
          {tiled && <small> — vue d’ensemble, {cols * rows} planches à assembler</small>}
        </h2>
        <SynopticSvg {...common} boxMm={box} grid={tiled ? { cols, rows, tw, th } : undefined} />
        <Legend />
      </Page>
      {tiled &&
        Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <Page key={`${r}-${c}`} wide={landscape}>
              <h2>
                {title} <small>— planche {letters(c)}{r + 1} (colonne {letters(c)}, rangée {r + 1}, sur {cols} × {rows})</small>
              </h2>
              <SynopticSvg {...common} boxMm={box} region={region(c, r)} />
              <Legend />
            </Page>
          )),
        )}
    </>
  )
}
