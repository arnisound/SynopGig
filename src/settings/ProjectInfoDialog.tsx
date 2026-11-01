import { useRef, useState } from 'react'
import { shrink } from '../library/images'
import { uid } from '../project'
import type { Party, Project, ProjectInfo } from '../types'
import { saveSettings, useSettings, type Settings } from './settings'

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
  onClose: () => void
  /** A shared project: shown, not edited. */
  readOnly?: boolean
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
export default function ProjectInfoDialog({ project, setProject, onClose, readOnly }: Props) {
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
      <div className="modal project-info" role="dialog" aria-label="Fiche du spectacle">
        <div className="section-head">
          <h3>{tab === 'project' ? 'Fiche du spectacle' : 'Ma structure et mes clients'}</h3>
          <button className="icon" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        {!readOnly && (
          <div className="seg">
            <button className={tab === 'project' ? 'active' : ''} onClick={() => setTab('project')}>Spectacle</button>
            <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Ma structure et mes clients</button>
          </div>
        )}

        {tab === 'project' || readOnly ? (
          <fieldset className="info-form" disabled={readOnly}>
            {readOnly && <p className="muted small">Projet partagé : fiche consultable, non modifiable.</p>}
            <label className="field">
              <span>Titre du spectacle</span>
              <input value={project.name} onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="field">
              <span>En quelques mots</span>
              <textarea rows={3} value={info.description ?? ''} placeholder="Jauge, plateaux, particularités du lieu…" onChange={(e) => setInfo({ description: e.target.value })} />
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
                <option value="">— pas de client —</option>
                {settings.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {info.client && !settings.clients.some((c) => c.id === info.client?.id) && <option value={info.client.id}>{info.client.name}</option>}
                <option value="__new">+ Créer un client…</option>
              </select>
            </label>
            {newClient !== undefined && (
              <div className="row">
                <input autoFocus value={clientName} placeholder="Salle, festival, société…" onChange={(e) => setClientName(e.target.value)} />
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
              Le client apparaît en couverture du dossier, en bas des pages et, si vous le voulez, sur les étiquettes. Son logo et son adresse se règlent dans{' '}
              <button className="link" onClick={() => setTab('settings')}>Ma structure et mes clients</button>.
            </p>

            <h4>Bas de page des documents imprimés</h4>
            <p className="muted small">Imprimé en bas des pages du dossier : renseigné une fois, valable pour tout le dossier.</p>
            <div className="grid2">
              {field('revision', 'Version', 'v1')}
              {field('author', 'Auteur', settings.org.author || 'Prénom Nom')}
              {field('docType', 'Intitulé', 'Dossier technique')}
              {field('status', 'État', 'Version de travail')}
              {field('site', 'Adresse du lieu', 'Rue, ville')}
              {field('room', 'Espace', 'Grande scène, chapiteau…')}
            </div>
          </fieldset>
        ) : (
          <div className="info-form">
            <p className="muted small">Enregistré dans ce navigateur et repris dans chaque nouveau projet.</p>
            <h4>Ma structure</h4>
            <LogoPicker logo={settings.org.logo} onChange={(logo) => setOrg({ logo })} label="Choisir un logo" />
            <p className="muted small">Une image PNG, JPEG ou WebP (2 Mo maximum), réduite automatiquement. Elle figure sur le dossier et, si vous le voulez, sur les étiquettes.</p>
            <div className="grid2">
              <label className="field">
                <span>Nom de la structure</span>
                <input value={settings.org.name} placeholder="Compagnie, prestataire, salle…" onChange={(e) => setOrg({ name: e.target.value })} />
              </label>
              <label className="field">
                <span>Auteur des documents</span>
                <input value={settings.org.author ?? ''} placeholder="Prénom Nom" onChange={(e) => setOrg({ author: e.target.value })} />
              </label>
            </div>

            <h4>Mes clients</h4>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault()
                if (addClient(clientName)) setClientName('')
              }}
            >
              <input value={clientName} placeholder="Nom du client à ajouter" onChange={(e) => setClientName(e.target.value)} />
              <button type="submit" disabled={!clientName.trim()}>+ Ajouter</button>
            </form>
            {settings.clients.length === 0 && <p className="muted small">Pas encore de client enregistré.</p>}
            {settings.clients.map((c) => (
              <div key={c.id} className="client-card">
                <LogoPicker logo={c.logo} onChange={(logo) => setClient(c.id, { logo })} label="Choisir un logo" />
                <label className="field">
                  <span>Nom</span>
                  <input value={c.name} onChange={(e) => setClient(c.id, { name: e.target.value })} />
                </label>
                <label className="field">
                  <span>Adresse</span>
                  <input value={c.address ?? ''} placeholder="Adresse postale" onChange={(e) => setClient(c.id, { address: e.target.value })} />
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
