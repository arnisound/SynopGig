import { useMemo } from 'react'
import { download, slug, toCsv } from '../project'
import type { Project } from '../types'
import { buildTables, type Cell } from './tables'

function Table({ head, rows, alerts }: { head: string[]; rows: Cell[][]; alerts?: boolean }) {
  return (
    <table className={alerts ? 'with-alerts' : undefined}>
      <thead>
        <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={head.length} className="muted">Aucune donnée</td></tr>
        )}
      </tbody>
    </table>
  )
}

export default function Lists({ project }: { project: Project }) {
  const base = slug(project.name)
  const blocks = useMemo(() => buildTables(project), [project])

  return (
    <div className="page lists">
      <header className="page-head">
        <div>
          <h2>Listes & nomenclature</h2>
          <p>Générées automatiquement depuis le synoptique.</p>
        </div>
        <button className="no-print" onClick={() => window.print()}>Imprimer / PDF</button>
      </header>
      {blocks.map((b) => (
        <section key={b.file}>
          <div className="section-head">
            <h3>{b.title}</h3>
            <button className="no-print" onClick={() => download(`${base}-${b.file}.csv`, toCsv([b.head, ...b.rows]), 'text/csv')}>
              Export CSV
            </button>
          </div>
          <Table head={b.head} rows={b.rows} alerts={b.alerts} />
        </section>
      ))}
    </div>
  )
}
