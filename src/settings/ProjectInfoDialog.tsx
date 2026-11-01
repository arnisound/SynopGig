import { useRef, useState } from 'react'
import { shrink } from '../library/images'
import { uid } from '../project'
import type { Party, Project, ProjectInfo } from '../types'
import { saveSettings, useSettings, type Settings } from './settings'

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
  onClose: () => void
}

const MAX_LOGO = 2 * 1024 * 1024

/** A logo: shown, replaced by a picture from the computer, or taken away. */
function LogoPicker({ logo, onChange, label }: { logo?: string; onChange: (logo?: string) => void; label: string }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="logo-picker">
      <div className="logo-box">{logo ? <img src={logo} alt="" /> : <span aria-hidden="true">▣</span>}</div>
      <button className="small-btn" onClick={() => input.current?.click()}>{logo ? 'Changer' : label}</button>
      {logo && <button className="small-btn" onClick={() => onChange(undefined)}>Retirer</button>}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          if (f.size > MAX_LOGO) return alert('Logo trop lourd : 2 Mo au plus.')
          onChange(await shrink(f, 400).catch(() => undefined))
        }}
      />
    </div>
  )
}

/** The project's information (client, title block) and the settings of this browser (organisation, clients). */
export default function ProjectInfoDialog({ project, setProject, onClose }: Props) {
  const settings = useSettings()
  const [tab, setTab] = useState<'project' | 'settings'>('project')
  const [newClient, setNewClient] = useState<string>()
  const [clientName, setClientName] = useState('')
  const info = project.info ?? {}
  const setInfo = (patch: Partial<ProjectInfo>) => setProject((p) => ({ ...p, info: { ...p.info, ...patch } }))

  // A change to the organisation or to the project's client is copied into the project too.
  const save = (next: Settings) => {
    saveSettings(next)
    setProject((p) => {
      const client = p.info?.client && next.clients.find((c) => c.id === p.info?.client?.id)
      return { ...p, info: { ...p.info, org: next.org.name || next.org.logo ? { id: 'org', name: next.org.name, logo: next.org.logo, address: next.org.address } : undefined, ...(client ? { client } : {}) } }
    })
  }
  const setOrg = (patch: Partial<Settings['org']>) => save({ ...settings, org: { ...settings.org, ...patch } })
  const setClient = (id: string, patch: Partial<Party>) => save({ ...settings, clients: settings.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  const addClient = (name: string): Party | undefined => {
    const n = name.trim()
    if (!n) return undefined
    const c: Party = { id: `client-${uid()}`, name: n }
    save({ ...settings, clients: [...settings.clients, c] })
    return c
  }
  const chooseClient = (id: string) => {
    if (id === '__new') return setNewClient('')
    setNewClient(undefined)
    setInfo({ client: settings.clients.find((c) => c.id === id) })
  }
  const field = (key: keyof ProjectInfo, label: string, placeholder = '') => (
    <label className="field">
      <span>{label}</span>
      <input value={(info[key] as string | undefined) ?? ''} placeholder={placeholder} onChange={(e) => setInfo({ [key]: e.target.value })} />
    </label>
  )

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal project-info" role="dialog" aria-label="Informations du projet">
        <div className="section-head">
          <h3>{tab === 'project' ? 'Informations du projet' : 'Paramètres'}</h3>
          <button className="icon" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="seg">
          <button className={tab === 'project' ? 'active' : ''} onClick={() => setTab('project')}>Projet</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Organisation et clients</button>
        </div>

        {tab === 'project' ? (
          <div className="info-form">
            <label className="field">
              <span>Nom du projet</span>
              <input value={project.name} onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea rows={3} value={info.description ?? ''} placeholder="Ajouter une description…" onChange={(e) => setInfo({ description: e.target.value })} />
            </label>
            <div className="grid2">
              <label className="field">
                <span>Lieu</span>
                <input value={project.venue} placeholder="Salle des fêtes" onChange={(e) => setProject((p) => ({ ...p, venue: e.target.value }))} />
              </label>
              <label className="field">
                <span>Date</span>
                <input type="date" value={project.date} onChange={(e) => setProject((p) => ({ ...p, date: e.target.value }))} />
              </label>
            </div>

            <label className="field">
              <span>Client</span>
              <select value={newClient !== undefined ? '__new' : (info.client?.id ?? '')} onChange={(e) => (e.target.value ? chooseClient(e.target.value) : setInfo({ client: undefined }))}>
                <option value="">Aucun client</option>
                {settings.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {info.client && !settings.clients.some((c) => c.id === info.client?.id) && <option value={info.client.id}>{info.client.name}</option>}
                <option value="__new">Nouveau client…</option>
              </select>
            </label>
            {newClient !== undefined && (
              <div className="row">
                <input autoFocus value={clientName} placeholder="Nom du client" onChange={(e) => setClientName(e.target.value)} />
                <button
                  className="primary"
                  disabled={!clientName.trim()}
                  onClick={() => {
                    const c = addClient(clientName)
                    if (c) setInfo({ client: c })
                    setNewClient(undefined)
                    setClientName('')
                  }}
                >
                  Créer
                </button>
              </div>
            )}
            <p className="muted small">
              Son nom et son logo figurent dans le cartouche du dossier PDF et sur les étiquettes. Logo et adresse :{' '}
              <button className="link" onClick={() => setTab('settings')}>Organisation et clients</button>.
            </p>

            <h4>Cartouche des documents</h4>
            <p className="muted small">Repris sur chaque page du dossier PDF, sans ressaisie.</p>
            <div className="grid2">
              {field('revision', 'Indice de révision', 'A')}
              {field('author', 'Réalisé par', settings.org.author || 'Votre nom')}
              {field('docType', 'Type de document', 'Synoptique AV')}
              {field('status', 'Statut', 'Pour validation')}
              {field('site', 'Site', 'Adresse ou bâtiment')}
              {field('room', 'Salle', 'Salle 204')}
            </div>
          </div>
        ) : (
          <div className="info-form">
            <p className="muted small">Gardés dans ce navigateur, pour tous vos projets.</p>
            <h4>Organisation</h4>
            <LogoPicker logo={settings.org.logo} onChange={(logo) => setOrg({ logo })} label="Ajouter un logo" />
            <p className="muted small">PNG, JPEG ou WebP, 2 Mo au plus. Affiché dans le cartouche et, au choix, sur les étiquettes.</p>
            <div className="grid2">
              <label className="field">
                <span>Nom de l’organisation</span>
                <input value={settings.org.name} placeholder="Votre société" onChange={(e) => setOrg({ name: e.target.value })} />
              </label>
              <label className="field">
                <span>Réalisé par (par défaut)</span>
                <input value={settings.org.author ?? ''} placeholder="Votre nom" onChange={(e) => setOrg({ author: e.target.value })} />
              </label>
            </div>

            <h4>Clients</h4>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault()
                if (addClient(clientName)) setClientName('')
              }}
            >
              <input value={clientName} placeholder="Ex : Mairie de Lyon" onChange={(e) => setClientName(e.target.value)} />
              <button type="submit" disabled={!clientName.trim()}>+ Ajouter</button>
            </form>
            {settings.clients.length === 0 && <p className="muted small">Aucun client pour l’instant.</p>}
            {settings.clients.map((c) => (
              <div key={c.id} className="client-card">
                <LogoPicker logo={c.logo} onChange={(logo) => setClient(c.id, { logo })} label="Ajouter un logo" />
                <label className="field">
                  <span>Nom</span>
                  <input value={c.name} onChange={(e) => setClient(c.id, { name: e.target.value })} />
                </label>
                <label className="field">
                  <span>Adresse</span>
                  <input value={c.address ?? ''} placeholder="Ex : 1 place de la Comédie, 69001 Lyon" onChange={(e) => setClient(c.id, { address: e.target.value })} />
                </label>
                <button className="small-btn danger" onClick={() => confirm(`Supprimer le client « ${c.name} » ?`) && save({ ...settings, clients: settings.clients.filter((x) => x.id !== c.id) })}>
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
