import { addCard, removeCard, slotsLeft } from '../project'
import type { DeviceData } from '../types'

/**
 * The cards a product takes: what is fitted, what can still go in. A product
 * has a set number of slots; built-in modules take none.
 */
export default function CardsPanel({ d, onChange }: { d: DeviceData; onChange: (patch: Partial<DeviceData>) => void }) {
  if (!d.options?.length) return null
  const left = slotsLeft(d)
  const fitted = d.fitted ?? []
  const labelOf = (key: string) => d.options?.find((o) => o.id === key.split(':')[0])?.label ?? key
  return (
    <section className="options" id="cards-panel">
      <h4>
        Cartes optionnelles{' '}
        <small className="muted">{d.slots === undefined ? `${fitted.length} montée${fitted.length > 1 ? 's' : ''}` : `${d.slots - left} / ${d.slots} emplacement${d.slots > 1 ? 's' : ''} occupé${d.slots - left > 1 ? 's' : ''}`}</small>
      </h4>
      {fitted.map((key) => (
        <div key={key} className="card-row fitted">
          <span>{labelOf(key)}</span>
          <button className="small-btn" onClick={() => onChange(removeCard(d, key))}>Retirer</button>
        </div>
      ))}
      {d.options.map((o) => {
        const full = o.slot !== false && left <= 0
        return (
          <div key={o.id} className="card-row">
            <span>
              {o.label} <small className="muted">· {o.ports.length} port{o.ports.length > 1 ? 's' : ''}{o.slot === false ? ' · module' : ''}</small>
            </span>
            <button className="small-btn" disabled={full} title={full ? 'Plus d’emplacement libre' : 'Monter cette carte'} onClick={() => onChange(addCard(d, o.id))}>
              + Ajouter
            </button>
          </div>
        )
      })}
      {left <= 0 && <p className="muted small">Tous les emplacements sont occupés : retirez une carte pour en mettre une autre.</p>}
    </section>
  )
}
