import { useState, type ReactNode } from 'react'
import { ZONES } from '../data/library'
import type { ResolvedCable } from '../project'
import CardsPanel from './CardsPanel'
import PanelEditor from '../racks/PanelEditor'
import DeviceArt from '../ui/DeviceArt'
import { DocsEditor, SpecsEditor } from '../ui/ProductSheet'
import type { CableData, Category, DeviceData, DeviceNode, PanelSpec } from '../types'
import PortsEditor from './PortsEditor'
import PanelView from '../ui/PanelView'
import { FindDocsButton, PhotoPicker } from './ProductMedia'
import { wattsOf } from '../power/power'

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Câblage', 'Autre']

interface Props {
  node?: DeviceNode
  cable?: ResolvedCable
  onNode: (id: string, patch: Partial<DeviceData>) => void
  onCable: (id: string, patch: Partial<CableData>) => void
  onPanel: (id: string, spec: PanelSpec) => void
  onSaveTemplate: (node: DeviceNode) => void
  onDelete: () => void
  /** What is wrong with the selected device's IP address. */
  ipIssues?: string[]
  /** Changes when the user asks for the cards of the selected device (the + cartes of its box). */
  cardsRequest?: number
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

type Tab = 'fiche' | 'ports' | 'specs' | 'docs'

export default function Inspector({ node, cable, onNode, onCable, onPanel, onSaveTemplate, onDelete, ipIssues, cardsRequest }: Props) {
  const [holes, setHoles] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<Tab>('fiche')
  const [lastRequest, setLastRequest] = useState(cardsRequest)
  if (cardsRequest !== lastRequest) {
    setLastRequest(cardsRequest)
    setTab('ports')
    requestAnimationFrame(() => document.getElementById('cards-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }

  if (cable) {
    const d = cable.edge.data ?? { cableId: '' }
    return (
      <aside className="inspector">
        <h3>Câble {d.cableId}</h3>
        <p className="route">
          <b>{cable.from?.data.name}</b> · {cable.fromPort?.label}
          <br />→ <b>{cable.to?.data.name}</b> · {cable.toPort?.label}
        </p>
        {cable.issues.map((i, k) => (
          <div key={k} className={`issue ${i.severity}`}>{i.message}</div>
        ))}
        {cable.issues.length === 0 && <div className="issue ok">Liaison conforme</div>}
        <Field label="Repère câble">
          <input value={d.cableId} onChange={(e) => onCable(cable.edge.id, { cableId: e.target.value })} />
        </Field>
        <Field label="Longueur (m)">
          <input
            type="number"
            min={0}
            value={d.length ?? ''}
            onChange={(e) => onCable(cable.edge.id, { length: e.target.value ? Number(e.target.value) : undefined })}
          />
        </Field>
        <Field label="Note pour le technicien">
          <textarea value={d.note ?? ''} onChange={(e) => onCable(cable.edge.id, { note: e.target.value })} />
        </Field>
        <button className="danger" onClick={onDelete}>Supprimer le câble</button>
      </aside>
    )
  }

  if (!node) {
    return (
      <aside className="inspector empty">
        <h3>Inspecteur</h3>
        <p>Sélectionnez un équipement ou un câble pour le modifier.</p>
        <p>Pour câbler, tirez un trait d’un port à un autre (sur écran tactile : touchez un port, puis l’autre). Les incompatibilités (signal, connecteur, sens) sont signalées en rouge ou orange sans vous bloquer.</p>
      </aside>
    )
  }

  const d = node.data
  const set = (patch: Partial<DeviceData>) => onNode(node.id, patch)
  const setConfig = (patch: Partial<DeviceData['config']>) => set({ config: { ...d.config, ...patch } })
  const tabs: [Tab, string, number?][] = [
    ['fiche', 'Fiche'],
    ['ports', 'Ports', d.panel ? d.panel.holes.filter((h) => h.connector).length : d.ports.length],
    ['specs', 'Caractéristiques', d.specs?.length ?? 0],
    ['docs', 'Documents', d.docs?.length ?? 0],
  ]

  return (
    <aside className="inspector device-sheet">
      <header className="sheet-head">
        <DeviceArt image={d.image} family={d.family} templateId={d.templateId} model={d.model} category={d.category} size={44} />
        <div>
          <h3>{d.name}</h3>
          <small className="muted">{[d.brand, d.model].filter(Boolean).join(' · ')}</small>
        </div>
      </header>
      <nav className="sheet-tabs" role="tablist">
        {tabs.map(([id, label, n]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
            {n !== undefined && <span className="count">{n}</span>}
          </button>
        ))}
      </nav>

      {tab === 'fiche' && (
        <>
          {!d.panel && (
            <>
              <h4>Photo</h4>
              <PhotoPicker d={d} onChange={(image) => set({ image })} />
              <h4>Connexions</h4>
              <PanelView ports={d.ports} rackU={d.rackU} />
            </>
          )}
          <h4>Produit</h4>
          <div className="row">
            <Field label="Marque">
              <input value={d.brand ?? ''} onChange={(e) => set({ brand: e.target.value || undefined })} />
            </Field>
            <Field label="Modèle">
              <input value={d.model} onChange={(e) => set({ model: e.target.value })} />
            </Field>
          </div>
          <div className="row">
            <Field label="Département">
              <select value={d.category} onChange={(e) => set({ category: e.target.value as Category })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Famille">
              <input value={d.family ?? ''} onChange={(e) => set({ family: e.target.value || undefined })} />
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={3} value={d.description ?? ''} placeholder="Ce que c’est, à quoi ça sert." onChange={(e) => set({ description: e.target.value || undefined })} />
          </Field>
          <Field label="Page du fabricant">
            <input value={d.url ?? ''} placeholder="https://…" onChange={(e) => set({ url: e.target.value || undefined })} />
          </Field>
          <Field label="Consommation (W)">
            <input type="number" min={0} value={d.watts ?? ''} placeholder={wattsOf(d) ? `${wattsOf(d)} (lu dans ses caractéristiques)` : 'pour le bilan électrique'} onChange={(e) => set({ watts: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
          {d.url && /^https?:\/\//.test(d.url) && (
            <a className="small" href={d.url} target="_blank" rel="noopener noreferrer">Ouvrir la page du fabricant ↗</a>
          )}

          <h4>Sur ce spectacle</h4>
          <Field label="Repère">
            <input value={d.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <div className="row">
            <Field label="Zone">
              <input list="zones" value={d.zone} onChange={(e) => set({ zone: e.target.value })} />
              <datalist id="zones">
                {ZONES.map((z) => <option key={z} value={z} />)}
              </datalist>
            </Field>
            <Field label="Hauteur rack (U)">
              <input type="number" min={0} value={d.rackU ?? ''} onChange={(e) => set({ rackU: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
            <Field label="Poids (kg)">
              <input type="number" min={0} value={d.weight ?? ''} onChange={(e) => set({ weight: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
          </div>

          <h4>Réglages</h4>
          <Field label="Adresse IP">
            <input placeholder="192.168.1.10" value={d.config.ip ?? ''} onChange={(e) => setConfig({ ip: e.target.value })} />
          </Field>
          {ipIssues?.map((i) => <div key={i} className="issue danger">{i}</div>)}
          <div className="row">
            <Field label="Univers DMX">
              <input value={d.config.dmxUniverse ?? ''} onChange={(e) => setConfig({ dmxUniverse: e.target.value })} />
            </Field>
            <Field label="Adresse DMX">
              <input value={d.config.dmxAddress ?? ''} onChange={(e) => setConfig({ dmxAddress: e.target.value })} />
            </Field>
          </div>
          <Field label="Mode / preset">
            <input value={d.config.mode ?? ''} onChange={(e) => setConfig({ mode: e.target.value })} />
          </Field>
          <Field label="Consignes de configuration">
            <textarea rows={3} value={d.config.notes ?? ''} onChange={(e) => setConfig({ notes: e.target.value })} />
          </Field>
        </>
      )}

      {tab === 'ports' &&
        (d.panel ? (
          <PanelEditor spec={d.panel} selected={holes} onSelect={setHoles} onChange={(spec) => onPanel(node.id, spec)} />
        ) : (
          <>
            <p className="muted small">Comme sur la boîte du synoptique : glissez un port pour changer sa place ou son côté, ⇆ l’envoie en face. « Enregistrer comme modèle » garde ces réglages pour la suite.</p>
            <CardsPanel d={d} onChange={set} />
            <PortsEditor key={node.id} ports={d.ports} onChange={(ports) => set({ ports })} />
          </>
        ))}

      {tab === 'specs' && <SpecsEditor specs={d.specs} onChange={(specs) => set({ specs })} />}
      {tab === 'docs' && (
        <>
          <FindDocsButton d={d} onChange={(docs) => set({ docs })} />
          <DocsEditor docs={d.docs} onChange={(docs) => set({ docs })} />
        </>
      )}

      <div className="actions">
        <button onClick={() => onSaveTemplate(node)}>Enregistrer comme modèle</button>
        <button className="danger" onClick={onDelete}>Supprimer</button>
      </div>
    </aside>
  )
}
