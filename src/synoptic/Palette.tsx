import { useMemo, useState } from 'react'
import { CATEGORY_COLORS, FAMILY_ORDER } from '../data/library'
import { USER_FAMILY } from '../library/userLibrary'
import DeviceArt from '../ui/DeviceArt'
import type { Block } from '../blocks/blocks'
import type { DeviceTemplate } from '../types'

export const DND_TYPE = 'application/x-synopgig-template'

/** Alphabetical everywhere, numbers in order (CL5 before CL10). */
const alpha = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true })
const MINE = 'Mes modèles'

interface Props {
  templates: DeviceTemplate[]
  onAdd: (t: DeviceTemplate) => void
  /** A product not in the base: found, read from its sheet or made by hand (with the search text). */
  onNew?: (query: string) => void
  /** Ids of the products just added, newest first: shown at the top. */
  recent?: string[]
  /** Saved groups of cabled devices, to drop in whole. */
  blocks?: Block[]
  onBlock?: (b: Block) => void
  onDeleteBlock?: (b: Block) => void
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

export default function Palette({ templates, onAdd, onNew, recent = [], blocks = [], onBlock, onDeleteBlock }: Props) {
  const [query, setQuery] = useState('')
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
  const item = (t: DeviceTemplate) => (
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
        {t.panel ? `${t.panel.holes.filter((h) => h.connector).length} connecteurs` : `${t.ports.length} port${t.ports.length > 1 ? 's' : ''}`}
        {t.rackU ? ` · ${t.rackU}U` : ''}
        {t.author ? ` · par ${t.author}` : ''}
      </small>
    </button>
  )
  const recentItems = recent.map((id) => templates.find((t) => t.id === id)).filter((t) => t !== undefined)

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
      {onNew && (
        <button className="palette-add" onClick={() => onNew(query.trim())}>
          + Ajouter un produit
        </button>
      )}
      <p className="hint">Glissez un équipement sur le synoptique, ou cliquez pour l’ajouter. Connectique indicative : vérifiez la fiche constructeur.</p>
      {recentItems.length > 0 && !filtered && (
        <div className="brand-group recent">
          <div className="brand">Ajoutés récemment</div>
          {recentItems.map(item)}
        </div>
      )}
      {blocks.length > 0 && !filtered && onBlock && (
        <details className="blocks" open>
          <summary>
            Mes blocs <small>{blocks.length}</small>
          </summary>
          {[...blocks].sort((a, b) => alpha(a.name, b.name)).map((b) => (
            <div key={b.id} className="block-item">
              <button className="palette-item" onClick={() => onBlock(b)} title={b.nodes.map((n) => n.data.name).join(', ')}>
                <span>{b.name}</span>
                <small>
                  {b.nodes.length} équipement{b.nodes.length > 1 ? 's' : ''} · {b.edges.length} câble{b.edges.length > 1 ? 's' : ''}
                </small>
              </button>
              {onDeleteBlock && <button className="icon" title="Supprimer ce bloc" onClick={() => onDeleteBlock(b)}>×</button>}
            </div>
          ))}
        </details>
      )}
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
                  {items.map(item)}
                </div>
              ))}
            </details>
          ))}
        </details>
      ))}
    </aside>
  )
}
