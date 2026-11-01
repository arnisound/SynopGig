import type { CableLabel, ThingLabel } from './labels'
import QrCode from './QrCode'

/** What every label carries besides its own text: a logo, a name. */
export interface LabelBrand {
  logo?: string
  text?: string
}

function Foot({ brand }: { brand?: LabelBrand }) {
  if (!brand?.logo && !brand?.text) return null
  return (
    <div className="label-foot">
      {brand.logo && <img src={brand.logo} alt="" />}
      {brand.text && <span>{brand.text}</span>}
    </div>
  )
}

export interface LabelSheets {
  brand?: LabelBrand
  cables: CableLabel[]
  /** Each cable gets a label at both ends. */
  twice: boolean
  devices: ThingLabel[]
  cases: ThingLabel[]
}

/** The printed sheets: A4, labels on a grid, cut lines shown. */
export default function Labels({ cables, twice, devices, cases, brand }: LabelSheets) {
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
              <Foot brand={brand} />
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
                <Foot brand={brand} />
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
                <div>
                  {c.lines.map((l) => <span key={l}>{l}</span>)}
                  <Foot brand={brand} />
                </div>
                {c.qr && <QrCode text={c.qr} size={110} />}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
