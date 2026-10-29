import { useMemo } from 'react'
import { CONNECTORS } from '../data/connectors'
import type { DeviceNode, Phase, Project } from '../types'
import { outletKey, powerBudget, VOLTS, wattsOf } from './power'

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
}

const PHASES: Phase[] = ['L1', 'L2', 'L3']

function Load({ value }: { value?: number }) {
  if (value === undefined) return <span className="muted">—</span>
  const pct = Math.round(value * 100)
  return (
    <span className={`load ${value > 1 ? 'over' : value > 0.8 ? 'tight' : ''}`} title={`${pct} % du calibre`}>
      <span style={{ width: `${Math.min(100, pct)}%` }} />
      <b>{pct} %</b>
    </span>
  )
}

/** The power budget of the show: outlets, phases, what is missing. */
export default function PowerPage({ project, setProject }: Props) {
  const b = useMemo(() => powerBudget(project), [project])
  const setWatts = (n: DeviceNode, watts?: number) =>
    setProject((p) => ({ ...p, nodes: p.nodes.map((x) => (x.id === n.id ? { ...x, data: { ...x.data, watts } } : x)) }))
  const setPhase = (key: string, phase: Phase) => setProject((p) => ({ ...p, power: { ...p.power, phases: { ...p.power?.phases, [key]: phase } } }))

  const wattsInput = (n: DeviceNode) => (
    <input
      className="watts"
      type="number"
      min={0}
      placeholder="W"
      title={`Consommation de ${n.data.name} (W)`}
      value={n.data.watts ?? ''}
      onChange={(e) => setWatts(n, e.target.value ? Number(e.target.value) : undefined)}
    />
  )
  // Distributions draw nothing worth counting.
  const missing = project.nodes.filter((n) => !n.data.panel && n.data.category !== 'Énergie' && n.data.ports.some((p) => p.signal === 'power' && p.dir === 'in') && wattsOf(n.data) === undefined)

  return (
    <div className="page power">
      <header className="page-head">
        <div>
          <h2>Bilan électrique</h2>
          <p className="muted">
            Calculé depuis les câbles d’alimentation du synoptique : chaque départ porte ce qui y est branché, recopies comprises. Intensités à {VOLTS} V, cos φ = 1 : une estimation
            pour préparer, pas une étude d’électricien.
          </p>
        </div>
        <button className="no-print" onClick={() => window.print()}>Imprimer / PDF</button>
      </header>

      {b.alerts.length > 0 && (
        <section className="power-alerts">
          {b.alerts.map((a) => <div key={a} className="issue danger">{a}</div>)}
        </section>
      )}

      {b.sources.length === 0 && (
        <section className="card muted">
          <p>Aucune distribution câblée pour l’instant. Posez une distribution (palette, Énergie) et reliez ses départs aux prises secteur de vos équipements sur le synoptique : le bilan se fait tout seul.</p>
        </section>
      )}

      {b.sources.map((s) => (
        <section key={s.node.id} className="card power-source">
          <div className="section-head">
            <h3>{s.node.data.name}</h3>
            <span className="muted small">
              {s.threePhase ? 'Triphasé' : 'Monophasé'}
              {s.inletRating ? ` · arrivée ${s.inletRating} A` : ''} · {Math.round(s.watts)} W · {(s.watts / VOLTS).toFixed(1)} A au total
            </span>
          </div>
          {s.threePhase && (
            <div className="phases">
              {PHASES.map((ph) => (
                <div key={ph}>
                  <b>{ph}</b> {s.phases[ph].toFixed(1)} A
                  <Load value={s.inletRating ? s.phases[ph] / s.inletRating : undefined} />
                </div>
              ))}
              {s.imbalance !== undefined && <div className="muted small">Déséquilibre : {Math.round(s.imbalance * 100)} %</div>}
            </div>
          )}
          <table>
            <thead>
              <tr>
                <th>Départ</th>
                {s.threePhase && <th>Phase</th>}
                <th>Équipements</th>
                <th>Puissance</th>
                <th>Intensité</th>
                <th>Calibre</th>
                <th>Charge</th>
              </tr>
            </thead>
            <tbody>
              {s.outlets.map((o) => (
                <tr key={o.port.id}>
                  <td>
                    {o.port.label}
                    <small className="muted"> · {CONNECTORS[o.port.connector]}</small>
                  </td>
                  {s.threePhase && (
                    <td>
                      <select value={o.phase} onChange={(e) => setPhase(outletKey(s.node.id, o.port.id), e.target.value as Phase)}>
                        {PHASES.map((ph) => <option key={ph}>{ph}</option>)}
                      </select>
                    </td>
                  )}
                  <td>
                    {o.fed.map((n) => (
                      <span key={n.id} className="fed">
                        {n.data.name}
                        {wattsOf(n.data) === undefined ? wattsInput(n) : <small className="muted"> {wattsOf(n.data)} W</small>}
                      </span>
                    ))}
                  </td>
                  <td>{Math.round(o.watts)} W</td>
                  <td>{o.amps.toFixed(1)} A</td>
                  <td>{o.rating ? `${o.rating} A` : '—'}</td>
                  <td><Load value={o.load} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {(b.unpowered.length > 0 || missing.length > 0) && (
        <section className="card">
          <h3>À compléter</h3>
          {b.unpowered.length > 0 && (
            <p className="muted small">Non alimentés sur le synoptique : {b.unpowered.map((n) => n.data.name).join(', ')}.</p>
          )}
          {missing.length > 0 && (
            <>
              <p className="muted small">Consommation inconnue : renseignez-la (en watts), elle est gardée sur l’équipement.</p>
              <div className="missing-watts">
                {missing.map((n) => (
                  <label key={n.id} className="fed">
                    {n.data.name} <small className="muted">{n.data.model}</small> {wattsInput(n)}
                  </label>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
