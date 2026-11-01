import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Project } from '../types'
import { orgOf } from '../settings/settings'
import Labels, { type LabelBrand } from './Labels'
import { cableLabels, caseLabels, deviceLabels } from './labels'

type Kind = 'cables' | 'devices' | 'cases'

const stored = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Which labels to print, then the browser's print dialog. */
export default function LabelsDialog({ project, onClose, onShare }: { project: Project; onClose: () => void; onShare?: () => void }) {
  const [kinds, setKinds] = useState<Set<Kind>>(new Set(['cables', 'devices', 'cases']))
  const [twice, setTwice] = useState(true)
  const [printing, setPrinting] = useState(false)
  // A logo and a name on every label, chosen here and kept for next time.
  const [logoOf, setLogoOf] = useState<'none' | 'org' | 'client'>(() => (stored('synopgig.labelLogo') as 'org' | 'client' | null) ?? 'none')
  const [textOf, setTextOf] = useState<'none' | 'project' | 'org' | 'client'>(() => (stored('synopgig.labelText') as 'project' | 'org' | 'client' | null) ?? 'none')
  const org = orgOf(project)
  const client = project.info?.client
  const brand: LabelBrand = {
    logo: logoOf === 'org' ? org?.logo : logoOf === 'client' ? client?.logo : undefined,
    text: textOf === 'project' ? project.name : textOf === 'org' ? org?.name : textOf === 'client' ? client?.name : undefined,
  }
  const remember = (key: string, v: string) => {
    try {
      localStorage.setItem(key, v)
    } catch {
      // Storage blocked: the choice lasts for this visit.
    }
  }
  const all = useMemo(() => ({ cables: cableLabels(project), devices: deviceLabels(project), cases: caseLabels(project) }), [project])
  const toggle = (k: Kind) => setKinds((s) => (s.has(k) ? new Set([...s].filter((x) => x !== k)) : new Set([...s, k])))

  useEffect(() => {
    if (!printing) return
    document.body.classList.add('printing-labels')
    const done = () => {
      document.body.classList.remove('printing-labels')
      setPrinting(false)
    }
    window.addEventListener('afterprint', done, { once: true })
    const raf = requestAnimationFrame(() => window.print())
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('afterprint', done)
      document.body.classList.remove('printing-labels')
    }
  }, [printing])

  const count = (kinds.has('cables') ? all.cables.length * (twice ? 2 : 1) : 0) + (kinds.has('devices') ? all.devices.length : 0) + (kinds.has('cases') ? all.cases.length : 0)

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Étiquettes">
        <h3>Étiquettes à imprimer</h3>
        <p className="muted small">Sur A4, avec les traits de coupe : papier adhésif, ou du papier normal et du scotch.</p>
        <div className="modal-list">
          <label className="toggle">
            <input type="checkbox" checked={kinds.has('cables')} onChange={() => toggle('cables')} /> Câbles ({all.cables.length}) : repère, de → vers, connecteur, longueur
          </label>
          {kinds.has('cables') && (
            <label className="toggle sub">
              <input type="checkbox" checked={twice} onChange={(e) => setTwice(e.target.checked)} /> Une étiquette à chaque bout
            </label>
          )}
          <label className="toggle">
            <input type="checkbox" checked={kinds.has('devices')} onChange={() => toggle('devices')} /> Équipements ({all.devices.length}) : repère, modèle, zone, IP / DMX
          </label>
          <label className="toggle">
            <input type="checkbox" checked={kinds.has('cases')} onChange={() => toggle('cases')} /> Flight cases ({all.cases.length}) : numéro, nom, contenu, poids
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            <span>Logo sur les étiquettes</span>
            <select value={logoOf} onChange={(e) => { setLogoOf(e.target.value as typeof logoOf); remember('synopgig.labelLogo', e.target.value) }}>
              <option value="none">Aucun</option>
              <option value="org" disabled={!org?.logo}>Mon organisation{org?.logo ? '' : ' (pas de logo)'}</option>
              <option value="client" disabled={!client?.logo}>Le client{client?.logo ? '' : ' (pas de logo)'}</option>
            </select>
          </label>
          <label className="field">
            <span>Nom sur les étiquettes</span>
            <select value={textOf} onChange={(e) => { setTextOf(e.target.value as typeof textOf); remember('synopgig.labelText', e.target.value) }}>
              <option value="none">Aucun</option>
              <option value="project">Le projet ({project.name})</option>
              <option value="org" disabled={!org?.name}>Mon organisation{org?.name ? ` (${org.name})` : ''}</option>
              <option value="client" disabled={!client?.name}>Le client{client?.name ? ` (${client.name})` : ''}</option>
            </select>
          </label>
        </div>
        <p className="muted small">Logos et noms : bouton ⚙ à côté du nom du projet.</p>
        {project.share?.id ? (
          <p className="muted small">Les équipements et les flight cases portent un QR code : scanné sur place, il ouvre sa fiche dans le lien de partage du projet.</p>
        ) : (
          <p className="muted small">
            Pour ajouter des QR codes (ils ouvrent la fiche sur un téléphone), créez d’abord le lien de partage du projet{onShare ? ' : ' : '.'}
            {onShare && <button className="link" onClick={onShare}>Partager le projet</button>}
          </p>
        )}
        <div className="actions">
          <button onClick={onClose}>Fermer</button>
          <button className="primary" disabled={count === 0} onClick={() => setPrinting(true)}>Imprimer {count} étiquette(s)</button>
        </div>
      </div>
      {printing &&
        createPortal(
          <Labels brand={brand} cables={kinds.has('cables') ? all.cables : []} twice={twice} devices={kinds.has('devices') ? all.devices : []} cases={kinds.has('cases') ? all.cases : []} />,
          document.body,
        )}
    </div>
  )
}
