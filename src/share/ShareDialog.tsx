import { useState } from 'react'
import type { Project } from '../types'
import { publish, shareKey, shareLink, unpublish } from './share'

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
  onClose: () => void
}

/** Creates or updates the read-only link of the project, for the crew. */
export default function ShareDialog({ project, setProject, onClose }: Props) {
  const id = project.share?.id
  const mine = !!id && !!shareKey(id)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const link = id ? shareLink(id) : ''

  const run = async () => {
    setBusy(true)
    setStatus(mine ? 'Mise à jour du lien…' : 'Création du lien…')
    try {
      const r = await publish(project)
      setProject((p) => ({ ...p, share: { id: r.id, updatedAt: r.updatedAt } }))
      setStatus(mine ? 'Lien mis à jour : l’équipe voit la nouvelle version en rouvrant le lien.' : 'Lien créé : envoyez-le à l’équipe.')
    } catch (e) {
      setStatus(`Partage impossible : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    if (!id || !confirm('Arrêter le partage ? Le lien ne fonctionnera plus.')) return
    setBusy(true)
    try {
      await unpublish(id)
      setProject((p) => {
        const next = { ...p }
        delete next.share
        return next
      })
      setStatus('Partage arrêté.')
    } catch (e) {
      setStatus(`Impossible d’arrêter le partage : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setStatus('Lien copié.')
    } catch {
      setStatus('Copie impossible : sélectionnez le lien et copiez-le.')
    }
  }
  const send = () => navigator.share?.({ title: project.name, text: `Projet « ${project.name} » sur SynopGig`, url: link }).catch(() => undefined)

  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Partager le projet" onClick={(e) => e.stopPropagation()}>
        <h3>Partager avec l’équipe</h3>
        <p className="muted small">
          Un lien en lecture seule : les techniciens ouvrent le projet sur leur téléphone ou leur ordinateur, sans compte, et cochent le guide de montage de leur côté. Vos
          modifications ne leur parviennent que quand vous mettez le lien à jour.
        </p>
        {id && (
          <>
            <input className="share-link" readOnly value={link} onFocus={(e) => e.target.select()} />
            <div className="actions">
              <button onClick={copy}>Copier le lien</button>
              {'share' in navigator && <button onClick={send}>Envoyer…</button>}
            </div>
            {project.share?.updatedAt && <p className="muted small">Version partagée du {new Date(project.share.updatedAt).toLocaleString('fr-FR')}.</p>}
          </>
        )}
        {id && !mine && <p className="muted small">Ce lien a été créé depuis un autre navigateur : vous pouvez en créer un nouveau d’ici.</p>}
        {status && <p className="small status-line">{status}</p>}
        <div className="actions">
          {mine && <button className="danger" disabled={busy} onClick={stop}>Arrêter le partage</button>}
          <button onClick={onClose}>Fermer</button>
          <button className="primary" disabled={busy} onClick={run}>{mine ? 'Mettre à jour le lien' : id ? 'Créer un nouveau lien' : 'Créer le lien'}</button>
        </div>
      </div>
    </div>
  )
}
