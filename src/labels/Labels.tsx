import type { CableLabel, ThingLabel } from './labels'
import QrCode from './QrCode'

export interface LabelSheets {
  cables: CableLabel[]
  /** Each cable gets a label at both ends. */
  twice: boolean
  devices: ThingLabel[]
  cases: ThingLabel[]
}

/** The printed sheets: A4, labels on a grid, cut lines shown. */
export default function Labels({ cables, twice, devices, cases }: LabelSheets) {
  const cableList = twice ? cables.flatMap((c) => [c, c]) : cables
  return (
    <div className="labels-print">
      {cableList.length > 0 && (
        <section className="label-grid cables">
          {cableList.map((c, i) => (
            <div key={i} className="label cable-tag" style={{ borderLeftColor: c.color }}>
              <b>{c.id}</b>
              <span>{c.from}</span>
              <span>→ {c.to}</span>
              <small>{[c.connector, c.length && `${c.length} m`].filter(Boolean).join(' · ')}</small>
            </div>
          ))}
        </section>
      )}
      {devices.length > 0 && (
        <section className="label-grid devices">
          {devices.map((d, i) => (
            <div key={i} className="label thing-label">
              <div>
                <b>{d.title}</b>
                {d.lines.map((l) => <span key={l}>{l}</span>)}
              </div>
              {d.qr && <QrCode text={d.qr} size={70} />}
            </div>
          ))}
        </section>
      )}
      {cases.length > 0 && (
        <section className="label-grid cases">
          {cases.map((c, i) => (
            <div key={i} className="label case-label">
              <div className="case-band" style={{ background: c.color, color: c.fg }}>{c.title}</div>
              <div className="case-body">
                <div>{c.lines.map((l) => <span key={l}>{l}</span>)}</div>
                {c.qr && <QrCode text={c.qr} size={110} />}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
