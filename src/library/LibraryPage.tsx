import { useEffect, useMemo, useRef, useState } from 'react'
import { CONNECTORS, SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS, FAMILY_ORDER, LIBRARY } from '../data/library'
import { download, uid } from '../project'
import type { Category, ConnectorType, DeviceTemplate, PortDirection, Project, SignalType } from '../types'
import { availableEngines, ENGINE_LABELS, GEMINI_DEFAULT_MODEL, type AiResult, type Engine } from './ai'
import { findKnownModels } from './findKnown'
import { parseDatasheet } from './parseDatasheet'
import { expandGroups, groupPorts, type PortGroup } from './portGroups'
import { encodeShared } from './userLibrary'
import { findDocs, loadDoc, type FoundDoc } from './finder'
import { fetchImage, pageImages, shrink } from './images'
import DeviceArt from '../ui/DeviceArt'
import type { UserLibrary } from './useUserLibrary'
import type { NewProductRequest } from './newProduct'

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Autre']
const DIRS: Record<PortDirection, string> = { in: 'Entrée', out: 'Sortie', io: 'Bidirectionnel' }
const BRANDS = [...new Set(LIBRARY.map((t) => t.brand).filter((b): b is string => !!b && b !== 'Générique'))]

/** Per-browser settings: never shared, never sent anywhere but where they belong. */
const store = {
  get: (k: string, d = '') => {
    try {
      return localStorage.getItem(`synopgig.${k}`) ?? d
    } catch {
      return d
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(`synopgig.${k}`, v)
    } catch {
      // Storage blocked: the setting lasts for this visit only.
    }
  },
}

interface Row extends PortGroup {
  key: string
  /** From the rule-based analysis: lines read, and why the row needs a look. */
  evidence?: string[]
  guessed?: boolean
  conflicting?: number[]
  ai?: boolean
  /** AI rows: why the sheet does not confirm it (empty: confirmed). */
  doubts?: string[]
}

interface Draft {
  id?: string
  brand: string
  model: string
  category: Category
  family: string
  rackU?: number
  weight?: number
  rows: Row[]
  /** Built from a document found by "Le chercher pour vous": shared with everyone when saved. */
  found?: { url: string; share: boolean }
  /** Product photo (small data URL); the symbol of its kind otherwise. */
  image?: string
}

/** Time of an analysis, for the status line. */
const clock = () => Date.now()

const row = (g: PortGroup & Partial<Omit<Row, keyof PortGroup | 'key'>>): Row => ({ ...g, key: uid() })

const blank = (): Draft => ({
  brand: '',
  model: '',
  category: 'Son',
  family: '',
  rows: [row({ prefix: 'In', count: 1, connector: 'xlr3', signal: 'audio-analog', dir: 'in' })],
})

const fromTemplate = (t: DeviceTemplate, keepId: boolean): Draft => ({
  id: keepId ? t.id : undefined,
  brand: t.brand ?? '',
  model: keepId ? t.model : `${t.model} (copie)`,
  category: t.category,
  family: t.family ?? '',
  rackU: t.rackU,
  weight: t.weight,
  rows: groupPorts(t.ports).map((g) => row(g)),
  image: t.image,
})

const fromResult = (r: AiResult, rows: Row[]): Draft => ({
  brand: r.brand ?? '',
  model: r.model ?? '',
  category: r.category,
  family: r.family ?? '',
  rackU: r.rackU,
  weight: r.weight,
  rows,
})

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
  userLibrary: UserLibrary
  /** New product asked for from the synoptic palette. */
  request?: NewProductRequest
}

const sameModel = (a: { brand?: string; model: string }, b: { brand?: string; model: string }) => {
  const k = (t: { brand?: string; model: string }) => `${t.brand ?? ''} ${t.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return k(a) === k(b)
}

export default function LibraryPage({ project, setProject, userLibrary, request }: Props) {
  const [draft, setDraft] = useState<Draft>()
  const [suggestions, setSuggestions] = useState<Row[]>([])
  const [text, setText] = useState('')
  const [file, setFile] = useState<File>()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [engines, setEngines] = useState<Engine[]>()
  const [allowChrome, setAllowChrome] = useState(() => store.get('ai.chrome') === '1')
  const [known, setKnown] = useState<DeviceTemplate[]>([])
  const [geminiKey, setGeminiKey] = useState(() => store.get('ai.geminiKey'))
  const [geminiModel, setGeminiModel] = useState(() => store.get('ai.geminiModel', GEMINI_DEFAULT_MODEL))
  const [pseudo, setPseudo] = useState(() => store.get('pseudo'))
  const [sharing, setSharing] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const mine = project.customTemplates

  // "Le chercher pour vous"
  const [fBrand, setFBrand] = useState('')
  const [fModel, setFModel] = useState('')
  const [found, setFound] = useState<FoundDoc[]>()
  const [foundKnown, setFoundKnown] = useState<DeviceTemplate[]>([])
  const [finding, setFinding] = useState(false)
  const [findStatus, setFindStatus] = useState('')
  const [lastRequest, setLastRequest] = useState<number>()
  const finderRef = useRef<HTMLElement>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const editorRef = useRef<HTMLElement>(null)
  if (request && request.n !== lastRequest) {
    setLastRequest(request.n)
    if (request.mode === 'find') {
      // From the palette: "Shure SM7dB" → brand Shure, model SM7dB when the brand is known.
      const first = request.query.split(/\s+/)[0] ?? ''
      const b = BRANDS.find((x) => x.toLowerCase() === first.toLowerCase())
      setFBrand(b ?? '')
      setFModel(b ? request.query.slice(first.length).trim() : request.query)
      setFound(undefined)
      setFoundKnown([])
      setFindStatus(request.query ? 'Vérifiez la marque et le modèle, puis « Chercher ce produit ».' : 'Indiquez la marque et le modèle, puis « Chercher ce produit ».')
    } else if (request.mode === 'manual') {
      setDraft(blank())
      setSuggestions([])
      setStatus('Fiche vide : renseignez le modèle et sa connectique, puis enregistrez.')
    }
  }
  // The part of the page the palette asked for, in view; a sheet is read and analysed at once.
  useEffect(() => {
    if (!request) return
    const target = request.mode === 'find' ? finderRef : request.mode === 'doc' ? sheetRef : editorRef
    target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (request.mode === 'doc') void onFile(request.file, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per request
  }, [request])

  // Photos found with the documentation, as thumbnails to choose from.
  const [photos, setPhotos] = useState<string[]>([])
  const [photoStatus, setPhotoStatus] = useState('')
  const photoInput = useRef<HTMLInputElement>(null)
  const loadPhotos = async (urls: string[]) => {
    if (urls.length === 0) return setPhotoStatus('Aucune photo trouvée : le symbole de son type est utilisé, ou importez une image.')
    setPhotoStatus('Récupération des photos…')
    const got = (await Promise.allSettled(urls.slice(0, 4).map(fetchImage))).flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    setPhotos(got)
    setPhotoStatus(got.length ? 'Choisissez la photo d’illustration (ou gardez le symbole).' : 'Photos inaccessibles : le symbole de son type est utilisé, ou importez une image.')
    // The first photo is taken unless the user already chose one.
    if (got[0]) setDraft((d) => (d && !d.image ? { ...d, image: got[0] } : d))
  }
  const importPhoto = async (f?: File) => {
    if (!f || !draft) return
    try {
      const img = await shrink(f)
      setDraft((d) => d && { ...d, image: img })
    } catch {
      setPhotoStatus('Image illisible.')
    }
  }

  const findProduct = async (force = false) => {
    if (!fModel.trim()) return setFindStatus('Indiquez au moins le modèle.')
    setFound(undefined)
    // Already in the catalogue or the USER library: no need to search.
    const hits = force ? [] : findKnownModels(`${fBrand} ${fModel}`, [...userLibrary.templates, ...mine, ...LIBRARY])
    setFoundKnown(hits)
    if (hits.length) return setFindStatus('Déjà disponible : utilisez-le directement depuis la palette, ou cherchez quand même sa documentation.')
    setFinding(true)
    setFindStatus('Recherche de la documentation officielle…')
    try {
      const docs = await findDocs(fBrand.trim(), fModel.trim())
      setFound(docs)
      setFindStatus('Est-ce le bon document ? Rien n’est analysé avant votre confirmation.')
    } catch (e) {
      setFindStatus(`Recherche impossible : ${(e as Error).message}`)
    } finally {
      setFinding(false)
    }
  }

  const analyseDoc = async (doc: FoundDoc) => {
    setFinding(true)
    setFindStatus(`Lecture de ${doc.host}…`)
    try {
      const { text: docText, pdf, images } = await loadDoc(doc, fModel.trim())
      setPhotos([])
      setPhotoStatus('')
      // A PDF has no photo to offer: take them from the product page found with it.
      const page = images.length ? undefined : (found ?? []).find((d) => d.kind === 'page' && d.official) ?? (found ?? []).find((d) => d.kind === 'page')
      setText(docText)
      setFile(pdf)
      setFindStatus('')
      // The exact name the user confirmed decides: a neighbouring model would give a wrong sheet.
      const doubtful = await runAi(docText, `la documentation de ${doc.host}`, pdf, `${fBrand.trim()} ${fModel.trim()}`.trim())
      // Only a sheet that confirms every row is shared with everyone without a second look.
      setDraft((d) => d && { ...d, brand: fBrand.trim() || d.brand, model: fModel.trim(), found: { url: doc.url, share: doubtful === 0 } })
      if (doubtful > 0) setStatus((s) => `${s} Le partage USER attend votre relecture : cochez-le une fois les lignes en orange vérifiées.`)
      setFound(undefined)
      void (images.length ? Promise.resolve(images) : page ? pageImages(page.url, fModel.trim()) : Promise.resolve([])).then(loadPhotos)
    } catch (e) {
      setFindStatus(`Lecture impossible : ${(e as Error).message} Téléchargez la fiche et déposez-la ci-dessous.`)
    } finally {
      setFinding(false)
    }
  }

  useEffect(() => {
    let alive = true
    availableEngines(geminiKey, allowChrome).then((e) => alive && setEngines(e))
    return () => {
      alive = false
    }
  }, [geminiKey, allowChrome])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return LIBRARY.filter((t) => !t.panel && `${t.brand ?? ''} ${t.model}`.toLowerCase().includes(q)).slice(0, 30)
  }, [query])

  const userResults = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    const list = userLibrary.templates.filter((t) => !q || `${t.brand ?? ''} ${t.model} ${t.author ?? ''}`.toLowerCase().includes(q))
    return list.slice(-40).reverse()
  }, [userLibrary.templates, userQuery])

  const runRules = (source: string, label: string) => {
    const r = parseDatasheet(source, BRANDS)
    // Only quantities written in the sheet are kept; the rest is offered as suggestions.
    const sure = r.groups.filter((g) => !g.guessed)
    const maybe = r.groups.filter((g) => g.guessed)
    setDraft(fromResult(r, sure.map((g) => row(g))))
    setSuggestions(maybe.map((g) => row(g)))
    const doubtful = sure.filter((g) => g.conflicting.length || g.count > 32).length
    setStatus(
      sure.length || maybe.length
        ? `${sure.length} connectique(s) avec quantité lue dans ${label}${doubtful ? `, dont ${doubtful} à vérifier` : ''}.` +
            (maybe.length ? ` ${maybe.length} autre(s) mentionnée(s) sans quantité : à ajouter si besoin.` : '')
        : `Rien de reconnu dans ${label}. Essayez l’IA, ou complétez à la main.`,
    )
  }

  /** Returns how many rows the sheet does not confirm (-1: no AI could answer). */
  const runAi = async (source: string, label: string, pdf?: File, device?: string) => {
    setBusy(true)
    try {
      const ai = await import('./ai')
      const started = clock()
      const { result, engine } = await ai.extractAuto({ text: source, pdf, device, personalKey: geminiKey, personalModel: geminiModel, allowChrome, onProgress: setStatus })
      const seconds = Math.max(1, Math.round((clock() - started) / 1000))
      // Each row checked against the sheet and the rule-based reading, which owes nothing to the AI.
      const rules = source.trim() ? parseDatasheet(source, BRANDS).groups : []
      const checked = ai.checkAnswer(result.groups, source, rules, result.second)
      const rows = checked.map(({ quote, doubts, ...g }) => row({ ...g, ai: true, doubts, evidence: quote ? [quote] : undefined }))
      setDraft(fromResult(result, rows))
      // What the rules or the second AI read and the first AI left out: offered, not added.
      const missed = ai.missedGroups(result.groups, result.second).map(({ quote, ...g }) => row({ ...g, evidence: quote ? [quote] : undefined }))
      const fromRules = rules.filter((r) => !r.guessed && !checked.some((g) => g.connector === r.connector) && !missed.some((m) => m.connector === r.connector)).map((g) => row(g))
      setSuggestions([...missed, ...fromRules])
      const doubtful = checked.filter((g) => g.doubts.length).length
      setStatus(
        `${checked.length} groupe(s) de connectique proposé(s) par ${ENGINE_LABELS[engine]}${result.by ? ` (${result.by})` : ''} en ${seconds} s pour ${label} : ` +
          `${checked.length - doubtful} confirmé(s)${result.second ? ' par les deux IA et la fiche' : ' par la fiche'}${doubtful ? `, ${doubtful} à vérifier (en orange)` : ''}.`,
      )
      return doubtful
    } catch (e) {
      // No AI could answer: the quick analysis still gives a starting point.
      if (source.trim()) runRules(source, label)
      setStatus((s) => `IA indisponible (${(e as Error).message}). ${source.trim() ? `Analyse rapide utilisée à la place : ${s}` : 'Collez le texte des caractéristiques pour l’analyse rapide.'}`)
      return -1
    } finally {
      setBusy(false)
    }
  }

  const sourceText = text
  const sourceFile = file
  const analyse = async (withAi: boolean, force = false, from?: { text: string; file?: File }) => {
    const text = from ? from.text : sourceText
    const file = from ? from.file : sourceFile
    const label = file ? file.name : 'le texte collé'
    const pdf = file && /\.pdf$/i.test(file.name) ? file : undefined
    if (!text.trim() && !pdf) return setStatus('Choisissez un PDF ou collez du texte.')
    // Instant: the sheet names a model we already have.
    const matches = force ? [] : findKnownModels(`${file?.name ?? ''}\n${text}`, [...userLibrary.templates, ...mine, ...LIBRARY])
    setKnown(matches)
    if (matches.length) {
      setDraft(fromTemplate(matches[0], false))
      setSuggestions([])
      const where = matches[0].author ? 'la bibliothèque USER' : matches[0].id.startsWith('custom-') ? 'vos modèles' : 'la base'
      setStatus(
        `Trouvé instantanément dans ${where} : ${matches[0].brand ?? ''} ${matches[0].model}. Il est déjà dans la palette du synoptique, inutile de le recréer ; une copie modifiable est prête ci-dessous si besoin.`,
      )
      return
    }
    // Asked from the palette right as the page opens: the engines may not be known yet.
    const ready = engines ?? (await availableEngines(geminiKey, allowChrome))
    if (withAi && ready.length) await runAi(text, label, pdf)
    else if (text.trim()) runRules(text, label)
    else setStatus('Ce PDF ne contient pas de texte lisible et aucune IA n’est disponible : collez les caractéristiques depuis le site du fabricant.')
  }

  const onFile = async (f?: File, analyseNow = false) => {
    if (!f) return
    setFile(f)
    setStatus(`Lecture de ${f.name}…`)
    try {
      let t: string
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
        const { pdfToText } = await import('./pdfText')
        t = await pdfToText(f)
      } else {
        t = await f.text()
      }
      setText(t)
      const ready = engines ?? (await availableEngines(geminiKey, allowChrome))
      if (t.trim().length < 20 && !ready.some((e) => e !== 'chrome')) {
        setStatus('Ce PDF ne contient pas de texte lisible (scan ?). Collez les caractéristiques depuis le site du fabricant.')
        return
      }
      if (analyseNow) await analyse(true, false, { text: t, file: f })
      else setStatus(`${f.name} chargé. Cliquez sur « Analyser ».`)
    } catch (e) {
      setStatus(`Lecture impossible : ${(e as Error).message}`)
    }
  }

  const toTemplate = (d: Draft): DeviceTemplate => ({
    id: d.id ?? `custom-${uid()}`,
    brand: d.brand.trim() || undefined,
    model: d.model.trim(),
    category: d.category,
    family: d.family.trim() || undefined,
    rackU: d.rackU || undefined,
    weight: d.weight || undefined,
    ports: expandGroups(d.rows),
    image: d.image,
  })

  const save = () => {
    if (!draft || !draft.model.trim()) return
    const t = toTemplate(draft)
    setProject((p) => ({
      ...p,
      customTemplates: p.customTemplates.some((x) => x.id === t.id)
        ? p.customTemplates.map((x) => (x.id === t.id ? t : x))
        : [...p.customTemplates, t],
    }))
    setDraft({ ...draft, id: t.id })
    setStatus(`« ${t.brand ? `${t.brand} ` : ''}${t.model} » enregistré dans votre bibliothèque (palette : « Mes modèles »). Vous pouvez aussi le partager à tous.`)
    // Found by the search: added to the USER library for everyone, unless it is already there.
    if (draft.found?.share) {
      if (userLibrary.templates.some((u) => sameModel(u, t))) setStatus(`« ${t.model} » enregistré ; il est déjà dans la bibliothèque USER.`)
      else share()
    }
  }

  const share = () => {
    if (!draft || !draft.model.trim()) return
    if (!pseudo.trim()) {
      setStatus('Indiquez votre pseudo (en haut à gauche) : il sera affiché avec le matériel partagé.')
      return
    }
    const t = toTemplate(draft)
    setSharing(true)
    setStatus('Partage en cours…')
    userLibrary
      .share(encodeShared(t, draft.rows), pseudo, draft.image)
      .then((s) => setStatus(`« ${s.brand ? `${s.brand} ` : ''}${s.model} » est partagé : il est disponible pour tous dans la palette (« Bibliothèque USER »), avec votre pseudo.`))
      .catch((e) => setStatus(`Partage impossible : ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => setSharing(false))
  }

  const unshare = (t: DeviceTemplate) => {
    if (!confirm(`Retirer « ${t.model} » de la bibliothèque USER ? Il ne sera plus proposé aux autres utilisateurs.`)) return
    userLibrary
      .remove(t.id)
      .then(() => setStatus(`« ${t.model} » a été retiré de la bibliothèque USER.`))
      .catch((e) => setStatus(`Retrait impossible : ${e instanceof Error ? e.message : String(e)}`))
  }

  const remove = (t: DeviceTemplate) => {
    if (!confirm(`Supprimer « ${t.model} » de votre bibliothèque ? Les appareils déjà placés restent sur le synoptique.`)) return
    setProject((p) => ({ ...p, customTemplates: p.customTemplates.filter((x) => x.id !== t.id) }))
    if (draft?.id === t.id) setDraft(undefined)
  }

  const importLibrary = async (f?: File) => {
    if (!f) return
    try {
      const data = JSON.parse(await f.text()) as { templates?: DeviceTemplate[] }
      const list = (data.templates ?? []).filter((t) => t && t.id && t.model && Array.isArray(t.ports))
      setProject((p) => {
        const byId = new Map(p.customTemplates.map((t) => [t.id, t]))
        for (const t of list) byId.set(t.id, t)
        return { ...p, customTemplates: [...byId.values()] }
      })
      setStatus(`${list.length} modèle(s) importé(s).`)
    } catch {
      setStatus('Fichier de bibliothèque invalide.')
    }
  }

  const set = (patch: Partial<Draft>) => draft && setDraft({ ...draft, ...patch })
  const setRow = (key: string, patch: Partial<Row>) =>
    // A count or connector set by hand is the user's check: no more warning on it.
    draft && setDraft({ ...draft, rows: draft.rows.map((r) => (r.key === key ? { ...r, ...patch, ...('count' in patch || 'connector' in patch ? { doubts: [] } : {}) } : r)) })
  const portCount = draft ? draft.rows.reduce((s, r) => s + Math.max(0, r.count), 0) : 0

  return (
    <div className="page library">
      <aside className="case-list">
        <label className="field">
          <span>Votre pseudo (affiché sur le matériel partagé)</span>
          <input value={pseudo} maxLength={40} placeholder="Ex. Théo Son" onChange={(e) => { setPseudo(e.target.value); store.set('pseudo', e.target.value) }} />
        </label>

        <div className="section-head">
          <h3>Ma bibliothèque</h3>
          <button onClick={() => { setDraft(blank()); setSuggestions([]); setStatus('') }}>+ Nouveau</button>
        </div>
        {mine.length === 0 && <p className="muted small">Aucun modèle perso. Créez-en un à la main, depuis une fiche technique, ou copiez un modèle existant.</p>}
        {mine.map((t) => (
          <div key={t.id} className={`lib-item ${draft?.id === t.id ? 'active' : ''}`}>
            <button className="case-item" onClick={() => { setDraft(fromTemplate(t, true)); setSuggestions([]); setStatus('') }}>
              <span className="dot" style={{ background: CATEGORY_COLORS[t.category] }} />
              <span>
                {t.brand ? `${t.brand} ` : ''}{t.model}
                <small>{t.family ?? t.category} · {t.ports.length} ports{t.rackU ? ` · ${t.rackU}U` : ''}</small>
              </span>
            </button>
            <button className="icon" title="Supprimer" onClick={() => remove(t)}>×</button>
          </div>
        ))}
        <div className="stack">
          <button disabled={mine.length === 0} onClick={() => download('synopgig-bibliotheque.json', JSON.stringify({ version: 1, templates: mine }, null, 2), 'application/json')}>
            Exporter ma bibliothèque
          </button>
          <button onClick={() => importRef.current?.click()}>Importer une bibliothèque</button>
          <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={(e) => { importLibrary(e.target.files?.[0]); e.target.value = '' }} />
        </div>

        <h4>Bibliothèque USER <small className="muted">({userLibrary.templates.length}{userLibrary.status === 'offline' ? ', hors ligne' : ''})</small></h4>
        <p className="muted small">Matériel partagé par les utilisateurs, disponible pour tous dans la palette.</p>
        <input className="search" placeholder="Rechercher (marque, modèle, pseudo)…" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
        <div className="pick-list">
          {userResults.map((t) => (
            <div key={t.id} className="pick-row">
              <button className="palette-item" title="Copier dans ma bibliothèque pour le modifier" onClick={() => { setDraft(fromTemplate(t, false)); setSuggestions([]); setStatus(`Copie de ${t.model} (par ${t.author}) : modifiez-la puis enregistrez.`) }}>
                <span className="dot" style={{ background: CATEGORY_COLORS[t.category] }} />
                <span>{t.brand ? <b>{t.brand} </b> : null}{t.model}</span>
                <small>par {t.author} · {t.ports.length} ports</small>
              </button>
              {userLibrary.isMine(t.id) && (
                <button className="icon" title="Retirer de la bibliothèque USER (partagé par vous)" onClick={() => unshare(t)}>
                  ×
                </button>
              )}
            </div>
          ))}
          {userLibrary.templates.length === 0 && <p className="muted small">Encore vide : soyez le premier à partager !</p>}
        </div>

        <h4>Partir d’un modèle existant</h4>
        <input className="search" placeholder="Ex. Rio, LA4X, SM58…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="pick-list">
          {results.map((t) => (
            <button key={t.id} className="palette-item" onClick={() => { setDraft(fromTemplate(t, false)); setSuggestions([]); setStatus(`Copie de ${t.brand ?? ''} ${t.model} : modifiez-la puis enregistrez.`) }}>
              <span className="dot" style={{ background: CATEGORY_COLORS[t.category] }} />
              <span>{t.brand ? <b>{t.brand} </b> : null}{t.model}</span>
              <small>{t.family ?? t.category} · {t.ports.length} ports</small>
            </button>
          ))}
        </div>
      </aside>

      <div className="lib-main">
        <section className="card finder" ref={finderRef}>
          <h3>Le chercher pour vous</h3>
          <p className="muted small">
            Donnez la marque et le modèle exacts : SynopGig cherche la documentation officielle du constructeur, vous la vérifiez, puis la fiche et ses ports en sont tirés. Une fois
            enregistré, le produit rejoint la bibliothèque USER pour tout le monde.
          </p>
          <div className="row wrap">
            <label className="field">
              <span>Marque</span>
              <input value={fBrand} placeholder="Ex. Fohhn" list="finder-brands" onChange={(e) => setFBrand(e.target.value)} />
            </label>
            <label className="field">
              <span>Modèle</span>
              <input value={fModel} placeholder="Ex. PS-850" onChange={(e) => setFModel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && findProduct()} />
            </label>
            <datalist id="finder-brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
          </div>
          <button className="primary" disabled={finding || !fModel.trim()} onClick={() => findProduct()}>{finding ? 'Recherche…' : 'Chercher ce produit'}</button>
          {findStatus && <p className="status">{findStatus}</p>}
          {foundKnown.length > 0 && (
            <div className="suggestions">
              {foundKnown.map((t) => (
                <button key={t.id} onClick={() => { setDraft(fromTemplate(t, false)); setStatus(`Copie de ${t.brand ?? ''} ${t.model} prête à modifier.`) }}>
                  {t.brand} {t.model} {t.author ? `(USER, par ${t.author})` : ''}
                </button>
              ))}
              <button onClick={() => findProduct(true)}>Ce n’est pas lui : chercher sa documentation</button>
            </div>
          )}
          {found && (
            <ul className="found-docs">
              {found.map((d) => (
                <li key={d.url}>
                  <div>
                    <b>{d.title}</b>
                    <small className="muted">
                      {d.host} · {d.kind === 'pdf' ? 'PDF' : 'page web'}
                      {d.official && <span className="badge-official"> site du fabricant</span>}
                    </small>
                  </div>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" title="Ouvrir pour vérifier">↗</a>
                  <button className="primary" disabled={finding} onClick={() => analyseDoc(d)}>Analyser ce document</button>
                </li>
              ))}
              <li className="muted small">Aucun ne convient ? Téléchargez la fiche vous-même et déposez-la ci-dessous.</li>
            </ul>
          )}
        </section>

        <section className="card" ref={sheetRef}>
          <h3>Analyser une fiche technique</h3>
          <p className="muted small">
            Déposez la fiche (PDF) ou collez ses caractéristiques, puis « Analyser ».{' '}
            {engines === undefined
              ? 'Recherche d’une IA disponible…'
              : engines.length
                ? `IA utilisée : ${ENGINE_LABELS[engines[0]]}, gratuite.`
                : 'Analyse rapide (sans IA), instantanée.'}
          </p>
          <div className="row wrap">
            <label className="file-btn">
              Choisir un PDF ou un fichier texte
              <input type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            {file && <span className="muted small">{file.name}</span>}
            <span className="muted small">ou collez le texte des caractéristiques :</span>
          </div>
          <textarea rows={5} placeholder={'Ex. :\nInputs: 16 x XLR mic/line\nOutputs: 8 x XLR\nNetwork: 2 x etherCON (Dante primary / secondary)\n3U, 8 kg'} value={text} onChange={(e) => { setText(e.target.value); setFile(undefined) }} />
          <div className="row wrap">
            <button className="primary" disabled={busy} onClick={() => analyse(true)}>{busy ? 'Analyse en cours…' : 'Analyser'}</button>
            {engines !== undefined && engines.length > 0 && (
              <button disabled={busy} onClick={() => analyse(false)} title="Sans IA : ne garde que les quantités écrites dans la fiche">Analyse rapide (sans IA)</button>
            )}
          </div>
          <details className="advanced">
            <summary className="muted small">Options avancées</summary>
            <div className="row wrap">
              <label className="field">
                <span>
                  Clé Gemini personnelle (facultatif, gardée dans ce navigateur) ·{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">obtenir une clé gratuite</a>
                </span>
                <input type="password" autoComplete="off" value={geminiKey} placeholder="AIza…" onChange={(e) => { setGeminiKey(e.target.value); store.set('ai.geminiKey', e.target.value) }} />
              </label>
              <label className="field narrow wide">
                <span>Modèle</span>
                <input value={geminiModel} onChange={(e) => { setGeminiModel(e.target.value); store.set('ai.geminiModel', e.target.value) }} />
              </label>
            </div>
            <label className="toggle-line">
              <input type="checkbox" checked={allowChrome} onChange={(e) => { setAllowChrome(e.target.checked); store.set('ai.chrome', e.target.checked ? '1' : '') }} />
              Utiliser aussi l’IA intégrée à Chrome si aucune autre n’est disponible (gratuite, hors ligne, mais lente)
            </label>
          </details>
          {status && <p className="status">{status}</p>}
          {known.length > 0 && (
            <div className="suggestions">
              {known.length > 1 && <span className="muted small">Autres modèles reconnus :</span>}
              {known.slice(1).map((t) => (
                <button key={t.id} onClick={() => { setDraft(fromTemplate(t, false)); setStatus(`Copie de ${t.brand ?? ''} ${t.model} prête à modifier.`) }}>
                  {t.brand} {t.model}
                </button>
              ))}
              <button onClick={() => { setKnown([]); analyse(true, true) }}>Ce n’est pas le bon : analyser la fiche</button>
            </div>
          )}
        </section>

        {draft ? (
          <section className="card" ref={editorRef}>
            <div className="section-head">
              <h3>{draft.id ? 'Modifier le modèle' : 'Nouveau matériel'}</h3>
              <button className="icon" title="Fermer" onClick={() => setDraft(undefined)}>×</button>
            </div>
            <div className="illustration">
              <DeviceArt image={draft.image} family={draft.family} model={draft.model} category={draft.category} size={72} />
              <div>
                <span className="small muted">Illustration : {draft.image ? 'photo du produit' : 'symbole de son type'}</span>
                <div className="photo-picks">
                  {photos.map((ph) => (
                    <button key={ph.slice(-24)} className={`photo-pick ${draft.image === ph ? 'active' : ''}`} onClick={() => set({ image: ph })} title="Prendre cette photo">
                      <img src={ph} alt="" />
                    </button>
                  ))}
                  <button onClick={() => photoInput.current?.click()}>Importer une image</button>
                  {draft.image && <button onClick={() => set({ image: undefined })}>Utiliser le symbole</button>}
                  <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { importPhoto(e.target.files?.[0]); e.target.value = '' }} />
                </div>
                {photoStatus && <span className="small muted">{photoStatus}</span>}
              </div>
            </div>
            <div className="row wrap">
              <label className="field">
                <span>Marque</span>
                <input list="lib-brands" value={draft.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="Ex. Yamaha" />
                <datalist id="lib-brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
              </label>
              <label className="field">
                <span>Modèle *</span>
                <input value={draft.model} onChange={(e) => set({ model: e.target.value })} placeholder="Ex. Rio1608-D2" />
              </label>
            </div>
            <div className="row wrap">
              <label className="field">
                <span>Département</span>
                <select value={draft.category} onChange={(e) => set({ category: e.target.value as Category })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Famille</span>
                <input list="lib-families" value={draft.family} onChange={(e) => set({ family: e.target.value })} placeholder="Ex. Stageboxes & moteurs" />
                <datalist id="lib-families">{FAMILY_ORDER.map((f) => <option key={f} value={f} />)}</datalist>
              </label>
              <label className="field narrow">
                <span>Hauteur (U)</span>
                <input type="number" min={0} value={draft.rackU ?? ''} onChange={(e) => set({ rackU: e.target.value ? Number(e.target.value) : undefined })} />
              </label>
              <label className="field narrow">
                <span>Poids (kg)</span>
                <input type="number" min={0} step={0.1} value={draft.weight ?? ''} onChange={(e) => set({ weight: e.target.value ? Number(e.target.value) : undefined })} />
              </label>
            </div>

            <h4>Connectique ({portCount} ports)</h4>
            <table className="groups">
              <thead>
                <tr><th>Nom</th><th>Qté</th><th>Connecteur</th><th>Signal</th><th>Sens</th><th /></tr>
              </thead>
              <tbody>
                {draft.rows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <input value={r.prefix} onChange={(e) => setRow(r.key, { prefix: e.target.value })} />
                      <RowNotes r={r} />
                    </td>
                    <td><input type="number" min={1} max={256} value={r.count} onChange={(e) => setRow(r.key, { count: Number(e.target.value) })} /></td>
                    <td>
                      <select value={r.connector} onChange={(e) => setRow(r.key, { connector: e.target.value as ConnectorType })}>
                        {Object.entries(CONNECTORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={r.signal} onChange={(e) => setRow(r.key, { signal: e.target.value as SignalType })}>
                        {Object.entries(SIGNALS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={r.dir} onChange={(e) => setRow(r.key, { dir: e.target.value as PortDirection })}>
                        {Object.entries(DIRS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td><button className="icon" title="Retirer" onClick={() => set({ rows: draft.rows.filter((x) => x.key !== r.key) })}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {suggestions.length > 0 && (
              <div className="suggestions">
                <span className="muted small">Aussi relevé dans la fiche, à vérifier (cliquez pour ajouter) :</span>
                {suggestions.map((s) => (
                  <button
                    key={s.key}
                    title={s.evidence?.join('\n')}
                    onClick={() => {
                      set({ rows: [...draft.rows, { ...s, guessed: false }] })
                      setSuggestions(suggestions.filter((x) => x.key !== s.key))
                    }}
                  >
                    + {s.count > 1 ? `${s.count} × ` : ''}{CONNECTORS[s.connector]} {DIRS[s.dir].toLowerCase()}
                  </button>
                ))}
              </div>
            )}
            <div className="actions">
              <button onClick={() => set({ rows: [...draft.rows, row({ prefix: 'Port', count: 1, connector: 'xlr3', signal: 'audio-analog', dir: 'in' })] })}>
                + Ajouter un groupe de ports
              </button>
              {draft.found && (
                <label className="toggle-line">
                  <input type="checkbox" checked={draft.found.share} onChange={(e) => set({ found: { ...draft.found!, share: e.target.checked } })} />
                  Ajouter aussi à la bibliothèque USER en enregistrant{pseudo.trim() ? ` (par ${pseudo.trim()})` : ' (indiquez votre pseudo en haut)'}
                </label>
              )}
              <button className="primary" disabled={!draft.model.trim()} onClick={save}>
                {draft.id ? 'Enregistrer les modifications' : 'Enregistrer dans ma bibliothèque'}
              </button>
              <button disabled={!draft.model.trim() || draft.rows.length === 0 || sharing} onClick={share} title="Rend ce matériel disponible pour tous les utilisateurs, avec votre pseudo">
                {sharing ? 'Partage…' : 'Partager dans la bibliothèque USER'}
              </button>
            </div>
          </section>
        ) : (
          <section className="card muted">
            <p>Choisissez « + Nouveau » pour saisir un matériel à la main, analysez une fiche technique, ou partez d’un modèle existant ou de la bibliothèque USER.</p>
          </section>
        )}
      </div>
    </div>
  )
}

/** Where a row comes from, and why it may be wrong. */
function RowNotes({ r }: { r: Row }) {
  if (r.ai) {
    const doubts = r.doubts ?? []
    return (
      <details className="evidence">
        <summary>
          <span className="ai">IA</span> {doubts.length ? <span className="doubt">à vérifier</span> : <span className="sure">confirmé par la fiche</span>}
          {doubts.length > 0 && ` · ${doubts.join(' · ')}`}
        </summary>
        {r.evidence?.map((l) => <div key={l}>« {l} »</div>)}
      </details>
    )
  }
  const warnings = [r.conflicting?.length && `autres valeurs lues : ${r.conflicting.join(', ')}`, r.count > 32 && 'nombre élevé'].filter(Boolean)
  if (!r.evidence?.length && !warnings.length) return null
  return (
    <details className="evidence">
      <summary>
        {warnings.length ? <span className="doubt">à vérifier</span> : <span className="sure">lu dans la fiche</span>}
        {warnings.length > 0 && ` · ${warnings.join(' · ')}`}
      </summary>
      {r.evidence?.map((l) => <div key={l}>« {l} »</div>)}
    </details>
  )
}
