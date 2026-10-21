import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Project } from '../types'
import Dossier from './Dossier'
import type { SynopticMode } from './SynopticPages'
import { SECTIONS, type SectionId } from './sections'

const KEY = 'synopgig.dossier'
const ALL = SECTIONS.map((s) => s.id)

function readChoice(): SectionId[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return Array.isArray(v) ? v.filter((x): x is SectionId => (ALL as string[]).includes(x)) : ALL.filter((id) => id !== 'ports')
  } catch {
    return ALL.filter((id) => id !== 'ports')
  }
}

/** Choice of sections, then the browser's print dialog (paper or PDF). */
export default function DossierDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const [chosen, setChosen] = useState<Set<SectionId>>(() => new Set(readChoice()))
  const [printing, setPrinting] = useState(false)
  const [printedOn, setPrintedOn] = useState('')
  const [synopticMode, setSynopticMode] = useState<SynopticMode>(() => {
    try {
      return localStorage.getItem(`${KEY}.synoptic`) === 'tiles' ? 'tiles' : 'fit'
    } catch {
      return 'fit'
    }
  })
  const chooseMode = (m: SynopticMode) => {
    setSynopticMode(m)
    try {
      localStorage.setItem(`${KEY}.synoptic`, m)
    } catch {
      // Storage blocked: the choice lasts for this visit only.
    }
  }

  const save = (next: Set<SectionId>) => {
    setChosen(next)
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]))
    } catch {
      // Storage blocked: the choice lasts for this visit only.
    }
  }
  const toggle = (id: SectionId) => {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    save(next)
  }

  useEffect(() => {
    if (!printing) return
    document.body.classList.add('printing-dossier')
    const done = () => {
      document.body.classList.remove('printing-dossier')
      setPrinting(false)
    }
    window.addEventListener('afterprint', done, { once: true })
    // Let the pages and the logo render before the print dialog opens.
    const imgs = [...document.querySelectorAll<HTMLImageElement>('.dossier img')]
    let cancelled = false
    Promise.all(imgs.map((i) => i.decode().catch(() => undefined))).then(() => requestAnimationFrame(() => !cancelled && window.print()))
    return () => {
      cancelled = true
      window.removeEventListener('afterprint', done)
      document.body.classList.remove('printing-dossier')
    }
  }, [printing])

  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Dossier technique" onClick={(e) => e.stopPropagation()}>
        <h3>Dossier technique complet</h3>
        <p className="muted small">Choisissez les parties à imprimer. Dans la fenêtre d’impression, choisissez « Enregistrer en PDF » pour obtenir un fichier.</p>
        <div className="modal-list">
          {SECTIONS.map((s) => (
            <label key={s.id} className="toggle">
              <input type="checkbox" checked={chosen.has(s.id)} onChange={() => toggle(s.id)} /> {s.label}
            </label>
          ))}
        </div>
        <label className="field">
          <span>Synoptique sur papier</span>
          <select value={synopticMode} onChange={(e) => chooseMode(e.target.value as SynopticMode)}>
            <option value="fit">Tout sur une page A4 (portrait ou paysage selon sa forme)</option>
            <option value="tiles">Grand format : vue d’ensemble + planches A4 à assembler, lisibles</option>
          </select>
        </label>
        <p className="muted small">Le synoptique imprimé suit l’affichage choisi sur le synoptique (département, signaux masqués, ports libres).</p>
        <div className="actions">
          <button onClick={() => save(new Set(ALL))}>Tout cocher</button>
          <button onClick={onClose}>Fermer</button>
          <button className="primary" disabled={chosen.size === 0} onClick={() => { setPrintedOn(new Date().toLocaleDateString('fr-FR')); setPrinting(true) }}>Imprimer / PDF</button>
        </div>
      </div>
      {printing && createPortal(<Dossier project={project} sections={chosen} printedOn={printedOn} synopticMode={synopticMode} />, document.body)}
    </div>
  )
}
