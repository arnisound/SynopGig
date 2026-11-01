import { authorOf, orgOf } from '../settings/settings'
import type { Project } from '../types'

/** The title block of the printed pages: who makes it, for whom, which document, which revision. */
export default function TitleBlock({ project, title }: { project: Project; title?: string }) {
  const info = project.info ?? {}
  const org = orgOf(project)
  const client = info.client
  const date = project.date ? new Date(project.date).toLocaleDateString('fr-FR') : ''
  const cell = (label: string, value?: string) => (value ? <div><small>{label}</small><b>{value}</b></div> : null)
  return (
    <div className="d-titleblock">
      <div className="tb-logo">{org?.logo ? <img src={org.logo} alt="" /> : <b>{org?.name || 'SynopGig'}</b>}</div>
      <div className="tb-main">
        <b>{project.name}</b>
        <span>{[title || info.docType, info.site, info.room || project.venue].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="tb-cells">
        {cell('Client', client?.name)}
        {cell('Document', info.docType)}
        {cell('Indice', info.revision)}
        {cell('Statut', info.status)}
        {cell('Réalisé par', authorOf(project))}
        {cell('Date', date)}
      </div>
      {client?.logo && <div className="tb-logo"><img src={client.logo} alt="" /></div>}
    </div>
  )
}
