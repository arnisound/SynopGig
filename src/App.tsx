import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CaseEditor from './cases/CaseEditor'
import { LIBRARY } from './data/library'
import TechGuide from './guide/TechGuide'
import LibraryPage from './library/LibraryPage'
import { useUserLibrary } from './library/useUserLibrary'
import Lists from './lists/Lists'
import RackBuilder from './racks/RackBuilder'
import { demoProject, download, emptyProject, loadProject, parseProject, saveProject, slug } from './project'
import SynopticEditor from './synoptic/SynopticEditor'
import type { Project } from './types'

type Tab = 'synoptic' | 'racks' | 'guide' | 'lists' | 'cases' | 'library'

const TABS: { id: Tab; label: string }[] = [
  { id: 'synoptic', label: 'Synoptique' },
  { id: 'racks', label: 'Racks' },
  { id: 'guide', label: 'Guide technicien' },
  { id: 'lists', label: 'Listes' },
  { id: 'cases', label: 'Flight cases' },
  { id: 'library', label: 'Bibliothèque' },
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

  // Undo history: one snapshot per burst of edits, selection changes ignored.
  const history = useRef<Project[]>([])
  const committed = useRef(project)
  const [canUndo, setCanUndo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => {
      if (signature(committed.current) === signature(project)) return
      history.current = [...history.current.slice(-49), committed.current]
      committed.current = project
      setCanUndo(true)
    }, 400)
    return () => clearTimeout(t)
  }, [project])

  const undo = useCallback(() => {
    const prev = history.current.pop()
    if (!prev) return
    committed.current = prev
    setProject(prev)
    setCanUndo(history.current.length > 0)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select')) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  const userLibrary = useUserLibrary()
  const templates = useMemo(() => [...LIBRARY, ...userLibrary.templates, ...project.customTemplates], [userLibrary.templates, project.customTemplates])

  // The personal library follows the user from one project to the next.
  const replace = (incoming: Project) => {
    const mine = new Map([...project.customTemplates, ...incoming.customTemplates].map((t) => [t.id, t]))
    const p = { ...incoming, customTemplates: [...mine.values()] }
    history.current = []
    committed.current = p
    setCanUndo(false)
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
          <img className="logo" src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={28} height={28} /> SynopGig
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
          <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)">↶ Annuler</button>
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
            <SynopticEditor project={project} setProject={setProject} templates={templates} focus={focus} onOpenRacks={() => setTab('racks')} />
          </ReactFlowProvider>
        )}
        {tab === 'racks' && <RackBuilder project={project} setProject={setProject} templates={templates} />}
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
        {tab === 'library' && <LibraryPage project={project} setProject={setProject} userLibrary={userLibrary} />}
      </main>
    </div>
  )
}

/** Project content without view-only state (selection, measured sizes). */
function signature(p: Project) {
  return JSON.stringify(p, (k, v) => (k === 'selected' || k === 'measured' || k === 'dragging' ? undefined : v))
}
