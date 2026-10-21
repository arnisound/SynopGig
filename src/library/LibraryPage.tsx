import { useMemo, useRef, useState } from 'react'
import { CONNECTORS, SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS, FAMILY_ORDER, LIBRARY } from '../data/library'
import { download, uid } from '../project'
import type { Category, ConnectorType, DeviceTemplate, PortDirection, Project, SignalType } from '../types'
import { GEMINI_DEFAULT_MODEL, LOCAL_MODELS, type AiMode, type AiResult } from './ai'
import { parseDatasheet } from './parseDatasheet'
import { expandGroups, groupPorts, type PortGroup } from './portGroups'
import { encodeShared, issueUrl } from './userLibrary'

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Autre']
const DIRS: Record<PortDirection, string> = { in: 'Entrée', out: 'Sortie', io: 'Bidirectionnel' }
const BRANDS = [...new Set(LIBRARY.map((t) => t.brand).filter((b): b is string => !!b && b !== 'Générique'))]

const MODES: Record<AiMode, { label: string; hint: string }> = {
  rules: { label: 'Analyse rapide', hint: 'Instantanée, sans IA : ne garde que les quantités écrites noir sur blanc.' },
  local: { label: 'IA locale (gratuite)', hint: 'Petit modèle téléchargé une fois puis exécuté dans votre navigateur : privé, sans compte. Chrome ou Edge sur ordinateur.' },
  gemini: { label: 'IA Gemini (clé gratuite)', hint: 'Meilleur résultat, lit le PDF directement. La fiche est envoyée à Google avec votre clé.' },
}

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
}

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
  userLibrary: { templates: DeviceTemplate[]; status: 'loading' | 'live' | 'offline' }
}

export default function LibraryPage({ project, setProject, userLibrary }: Props) {
  const [draft, setDraft] = useState<Draft>()
  const [suggestions, setSuggestions] = useState<Row[]>([])
  const [text, setText] = useState('')
  const [file, setFile] = useState<File>()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [mode, setModeState] = useState<AiMode>(() => (store.get('ai.mode', 'rules') as AiMode) || 'rules')
  const [localModel, setLocalModel] = useState(() => store.get('ai.local', LOCAL_MODELS[0].id))
  const [geminiKey, setGeminiKey] = useState(() => store.get('ai.geminiKey'))
  const [geminiModel, setGeminiModel] = useState(() => store.get('ai.geminiModel', GEMINI_DEFAULT_MODEL))
  const [pseudo, setPseudo] = useState(() => store.get('pseudo'))
  const importRef = useRef<HTMLInputElement>(null)
  const mine = project.customTemplates

  const setMode = (m: AiMode) => {
    setModeState(m)
    store.set('ai.mode', m)
  }

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

  const runAi = async (source: string, label: string, pdf?: File) => {
    setBusy(true)
    try {
      const ai = await import('./ai')
      let r: AiResult
      if (mode === 'gemini') {
        setStatus('Gemini lit la fiche…')
        r = await ai.extractGemini({ text: source, pdf }, geminiKey, geminiModel)
      } else {
        if (!source.trim()) throw new Error('Aucun texte lisible : collez les caractéristiques, ou utilisez Gemini qui lit les PDF scannés.')
        r = await ai.extractLocal(source, localModel, setStatus)
      }
      setDraft(fromResult(r, r.groups.map((g) => row({ ...g, ai: true }))))
      setSuggestions([])
      setStatus(`${r.groups.length} groupe(s) de connectique proposé(s) par l’IA pour ${label}. Relisez avant d’enregistrer : une IA peut se tromper.`)
    } catch (e) {
      setStatus(`L’IA n’a pas pu répondre : ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const analyse = async () => {
    const label = file ? file.name : 'le texte collé'
    if (!text.trim() && !(file && mode === 'gemini')) return setStatus('Choisissez un PDF ou collez du texte.')
    if (mode === 'rules') runRules(text, label)
    else await runAi(text, label, file && /\.pdf$/i.test(file.name) ? file : undefined)
  }

  const onFile = async (f?: File) => {
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
      if (t.trim().length < 20 && mode !== 'gemini') {
        setStatus('Ce PDF ne contient pas de texte lisible (scan ?). Utilisez l’IA Gemini, ou collez les caractéristiques depuis le site du fabricant.')
        return
      }
      setStatus(`${f.name} chargé. Cliquez sur « Analyser ».`)
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
  }

  const share = () => {
    if (!draft || !draft.model.trim()) return
    if (!pseudo.trim()) {
      setStatus('Indiquez votre pseudo (en haut à gauche) : il sera affiché avec le matériel partagé.')
      return
    }
    const t = toTemplate(draft)
    const url = issueUrl(encodeShared(t, draft.rows), pseudo)
    window.open(url, '_blank', 'noopener')
    setStatus('Une page GitHub s’est ouverte avec le matériel déjà rempli : cliquez sur « Submit new issue ». Il sera ajouté à la bibliothèque USER automatiquement, en quelques minutes.')
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
    draft && setDraft({ ...draft, rows: draft.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) })
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
            <button key={t.id} className="palette-item" title="Copier dans ma bibliothèque pour le modifier" onClick={() => { setDraft(fromTemplate(t, false)); setSuggestions([]); setStatus(`Copie de ${t.model} (par ${t.author}) : modifiez-la puis enregistrez.`) }}>
              <span className="dot" style={{ background: CATEGORY_COLORS[t.category] }} />
              <span>{t.brand ? <b>{t.brand} </b> : null}{t.model}</span>
              <small>par {t.author} · {t.ports.length} ports</small>
            </button>
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
        <section className="card">
          <h3>Analyser une fiche technique</h3>
          <div className="seg modes">
            {(Object.keys(MODES) as AiMode[]).map((m) => (
              <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>{MODES[m].label}</button>
            ))}
          </div>
          <p className="muted small">{MODES[mode].hint}</p>
          {mode === 'local' && (
            <label className="field">
              <span>Modèle IA (téléchargé une seule fois, puis gardé par le navigateur)</span>
              <select value={localModel} onChange={(e) => { setLocalModel(e.target.value); store.set('ai.local', e.target.value) }}>
                {LOCAL_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
          )}
          {mode === 'gemini' && (
            <div className="row wrap">
              <label className="field">
                <span>
                  Clé API Gemini (gardée dans ce navigateur) ·{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">obtenir une clé gratuite</a>
                </span>
                <input type="password" autoComplete="off" value={geminiKey} placeholder="AIza…" onChange={(e) => { setGeminiKey(e.target.value); store.set('ai.geminiKey', e.target.value) }} />
              </label>
              <label className="field narrow wide">
                <span>Modèle</span>
                <input value={geminiModel} onChange={(e) => { setGeminiModel(e.target.value); store.set('ai.geminiModel', e.target.value) }} />
              </label>
            </div>
          )}
          <div className="row wrap">
            <label className="file-btn">
              Choisir un PDF ou un fichier texte
              <input type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            {file && <span className="muted small">{file.name}</span>}
            <span className="muted small">ou collez le texte des caractéristiques :</span>
          </div>
          <textarea rows={5} placeholder={'Ex. :\nInputs: 16 x XLR mic/line\nOutputs: 8 x XLR\nNetwork: 2 x etherCON (Dante primary / secondary)\n3U, 8 kg'} value={text} onChange={(e) => { setText(e.target.value); setFile(undefined) }} />
          <div className="row">
            <button className="primary" disabled={busy} onClick={analyse}>{busy ? 'Analyse en cours…' : 'Analyser'}</button>
          </div>
          {status && <p className="status">{status}</p>}
        </section>

        {draft ? (
          <section className="card">
            <div className="section-head">
              <h3>{draft.id ? 'Modifier le modèle' : 'Nouveau matériel'}</h3>
              <button className="icon" title="Fermer" onClick={() => setDraft(undefined)}>×</button>
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
                <span className="muted small">Aussi mentionné dans la fiche, sans quantité (cliquez pour ajouter) :</span>
                {suggestions.map((s) => (
                  <button
                    key={s.key}
                    title={s.evidence?.join('\n')}
                    onClick={() => {
                      set({ rows: [...draft.rows, { ...s, guessed: false }] })
                      setSuggestions(suggestions.filter((x) => x.key !== s.key))
                    }}
                  >
                    + {CONNECTORS[s.connector]} {DIRS[s.dir].toLowerCase()}
                  </button>
                ))}
              </div>
            )}
            <div className="actions">
              <button onClick={() => set({ rows: [...draft.rows, row({ prefix: 'Port', count: 1, connector: 'xlr3', signal: 'audio-analog', dir: 'in' })] })}>
                + Ajouter un groupe de ports
              </button>
              <button className="primary" disabled={!draft.model.trim()} onClick={save}>
                {draft.id ? 'Enregistrer les modifications' : 'Enregistrer dans ma bibliothèque'}
              </button>
              <button disabled={!draft.model.trim() || draft.rows.length === 0} onClick={share} title="Ouvre une issue GitHub pré-remplie (compte GitHub nécessaire)">
                Partager dans la bibliothèque USER
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
  if (r.ai) return <small className="evidence"><span className="ai">proposé par l’IA</span></small>
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
