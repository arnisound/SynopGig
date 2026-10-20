import { useState, type ReactNode } from 'react'
import { CONNECTORS, SIGNALS } from '../data/connectors'
import { ZONES } from '../data/library'
import { uid, type ResolvedCable } from '../project'
import type {
  CableData,
  Category,
  ConnectorType,
  DeviceData,
  DeviceNode,
  Port,
  PortDirection,
  SignalType,
} from '../types'

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Autre']
const DIRS: Record<PortDirection, string> = { in: 'Entrée', out: 'Sortie', io: 'Bidirectionnel' }

interface Props {
  node?: DeviceNode
  cable?: ResolvedCable
  onNode: (id: string, patch: Partial<DeviceData>) => void
  onCable: (id: string, patch: Partial<CableData>) => void
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
        {Object.entries(CONNECTORS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <select value={signal} onChange={(e) => setSignal(e.target.value as SignalType)}>
        {Object.entries(SIGNALS).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
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

export default function Inspector({ node, cable, onNode, onCable, onSaveTemplate, onDelete }: Props) {
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
        <p>Pour câbler, tirez un trait d’un port à un autre. Les incompatibilités (signal, connecteur, sens) sont signalées en rouge ou orange sans vous bloquer.</p>
      </aside>
    )
  }

  const d = node.data
  const set = (patch: Partial<DeviceData>) => onNode(node.id, patch)
  const setConfig = (patch: Partial<DeviceData['config']>) => set({ config: { ...d.config, ...patch } })

  return (
    <aside className="inspector">
      <h3>{d.name}</h3>
      <Field label="Nom">
        <input value={d.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Modèle">
        <input value={d.model} onChange={(e) => set({ model: e.target.value })} />
      </Field>
      <div className="row">
        <Field label="Zone">
          <input list="zones" value={d.zone} onChange={(e) => set({ zone: e.target.value })} />
          <datalist id="zones">
            {ZONES.map((z) => <option key={z} value={z} />)}
          </datalist>
        </Field>
        <Field label="Catégorie">
          <select value={d.category} onChange={(e) => set({ category: e.target.value as Category })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <div className="row">
        <Field label="Hauteur rack (U)">
          <input type="number" min={0} value={d.rackU ?? ''} onChange={(e) => set({ rackU: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
        <Field label="Poids (kg)">
          <input type="number" min={0} value={d.weight ?? ''} onChange={(e) => set({ weight: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
      </div>

      <h4>Configuration</h4>
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
        <textarea rows={4} value={d.config.notes ?? ''} onChange={(e) => setConfig({ notes: e.target.value })} />
      </Field>

      <h4>Ports ({d.ports.length})</h4>
      <ul className="port-list">
        {d.ports.map((p) => (
          <li key={p.id}>
            <span className="dot" style={{ background: SIGNALS[p.signal].color }} />
            <input
              value={p.label}
              onChange={(e) => set({ ports: d.ports.map((x) => (x.id === p.id ? { ...x, label: e.target.value } : x)) })}
            />
            <small>{DIRS[p.dir]} · {CONNECTORS[p.connector]}</small>
            <button className="icon" title="Supprimer le port" onClick={() => set({ ports: d.ports.filter((x) => x.id !== p.id) })}>×</button>
          </li>
        ))}
      </ul>
      <NewPort onAdd={(p) => set({ ports: [...d.ports, p] })} />

      <div className="actions">
        <button onClick={() => onSaveTemplate(node)}>Enregistrer comme modèle</button>
        <button className="danger" onClick={onDelete}>Supprimer</button>
      </div>
    </aside>
  )
}
