import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Project } from '../types'
import Labels from './Labels'
import { cableLabels, caseLabels, deviceLabels } from './labels'

type Kind = 'cables' | 'devices' | 'cases'

/** Which labels to print, then the browser's print dialog. */
export default function LabelsDialog({ project, onClose, onShare }: { project: Project; onClose: () => void; onShare?: () => void }) {
  const [kinds, setKinds] = useState<Set<Kind>>(new Set(['cables', 'devices', 'cases']))
  const [twice, setTwice] = useState(true)
  const [printing, setPrinting] = useState(false)
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
          <Labels cables={kinds.has('cables') ? all.cables : []} twice={twice} devices={kinds.has('devices') ? all.devices : []} cases={kinds.has('cases') ? all.cases : []} />,
          document.body,
        )}
    </div>
  )
}
