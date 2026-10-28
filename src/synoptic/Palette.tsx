import { useMemo, useRef, useState } from 'react'
import { CATEGORY_COLORS, FAMILY_ORDER } from '../data/library'
import { USER_FAMILY } from '../library/userLibrary'
import DeviceArt from '../ui/DeviceArt'
import type { NewProduct } from '../library/newProduct'
import type { DeviceTemplate } from '../types'

export const DND_TYPE = 'application/x-synopgig-template'

/** Alphabetical everywhere, numbers in order (CL5 before CL10). */
const alpha = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true })
const MINE = 'Mes modèles'

interface Props {
  templates: DeviceTemplate[]
  onAdd: (t: DeviceTemplate) => void
  /** A product not in the base: found on the web, read from its sheet, or made by hand. */
  onNew?: (r: NewProduct) => void
}

const rank = (family: string) => {
  const i = FAMILY_ORDER.indexOf(family)
  return family === MINE ? -2 : family === USER_FAMILY ? -1 : i < 0 ? 999 : i
}

/** Your own models first, then families in alphabetical order. */
const byFamily = (a: string, b: string) => rank(a) - rank(b) || alpha(a, b)

function byBrand(list: DeviceTemplate[]) {
  const m = new Map<string, DeviceTemplate[]>()
  for (const t of list) m.set(t.brand ?? 'Générique', [...(m.get(t.brand ?? 'Générique') ?? []), t])
  return [...m.entries()]
    .sort((a, b) => (a[0] === 'Générique' ? -1 : b[0] === 'Générique' ? 1 : alpha(a[0], b[0])))
    .map(([b, items]) => [b, [...items].sort((x, y) => alpha(x.model, y.model))] as const)
}

export default function Palette({ templates, onAdd, onNew }: Props) {
  const [query, setQuery] = useState('')
  const sheetInput = useRef<HTMLInputElement>(null)
  const [brand, setBrand] = useState('')
  const q = query.trim().toLowerCase()

  const brands = useMemo(() => [...new Set(templates.map((t) => t.brand).filter((b) => b !== undefined))].sort(alpha), [templates])

  const groups = useMemo(() => {
    const cats = new Map<string, Map<string, DeviceTemplate[]>>()
    for (const t of templates) {
      if (brand && t.brand !== brand) continue
      if (q && !`${t.brand ?? ''} ${t.model} ${t.category} ${t.family ?? ''}`.toLowerCase().includes(q)) continue
      const family = t.id.startsWith('custom-') ? MINE : t.id.startsWith('user-') ? USER_FAMILY : (t.family ?? 'Divers')
      const fams = cats.get(t.category) ?? new Map<string, DeviceTemplate[]>()
      fams.set(family, [...(fams.get(family) ?? []), t])
      cats.set(t.category, fams)
    }
    return [...cats.entries()]
      .sort((a, b) => alpha(a[0], b[0]))
      .map(([cat, fams]) => {
        const families = [...fams.entries()].sort((a, b) => byFamily(a[0], b[0]))
        return { cat, families, count: families.reduce((s, [, l]) => s + l.length, 0) }
      })
  }, [templates, q, brand])

  const filtered = !!q || !!brand

  return (
    <aside className="palette">
      <input
        className="search"
        placeholder="Rechercher : Yamaha, LA4X, PTZ…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select className="brand-filter" value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filtrer par marque">
        <option value="">Toutes les marques ({brands.length})</option>
        {brands.map((b) => <option key={b}>{b}</option>)}
      </select>
      <p className="hint">Glissez un équipement sur le synoptique, ou cliquez pour l’ajouter. Connectique indicative : vérifiez la fiche constructeur.</p>
      {groups.length === 0 && <p className="hint">Aucun résultat.</p>}
      {groups.map(({ cat, families, count }) => (
        <details key={`${cat}-${filtered}`} open={filtered}>
          <summary style={{ color: CATEGORY_COLORS[cat] }}>
            {cat} <small>{count}</small>
          </summary>
          {families.map(([family, list]) => (
            <details key={`${family}-${filtered}`} className="family" open={filtered || families.length === 1}>
              <summary>
                {family} <small>{list.length}</small>
              </summary>
              {byBrand(list).map(([b, items]) => (
                <div key={b} className="brand-group">
                  <div className="brand">{b}</div>
                  {items.map((t) => (
                    <button
                      key={t.id}
                      className="palette-item"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DND_TYPE, t.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onClick={() => onAdd(t)}
                    >
                      <DeviceArt image={t.image} family={t.family} templateId={t.id} model={t.model} category={t.category} size={26} />
                      <span>{t.model}</span>
                      <small>
                        {t.panel ? `${t.panel.holes.filter((h) => h.connector).length} connecteurs` : `${t.ports.length} ports`}
                        {t.rackU ? ` · ${t.rackU}U` : ''}
                        {t.author ? ` · par ${t.author}` : ''}
                      </small>
                    </button>
                  ))}
                </div>
              ))}
            </details>
          ))}
        </details>
      ))}
      {onNew && (
        <div className="palette-new">
          <div className="brand">Nouveau produit</div>
          {q && <span className="muted small">{groups.length ? 'Pas le bon modèle ?' : `« ${query.trim()} » n’est pas dans la base.`}</span>}
          <button className="palette-new-item" onClick={() => onNew({ mode: 'find', query: query.trim() })}>
            <span className="palette-new-icon" aria-hidden><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></svg></span>
            <span>
              <b>Le chercher pour vous</b>
              <small>Marque et modèle : la documentation officielle est trouvée, vous la confirmez, l’IA crée la fiche.</small>
            </span>
          </button>
          <button className="palette-new-item" onClick={() => sheetInput.current?.click()}>
            <span className="palette-new-icon" aria-hidden><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg></span>
            <span>
              <b>Depuis votre fiche technique</b>
              <small>Un PDF ou un fichier texte : l’IA en tire le modèle et sa connectique.</small>
            </span>
          </button>
          <input
            ref={sheetInput}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) onNew({ mode: 'doc', file })
            }}
          />
          <button className="palette-new-item" onClick={() => onNew({ mode: 'manual' })}>
            <span className="palette-new-icon" aria-hidden><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 11v6M9 14h6" /></svg></span>
            <span>
              <b>Manuellement</b>
              <small>Une fiche vide à remplir vous-même.</small>
            </span>
          </button>
        </div>
      )}
    </aside>
  )
}
