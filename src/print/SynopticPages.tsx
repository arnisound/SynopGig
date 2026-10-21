import type { ReactNode } from 'react'
import { SIGNALS } from '../data/connectors'
import type { Shot } from './SynopticShooter'

export type SynopticMode = 'fit' | 'tiles'

type Box = { w: number; h: number }
type Region = { x: number; y: number; w: number; h: number }

// A4 printable area with the file's 12 mm margins, minus the title and the legend.
// Wide drawings are turned a quarter on the sheet (262 × 186 mm once turned).
const PORTRAIT: Box = { w: 186, h: 236 }
const LANDSCAPE: Box = { w: 262, h: 160 }
/** Sheets print at a readable scale: 0.22 mm per screen pixel. */
const TILE_SCALE = 0.22
const OVERLAP = 30

const letter = (i: number) => String.fromCharCode(65 + (i % 26))

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

/** Part of the picture (or all of it), scaled to fit the box, in millimetres. */
function Picture({ shot, box, region, grid }: { shot: Shot; box: Box; region?: Region; grid?: { cols: number; rows: number; tw: number; th: number } }) {
  const r = region ?? { x: 0, y: 0, w: shot.w, h: shot.h }
  const k = Math.min(box.w / r.w, box.h / r.h)
  const mm = (v: number) => `${v * k}mm`
  return (
    <div className="d-shot" style={{ width: mm(r.w), height: mm(r.h) }}>
      <img src={shot.url} alt="" style={{ width: mm(shot.w), height: mm(shot.h), left: mm(-r.x), top: mm(-r.y) }} />
      {grid &&
        Array.from({ length: grid.rows }, (_, row) =>
          Array.from({ length: grid.cols }, (_, c) => (
            <div key={`${row}-${c}`} className="d-tile" style={{ left: mm(c * grid.tw), top: mm(row * grid.th), width: mm(grid.tw), height: mm(grid.th) }}>
              {letter(c)}
              {row + 1}
            </div>
          )),
        )}
    </div>
  )
}

/**
 * The synoptic on A4, from the picture of the screen view: the whole drawing
 * on one page (turned like a plan if wide), or an overview with a grid and
 * one sheet per grid cell, printed big enough to read every port.
 */
export default function SynopticPages({ title, shot, mode }: { title: string; shot?: Shot; mode: SynopticMode }) {
  if (!shot) {
    return (
      <section className="d-page">
        <h2>{title}</h2>
        <p className="muted">Rien à afficher (aucun appareil dans cette vue).</p>
      </section>
    )
  }
  const sheets = (b: Box) => ({ cols: Math.max(1, Math.ceil((shot.w * TILE_SCALE) / b.w)), rows: Math.max(1, Math.ceil((shot.h * TILE_SCALE) / b.h)) })
  const count = (b: Box) => sheets(b).cols * sheets(b).rows
  // One page: the orientation that matches the drawing. Sheets: the one that needs fewer.
  const wide = mode === 'tiles' && count(LANDSCAPE) !== count(PORTRAIT) ? count(LANDSCAPE) < count(PORTRAIT) : shot.w / shot.h > 1.15
  const box = wide ? LANDSCAPE : PORTRAIT
  const { cols, rows } = sheets(box)
  const tiled = mode === 'tiles' && cols * rows > 1
  const tw = shot.w / cols
  const th = shot.h / rows
  const region = (c: number, r: number): Region => ({
    x: c * tw - (c > 0 ? OVERLAP : 0),
    y: r * th - (r > 0 ? OVERLAP : 0),
    w: tw + (c > 0 ? OVERLAP : 0) + (c < cols - 1 ? OVERLAP : 0),
    h: th + (r > 0 ? OVERLAP : 0) + (r < rows - 1 ? OVERLAP : 0),
  })

  return (
    <>
      <Page wide={wide}>
        <h2>
          {title}
          {tiled && <small> — vue d’ensemble, {cols * rows} planches à assembler</small>}
        </h2>
        <Picture shot={shot} box={box} grid={tiled ? { cols, rows, tw, th } : undefined} />
        <Legend />
      </Page>
      {tiled &&
        Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <Page key={`${r}-${c}`} wide={wide}>
              <h2>
                {title} <small>— planche {letter(c)}{r + 1} (colonne {letter(c)}, rangée {r + 1}, sur {cols} × {rows})</small>
              </h2>
              <Picture shot={shot} box={box} region={region(c, r)} />
              <Legend />
            </Page>
          )),
        )}
    </>
  )
}
