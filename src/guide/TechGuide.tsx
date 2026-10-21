import { useMemo } from 'react'
import type { Project } from '../types'
import { buildGuide } from './steps'

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
  onShow: (ids: string[]) => void
}

export default function TechGuide({ project, setProject, onShow }: Props) {
  const { progress } = project

  const sections = useMemo(() => buildGuide(project), [project])

  const all = sections.flatMap((s) => s.steps)
  const done = all.filter((s) => progress[s.id]).length
  const pct = all.length ? Math.round((done / all.length) * 100) : 0

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
      {sections.map((s) => (
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
