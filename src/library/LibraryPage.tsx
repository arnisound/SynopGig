import { useMemo, useRef, useState } from 'react'
import { CONNECTORS, SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS, FAMILY_ORDER, LIBRARY } from '../data/library'
import { download, uid } from '../project'
import type { Category, ConnectorType, DeviceTemplate, PortDirection, Project, SignalType } from '../types'
import { parseDatasheet } from './parseDatasheet'
import { expandGroups, groupPorts, type PortGroup } from './portGroups'

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Autre']
const DIRS: Record<PortDirection, string> = { in: 'Entrée', out: 'Sortie', io: 'Bidirectionnel' }
const BRANDS = [...new Set(LIBRARY.map((t) => t.brand).filter((b): b is string => !!b && b !== 'Générique'))]

interface Row extends PortGroup {
  key: string
  evidence?: string
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
  source?: string
}

const row = (g: PortGroup & { evidence?: string }): Row => ({ ...g, key: uid() })

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
  rows: groupPorts(t.ports).map(row),
})

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
}

export default function LibraryPage({ project, setProject }: Props) {
  const [draft, setDraft] = useState<Draft>()
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const mine = project.customTemplates

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return LIBRARY.filter((t) => !t.panel && `${t.brand ?? ''} ${t.model}`.toLowerCase().includes(q)).slice(0, 30)
  }, [query])

  const analyse = (source: string, label: string) => {
    if (!source.trim()) return setStatus('Aucun texte à analyser.')
    const r = parseDatasheet(source, BRANDS)
    setDraft({
      brand: r.brand ?? '',
      model: r.model ?? '',
      category: r.category,
      family: r.family ?? '',
      rackU: r.rackU,
      weight: r.weight,
      rows: r.groups.map(row),
      source: label,
    })
    setStatus(
      r.groups.length
        ? `${r.groups.length} groupe(s) de ports détecté(s) dans ${label}. Vérifiez et corrigez avant d’enregistrer.`
        : `Aucun connecteur reconnu dans ${label}. Complétez à la main, ou collez le tableau des caractéristiques.`,
    )
  }

  const onFile = async (file?: File) => {
    if (!file) return
    setStatus(`Lecture de ${file.name}…`)
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const { pdfToText } = await import('./pdfText')
        const t = await pdfToText(file)
        setText(t)
        if (t.trim().length < 20) {
          setStatus('Ce PDF ne contient pas de texte lisible (scan ?). Copiez-collez les caractéristiques depuis le site du fabricant.')
          return
        }
        analyse(t, file.name)
      } else {
        const t = await file.text()
        setText(t)
        analyse(t, file.name)
      }
    } catch (e) {
      setStatus(`Lecture impossible : ${(e as Error).message}`)
    }
  }

  const save = () => {
    if (!draft || !draft.model.trim()) return
    const t: DeviceTemplate = {
      id: draft.id ?? `custom-${uid()}`,
      brand: draft.brand.trim() || undefined,
      model: draft.model.trim(),
      category: draft.category,
      family: draft.family.trim() || undefined,
      rackU: draft.rackU || undefined,
      weight: draft.weight || undefined,
      ports: expandGroups(draft.rows),
    }
    setProject((p) => ({
      ...p,
      customTemplates: p.customTemplates.some((x) => x.id === t.id)
        ? p.customTemplates.map((x) => (x.id === t.id ? t : x))
        : [...p.customTemplates, t],
    }))
    setDraft({ ...draft, id: t.id })
    setStatus(`« ${t.brand ? `${t.brand} ` : ''}${t.model} » enregistré : il est dans la palette du synoptique, rubrique « Mes modèles ».`)
  }

  const remove = (t: DeviceTemplate) => {
    if (!confirm(`Supprimer « ${t.model} » de votre bibliothèque ? Les appareils déjà placés restent sur le synoptique.`)) return
    setProject((p) => ({ ...p, customTemplates: p.customTemplates.filter((x) => x.id !== t.id) }))
    if (draft?.id === t.id) setDraft(undefined)
  }

  const importLibrary = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as { templates?: DeviceTemplate[] }
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
        <div className="section-head">
          <h3>Ma bibliothèque</h3>
          <button onClick={() => { setDraft(blank()); setStatus('') }}>+ Nouveau</button>
        </div>
        {mine.length === 0 && <p className="muted small">Aucun modèle perso pour l’instant. Créez-en un à la main ou depuis une fiche technique.</p>}
        {mine.map((t) => (
          <div key={t.id} className={`lib-item ${draft?.id === t.id ? 'active' : ''}`}>
            <button className="case-item" onClick={() => { setDraft(fromTemplate(t, true)); setStatus('') }}>
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
        <h4>Partir d’un modèle existant</h4>
        <input className="search" placeholder="Ex. Rio, LA4X, SM58…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="pick-list">
          {results.map((t) => (
            <button key={t.id} className="palette-item" onClick={() => { setDraft(fromTemplate(t, false)); setStatus(`Copie de ${t.brand ?? ''} ${t.model} : modifiez-la puis enregistrez.`) }}>
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
          <p className="muted small">
            Gratuit et hors ligne : le PDF est lu dans votre navigateur, rien n’est envoyé. L’outil repère la marque, le modèle, les
            connecteurs (nombre et sens), la hauteur en U et le poids, puis pré-remplit la fiche ci-dessous.
          </p>
          <div className="row wrap">
            <label className="file-btn">
              Choisir un PDF ou un fichier texte
              <input type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            <span className="muted small">ou collez le texte des caractéristiques (site du fabricant, PDF) :</span>
          </div>
          <textarea rows={5} placeholder={'Ex. :\nInputs: 16 x XLR mic/line\nOutputs: 8 x XLR\nNetwork: 2 x etherCON (Dante primary / secondary)\n3U, 8 kg'} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row">
            <button className="primary" onClick={() => analyse(text, 'le texte collé')}>Analyser le texte</button>
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
                      {r.evidence && <small className="evidence" title={r.evidence}>lu : « {r.evidence} »</small>}
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
            <div className="actions">
              <button onClick={() => set({ rows: [...draft.rows, row({ prefix: 'Port', count: 1, connector: 'xlr3', signal: 'audio-analog', dir: 'in' })] })}>
                + Ajouter un groupe de ports
              </button>
              <button className="primary" disabled={!draft.model.trim()} onClick={save}>
                {draft.id ? 'Enregistrer les modifications' : 'Enregistrer dans ma bibliothèque'}
              </button>
            </div>
          </section>
        ) : (
          <section className="card muted">
            <p>Choisissez « + Nouveau » pour saisir un matériel à la main, analysez une fiche technique, ou partez d’un modèle existant pour le modifier.</p>
          </section>
        )}
      </div>
    </div>
  )
}
