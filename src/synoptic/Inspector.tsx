import { useState, type ReactNode } from 'react'
import { CONNECTOR_OPTIONS, CONNECTORS, SIGNAL_OPTIONS, SIGNALS } from '../data/connectors'
import { ZONES } from '../data/library'
import { uid, type ResolvedCable } from '../project'
import PanelEditor from '../racks/PanelEditor'
import DeviceArt from '../ui/DeviceArt'
import { DocsEditor, SpecsEditor } from '../ui/ProductSheet'
import type {
  CableData,
  Category,
  ConnectorType,
  DeviceData,
  DeviceNode,
  PanelSpec,
  Port,
  PortDirection,
  SignalType,
} from '../types'

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Câblage', 'Autre']
const DIRS: Record<PortDirection, string> = { in: 'Entrée', out: 'Sortie', io: 'Bidirectionnel' }

interface Props {
  node?: DeviceNode
  cable?: ResolvedCable
  onNode: (id: string, patch: Partial<DeviceData>) => void
  onCable: (id: string, patch: Partial<CableData>) => void
  onPanel: (id: string, spec: PanelSpec) => void
  onSaveTemplate: (node: DeviceNode) => void
  onDelete: () => void
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function NewPort({ onAdd }: { onAdd: (p: Port) => void }) {
  const [label, setLabel] = useState('')
  const [connector, setConnector] = useState<ConnectorType>('xlr3')
  const [signal, setSignal] = useState<SignalType>('audio-analog')
  const [dir, setDir] = useState<PortDirection>('in')
  return (
    <div className="new-port">
      <input placeholder="Nom du port" value={label} onChange={(e) => setLabel(e.target.value)} />
      <select value={connector} onChange={(e) => setConnector(e.target.value as ConnectorType)}>
        {CONNECTOR_OPTIONS.map((k) => (
          <option key={k} value={k}>{CONNECTORS[k]}</option>
        ))}
      </select>
      <select value={signal} onChange={(e) => setSignal(e.target.value as SignalType)}>
        {SIGNAL_OPTIONS.map((k) => (
          <option key={k} value={k}>{SIGNALS[k].label}</option>
        ))}
      </select>
      <select value={dir} onChange={(e) => setDir(e.target.value as PortDirection)}>
        {Object.entries(DIRS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <button
        disabled={!label.trim()}
        onClick={() => {
          onAdd({ id: `p-${uid()}`, label: label.trim(), connector, signal, dir })
          setLabel('')
        }}
      >
        + Ajouter le port
      </button>
    </div>
  )
}

type Tab = 'fiche' | 'ports' | 'specs' | 'docs'

export default function Inspector({ node, cable, onNode, onCable, onPanel, onSaveTemplate, onDelete }: Props) {
  const [holes, setHoles] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<Tab>('fiche')

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
  const setPort = (id: string, patch: Partial<Port>) => set({ ports: d.ports.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
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
            <p className="muted small">Dans l’ordre de la face. Une correction ici ne vaut que pour cet équipement ; « Enregistrer comme modèle » la garde pour la suite.</p>
            <ul className="port-list editable">
              {d.ports.map((p) => (
                <li key={p.id}>
                  <span className="dot" style={{ background: SIGNALS[p.signal].color }} />
                  <input aria-label="Nom du port" value={p.label} onChange={(e) => setPort(p.id, { label: e.target.value })} />
                  <button className="icon" title="Supprimer le port" onClick={() => set({ ports: d.ports.filter((x) => x.id !== p.id) })}>×</button>
                  <div className="port-meta">
                    <select aria-label="Sens" value={p.dir} onChange={(e) => setPort(p.id, { dir: e.target.value as PortDirection })}>
                      {Object.entries(DIRS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select aria-label="Connecteur" value={p.connector} onChange={(e) => setPort(p.id, { connector: e.target.value as ConnectorType })}>
                      {CONNECTOR_OPTIONS.map((k) => <option key={k} value={k}>{CONNECTORS[k]}</option>)}
                    </select>
                    <select aria-label="Signal" value={p.signal} onChange={(e) => setPort(p.id, { signal: e.target.value as SignalType })}>
                      {SIGNAL_OPTIONS.map((k) => <option key={k} value={k}>{SIGNALS[k].label}</option>)}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
            <NewPort onAdd={(p) => set({ ports: [...d.ports, p] })} />
          </>
        ))}

      {tab === 'specs' && <SpecsEditor specs={d.specs} onChange={(specs) => set({ specs })} />}
      {tab === 'docs' && <DocsEditor docs={d.docs} onChange={(docs) => set({ docs })} />}

      <div className="actions">
        <button onClick={() => onSaveTemplate(node)}>Enregistrer comme modèle</button>
        <button className="danger" onClick={onDelete}>Supprimer</button>
      </div>
    </aside>
  )
}
