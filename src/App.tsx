import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import CaseEditor from './cases/CaseEditor'
import { LIBRARY } from './data/library'
import TechGuide from './guide/TechGuide'
import Lists from './lists/Lists'
import { demoProject, download, emptyProject, loadProject, parseProject, saveProject, slug } from './project'
import SynopticEditor from './synoptic/SynopticEditor'
import type { Project } from './types'

type Tab = 'synoptic' | 'guide' | 'lists' | 'cases'

const TABS: { id: Tab; label: string }[] = [
  { id: 'synoptic', label: 'Synoptique' },
  { id: 'guide', label: 'Guide technicien' },
  { id: 'lists', label: 'Listes' },
  { id: 'cases', label: 'Flight cases' },
]

export default function App() {
  const [project, setProject] = useState<Project>(loadProject)
  const [tab, setTab] = useState<Tab>('synoptic')
  const [focus, setFocus] = useState<string[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => saveProject(project), 300)
    return () => clearTimeout(t)
  }, [project])

  const templates = useMemo(() => [...LIBRARY, ...project.customTemplates], [project.customTemplates])

  const replace = (p: Project) => {
    setProject(p)
    setFocus([])
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      replace(parseProject(await file.text()))
    } catch (e) {
      alert(`Import impossible : ${(e as Error).message}`)
    }
  }

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <span className="logo">◆</span> SynopGig
        </div>
        <input className="project-name" value={project.name} onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))} aria-label="Nom du projet" />
        <input className="project-meta" placeholder="Lieu" value={project.venue} onChange={(e) => setProject((p) => ({ ...p, venue: e.target.value }))} aria-label="Lieu" />
        <input className="project-meta" type="date" value={project.date} onChange={(e) => setProject((p) => ({ ...p, date: e.target.value }))} aria-label="Date" />
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="file-actions">
          <button onClick={() => confirm('Créer un projet vide ? Pensez à exporter le projet actuel.') && replace(emptyProject())}>Nouveau</button>
          <button onClick={() => confirm('Charger le projet de démonstration ?') && replace(demoProject())}>Démo</button>
          <button onClick={() => fileInput.current?.click()}>Ouvrir</button>
          <button onClick={() => download(`${slug(project.name)}.synopgig.json`, JSON.stringify(project, null, 2), 'application/json')}>Enregistrer</button>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </header>
      <main>
        {tab === 'synoptic' && (
          <ReactFlowProvider>
            <SynopticEditor project={project} setProject={setProject} templates={templates} focus={focus} />
          </ReactFlowProvider>
        )}
        {tab === 'guide' && (
          <TechGuide
            project={project}
            setProject={setProject}
            onShow={(ids) => {
              setFocus(ids)
              setTab('synoptic')
            }}
          />
        )}
        {tab === 'lists' && <Lists project={project} />}
        {tab === 'cases' && <CaseEditor project={project} setProject={setProject} />}
      </main>
    </div>
  )
}
