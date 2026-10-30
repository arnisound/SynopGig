import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CaseEditor from './cases/CaseEditor'
import { LIBRARY } from './data/library'
import TechGuide from './guide/TechGuide'
import LibraryPage from './library/LibraryPage'
import PowerPage from './power/PowerPage'
import { useUserLibrary } from './library/useUserLibrary'
import PatchPage from './patch/PatchPage'
import DossierDialog from './print/DossierDialog'
import LabelsDialog from './labels/LabelsDialog'
import { projectChanges } from './share/changes'
import { savedDocs, savedPhotos } from './library/photos'
import { addModelPhotos } from './library/modelPhotos'
import { fetchSharedPhotos } from './library/sharedPhotos'
import { cachedShared, fetchShared, saveSharedProgress, sharedIdFromHash, sharedTargetFromHash, sharedProgress } from './share/share'
import ShareDialog, { ChangeList } from './share/ShareDialog'
import StagePage from './stage/StagePage'
import { applyTheme, readTheme, THEME_LABELS, type Theme } from './theme'
import Lists from './lists/Lists'
import RackBuilder from './racks/RackBuilder'
import { demoProject, download, emptyProject, loadProject, parseProject, saveProject, slug } from './project'
import SynopticEditor from './synoptic/SynopticEditor'
import type { Project } from './types'

type Tab = 'synoptic' | 'patch' | 'stage' | 'racks' | 'power' | 'guide' | 'lists' | 'cases' | 'library'

const TABS: { id: Tab; label: string }[] = [
  { id: 'synoptic', label: 'Synoptique' },
  { id: 'patch', label: 'Patch' },
  { id: 'stage', label: 'Plan de scène' },
  { id: 'racks', label: 'Racks' },
  { id: 'power', label: 'Énergie' },
  { id: 'guide', label: 'Guide technicien' },
  { id: 'lists', label: 'Listes' },
  { id: 'cases', label: 'Flight cases' },
  { id: 'library', label: 'Bibliothèque' },
]

/** Opened from a read-only link (#/p/<id>): the shared project, never the user's own. */
const SHARED_ID = sharedIdFromHash()
// A label's QR code opens one flight case or one device straight away.
const TARGET = sharedTargetFromHash()

function initialProject(): Project {
  if (!SHARED_ID) return loadProject()
  const cached = cachedShared(SHARED_ID)
  return { ...(cached?.project ?? { ...emptyProject(), name: 'Chargement du projet partagé…' }), progress: sharedProgress(SHARED_ID) }
}

export default function App() {
  const [project, setProject] = useState<Project>(initialProject)
  const [shared, setShared] = useState<{ status: 'loading' | 'ready' | 'error'; updatedAt?: string; error?: string; changes?: string[] }>(() => ({
    status: SHARED_ID && cachedShared(SHARED_ID) ? 'ready' : 'loading',
    updatedAt: SHARED_ID ? cachedShared(SHARED_ID)?.updatedAt : undefined,
  }))
  const [sharing, setSharing] = useState(false)
  // On a phone, the crew opening the show's link wants the checklist first.
  const [tab, setTab] = useState<Tab>(TARGET?.kind === 'case' ? 'cases' : SHARED_ID && !TARGET && matchMedia('(max-width: 760px)').matches ? 'guide' : 'synoptic')
  const [dossier, setDossier] = useState(false)
  const [labels, setLabels] = useState(false)
  const [menu, setMenu] = useState(false)
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const setTheme = (t: Theme) => {
    applyTheme(t)
    setThemeState(t)
  }
  const nextTheme: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' }
  const [focus, setFocus] = useState<string[]>(TARGET?.kind === 'device' ? [TARGET.id] : [])
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // A shared project is read-only: only the technician's ticks are kept, in this browser.
    const t = setTimeout(() => (SHARED_ID ? saveSharedProgress(SHARED_ID, project.progress) : saveProject(project)), 300)
    return () => clearTimeout(t)
  }, [project])

  const loadShared = useCallback(() => {
    if (!SHARED_ID) return
    // The copy read last time: the crew sees what changed since.
    const before = cachedShared(SHARED_ID)
    fetchShared(SHARED_ID)
      .then((r) => {
        setProject({ ...emptyProject(), ...r.project, progress: sharedProgress(SHARED_ID) })
        setShared((s) => ({
          status: 'ready',
          updatedAt: r.updatedAt,
          changes: before && before.updatedAt !== r.updatedAt ? projectChanges({ ...emptyProject(), ...before.project }, { ...emptyProject(), ...r.project }) : s.changes,
        }))
      })
      .catch((e) => setShared((s) => ({ ...s, status: s.updatedAt ? 'ready' : 'error', error: e instanceof Error ? e.message : String(e) })))
  }, [])
  useEffect(loadShared, [loadShared])

  // Pasting another link in the address bar opens it.
  useEffect(() => {
    const onHash = () => sharedIdFromHash() !== SHARED_ID && location.reload()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const leaveShared = () => {
    window.history.replaceState(null, '', location.pathname + location.search)
    location.reload()
  }
  const copyShared = () => {
    if (!confirm('Copier ce projet dans vos projets ? Il remplace votre projet en cours dans ce navigateur (enregistrez-le d’abord si besoin).')) return
    const own: Project = { ...project, progress: {} }
    delete own.share
    saveProject(own)
    leaveShared()
  }

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
  // Photos picked in this browser, then those other users found for models still without one.
  useEffect(() => {
    addModelPhotos(savedPhotos(), true)
    fetchSharedPhotos().then((shared) => addModelPhotos(shared))
  }, [])
  // Photos and documents found for base models in this browser join them.
  const base = useMemo(() => {
    const photos = savedPhotos()
    const docs = savedDocs()
    return LIBRARY.map((t) => (photos[t.id] || docs[t.id] ? { ...t, ...(photos[t.id] ? { image: photos[t.id] } : {}), ...(docs[t.id] ? { docs: docs[t.id] } : {}) } : t))
  }, [])
  const templates = useMemo(() => [...base, ...userLibrary.templates, ...project.customTemplates], [base, userLibrary.templates, project.customTemplates])

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
          <img className="logo" src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={28} height={28} />
          <span>
            SynopGig
            <a className="maker" href="https://arnisoundtools.com" target="_blank" rel="noopener noreferrer">par Arnisound tools</a>
          </span>
        </div>
        <input className="project-name" value={project.name} onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))} aria-label="Nom du projet" />
        <button className="icon-btn undo-mobile" onClick={undo} disabled={!canUndo} title="Annuler" aria-label="Annuler">↶</button>
        <button className="icon-btn menu-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu">{menu ? '✕' : '☰'}</button>
        {/* On phones and tablets these sit in the ☰ menu; on a computer they flow in the bar as before. */}
        <div className={`topbar-more ${menu ? 'open' : ''}`} onClick={(e) => (e.target as HTMLElement).closest('button') && setMenu(false)}>
          <input className="project-meta" placeholder="Lieu" value={project.venue} onChange={(e) => setProject((p) => ({ ...p, venue: e.target.value }))} aria-label="Lieu" />
          <input className="project-meta" type="date" value={project.date} onChange={(e) => setProject((p) => ({ ...p, date: e.target.value }))} aria-label="Date" />
        </div>
        <nav className="tabs">
          {TABS.filter((t) => !SHARED_ID || t.id !== 'library').map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => { setTab(t.id); setMenu(false) }}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className={`file-actions topbar-more ${menu ? 'open' : ''}`} onClick={(e) => (e.target as HTMLElement).closest('button') && setMenu(false)}>
          {SHARED_ID ? (
            <>
              <button onClick={loadShared} title="Recharger la dernière version partagée">Actualiser</button>
              <button onClick={copyShared}>Copier dans mes projets</button>
              <button onClick={leaveShared}>Quitter</button>
            </>
          ) : (
            <>
              <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)">↶ Annuler</button>
              <button onClick={() => confirm('Créer un projet vide ? Pensez à exporter le projet actuel.') && replace(emptyProject())}>Nouveau</button>
              <button onClick={() => confirm('Charger le projet de démonstration ?') && replace(demoProject())}>Démo</button>
              <button onClick={() => fileInput.current?.click()}>Ouvrir</button>
              <button onClick={() => download(`${slug(project.name)}.synopgig.json`, JSON.stringify(project, null, 2), 'application/json')}>Enregistrer</button>
              <button onClick={() => setSharing(true)} title="Lien en lecture seule pour l’équipe">Partager</button>
            </>
          )}
          <button onClick={() => setDossier(true)} title="Dossier technique complet à imprimer ou en PDF">Dossier PDF</button>
          <button onClick={() => setLabels(true)} title="Étiquettes de câbles, d’équipements et de flight cases, avec QR codes">Étiquettes</button>
          <button onClick={() => setTheme(nextTheme[theme])} title={`Thème : ${THEME_LABELS[theme]} (cliquer pour changer)`}>
            {theme === 'light' ? '☀ Clair' : theme === 'dark' ? '☾ Sombre' : '◐ Auto'}
          </button>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </header>
      {dossier && <DossierDialog project={project} onClose={() => setDossier(false)} />}
      {labels && <LabelsDialog project={project} onClose={() => setLabels(false)} onShare={SHARED_ID ? undefined : () => { setLabels(false); setSharing(true) }} />}
      {sharing && <ShareDialog project={project} setProject={setProject} onClose={() => setSharing(false)} />}
      {SHARED_ID && (
        <div className="shared-banner no-print">
          {shared.status === 'loading' && 'Chargement du projet partagé…'}
          {shared.status === 'error' && `Projet partagé introuvable : ${shared.error}`}
          {shared.status === 'ready' && (
            <>
              <b>Projet partagé, lecture seule</b>
              {shared.updatedAt && ` · version du ${new Date(shared.updatedAt).toLocaleDateString('fr-FR')}`}
              {shared.error && ' · hors ligne (dernière version lue)'} · seules vos cases cochées du guide sont gardées.
              {!!shared.changes?.length && (
                <ChangeList changes={shared.changes} title={`Mis à jour depuis votre dernière lecture : ${shared.changes.length} changement${shared.changes.length > 1 ? 's' : ''}`} />
              )}
            </>
          )}
        </div>
      )}
      <main>
        {tab === 'synoptic' && (
          <ReactFlowProvider>
            <SynopticEditor project={project} setProject={setProject} templates={templates} focus={focus} onOpenRacks={() => setTab('racks')} theme={theme} onTheme={setTheme} userLibrary={SHARED_ID ? undefined : userLibrary} />
          </ReactFlowProvider>
        )}
        {tab === 'patch' && <PatchPage project={project} setProject={setProject} />}
        {tab === 'stage' && <StagePage project={project} setProject={setProject} />}
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
        {tab === 'power' && <PowerPage project={project} setProject={setProject} />}
        {tab === 'cases' && <CaseEditor project={project} setProject={setProject} focusCase={TARGET?.kind === 'case' ? TARGET.id : undefined} />}
        {tab === 'library' && <LibraryPage project={project} setProject={setProject} userLibrary={userLibrary} />}
      </main>
    </div>
  )
}

/** Project content without view-only state (selection, measured sizes). */
function signature(p: Project) {
  return JSON.stringify(p, (k, v) => (k === 'selected' || k === 'measured' || k === 'dragging' ? undefined : v))
}
