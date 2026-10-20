import { useMemo } from 'react'
import { CONNECTORS, SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS } from '../data/library'
import { resolveCables } from '../project'
import type { DeviceNode, Project } from '../types'

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
  onShow: (ids: string[]) => void
}

interface Step {
  id: string
  focus: string[]
  title: string
  detail?: string
  warnings?: string[]
  color: string
}

function hasConfig(n: DeviceNode) {
  const c = n.data.config
  return Boolean(c.ip || c.dmxAddress || c.mode || c.notes)
}

export default function TechGuide({ project, setProject, onShow }: Props) {
  const { nodes, edges, progress } = project

  const sections = useMemo(() => {
    const zones = [...new Set(nodes.map((n) => n.data.zone || 'Sans zone'))].sort()
    const placement: Step[] = zones.flatMap((z) =>
      nodes
        .filter((n) => (n.data.zone || 'Sans zone') === z)
        .map((n) => ({
          id: `place-${n.id}`,
          focus: [n.id],
          title: `${z} — installer « ${n.data.name} »`,
          detail: n.data.model,
          color: CATEGORY_COLORS[n.data.category],
        })),
    )
    const cabling: Step[] = resolveCables(nodes, edges).map((c) => ({
      id: `cable-${c.edge.id}`,
      focus: [c.edge.id],
      title: `${c.edge.data?.cableId} — ${c.from?.data.name} [${c.fromPort?.label}] → ${c.to?.data.name} [${c.toPort?.label}]`,
      detail: [
        c.fromPort && CONNECTORS[c.fromPort.connector],
        c.toPort && c.toPort.connector !== c.fromPort?.connector && `vers ${CONNECTORS[c.toPort.connector]}`,
        c.edge.data?.length && `${c.edge.data.length} m`,
        c.edge.data?.note,
      ]
        .filter(Boolean)
        .join(' · '),
      warnings: c.issues.map((i) => i.message),
      color: c.fromPort ? SIGNALS[c.fromPort.signal].color : '#888',
    }))
    const config: Step[] = nodes.filter(hasConfig).map((n) => {
      const c = n.data.config
      return {
        id: `config-${n.id}`,
        focus: [n.id],
        title: `Configurer « ${n.data.name} »`,
        detail: [
          c.ip && `IP ${c.ip}`,
          c.dmxAddress && `DMX univers ${c.dmxUniverse || 1}, adresse ${c.dmxAddress}`,
          c.mode && `Mode : ${c.mode}`,
          c.notes,
        ]
          .filter(Boolean)
          .join('\n'),
        color: CATEGORY_COLORS[n.data.category],
      }
    })
    return [
      { title: '1. Mise en place', steps: placement },
      { title: '2. Câblage', steps: cabling },
      { title: '3. Configuration', steps: config },
    ]
  }, [nodes, edges])

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
