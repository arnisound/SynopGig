import { useMemo, useState } from 'react'
import type { Project } from '../types'
import { buildGuide, findSteps } from './steps'

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
  onShow: (ids: string[]) => void
  /** What to look for straight away (a label's QR code). */
  initialQuery?: string
}

export default function TechGuide({ project, setProject, onShow, initialQuery = '' }: Props) {
  const { progress } = project
  const [query, setQuery] = useState(initialQuery)
  const [left, setLeft] = useState(false)
  // One trade only: the light crew does not need the sound cables.
  const [trade, setTrade] = useState('')

  const sections = useMemo(() => buildGuide(project), [project])

  const all = sections.flatMap((s) => s.steps)
  const done = all.filter((s) => progress[s.id]).length
  const pct = all.length ? Math.round((done / all.length) * 100) : 0
  const trades = useMemo(() => [...new Set(sections.flatMap((s) => s.steps.map((x) => x.trade)).filter((t): t is string => !!t))], [sections])
  const shown = useMemo(() => {
    const base = query.trim() || left ? findSteps(sections, query, left ? progress : undefined) : sections
    return trade ? base.map((s) => ({ ...s, steps: s.steps.filter((x) => x.trade === trade) })).filter((s) => s.steps.length) : base
  }, [sections, query, left, progress, trade])
  const found = shown.reduce((n, s) => n + s.steps.length, 0)

  const toggle = (id: string) =>
    setProject((p) => ({ ...p, progress: { ...p.progress, [id]: !p.progress[id] } }))

  return (
    <div className="page guide">
      <header className="page-head">
        <div>
          <h2>Guide technicien</h2>
          <p>
            {project.name}
            {project.venue && ` — ${project.venue}`}
            {project.date && ` — ${new Date(project.date).toLocaleDateString('fr-FR')}`}
          </p>
        </div>
        <div className="no-print">
          <button onClick={() => window.print()}>Imprimer la feuille de montage</button>
          <button onClick={() => confirm('Remettre la progression à zéro ?') && setProject((p) => ({ ...p, progress: {} }))}>
            Réinitialiser
          </button>
        </div>
      </header>
      <div className="progress">
        <div style={{ width: `${pct}%` }} />
        <span>{done} / {all.length} étapes · {pct} %</span>
      </div>
      <div className="guide-find no-print">
        <input
          type="search"
          placeholder="Où va… un câble (AUD-042), un équipement, un port"
          aria-label="Chercher dans le guide"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={trade} onChange={(e) => setTrade(e.target.value)} aria-label="Métier">
          <option value="">Tous les métiers</option>
          {trades.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="check">
          <input type="checkbox" checked={left} onChange={(e) => setLeft(e.target.checked)} /> Reste à faire
        </label>
        {(query.trim() || left) && <span className="muted small">{found} étape{found > 1 ? 's' : ''}</span>}
      </div>
      {(query.trim() || left) && found === 0 && <p className="muted">{left && !query.trim() ? 'Tout est fait. Bon spectacle !' : 'Rien ne correspond.'}</p>}
      {shown.map((s) => (
        <section key={s.title}>
          <h3>{s.title}</h3>
          {s.steps.length === 0 && <p className="muted">Rien à faire ici.</p>}
          <ol className="steps">
            {s.steps.map((step) => (
              <li key={step.id} className={progress[step.id] ? 'done' : ''} style={{ borderLeftColor: step.color }}>
                <input type="checkbox" checked={!!progress[step.id]} onChange={() => toggle(step.id)} />
                <div className="step-body" onClick={() => toggle(step.id)}>
                  <div className="step-title">{step.title}</div>
                  {step.detail && <div className="step-detail">{step.detail}</div>}
                  {step.warnings?.map((w) => (
                    <div key={w} className="issue warning">{w}</div>
                  ))}
                </div>
                <button className="no-print" onClick={() => onShow(step.focus)}>Voir</button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
