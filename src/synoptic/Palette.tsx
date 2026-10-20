import { useMemo, useState } from 'react'
import { CATEGORY_COLORS, FAMILY_ORDER } from '../data/library'
import type { DeviceTemplate } from '../types'

export const DND_TYPE = 'application/x-synopgig-template'

const ORDER = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Câblage', 'Autre']
const MINE = 'Mes modèles'

interface Props {
  templates: DeviceTemplate[]
  onAdd: (t: DeviceTemplate) => void
}

const rank = (family: string) => {
  const i = FAMILY_ORDER.indexOf(family)
  return family === MINE ? -1 : i < 0 ? 999 : i
}

function byBrand(list: DeviceTemplate[]) {
  const m = new Map<string, DeviceTemplate[]>()
  for (const t of list) m.set(t.brand ?? 'Générique', [...(m.get(t.brand ?? 'Générique') ?? []), t])
  return [...m.entries()].sort((a, b) => (a[0] === 'Générique' ? -1 : b[0] === 'Générique' ? 1 : a[0].localeCompare(b[0])))
}

export default function Palette({ templates, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const q = query.trim().toLowerCase()

  const brands = useMemo(() => [...new Set(templates.map((t) => t.brand).filter((b) => b !== undefined))].sort((a, b) => a.localeCompare(b)), [templates])

  const groups = useMemo(() => {
    const cats = new Map<string, Map<string, DeviceTemplate[]>>()
    for (const t of templates) {
      if (brand && t.brand !== brand) continue
      if (q && !`${t.brand ?? ''} ${t.model} ${t.category} ${t.family ?? ''}`.toLowerCase().includes(q)) continue
      const family = t.id.startsWith('custom-') ? MINE : (t.family ?? 'Divers')
      const fams = cats.get(t.category) ?? new Map<string, DeviceTemplate[]>()
      fams.set(family, [...(fams.get(family) ?? []), t])
      cats.set(t.category, fams)
    }
    return [...cats.entries()]
      .sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]))
      .map(([cat, fams]) => {
        const families = [...fams.entries()].sort((a, b) => rank(a[0]) - rank(b[0]))
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
                      <span className="dot" style={{ background: CATEGORY_COLORS[cat] }} />
                      <span>{t.model}</span>
                      <small>
                        {t.panel ? `${t.panel.holes.filter((h) => h.connector).length} connecteurs` : `${t.ports.length} ports`}
                        {t.rackU ? ` · ${t.rackU}U` : ''}
                      </small>
                    </button>
                  ))}
                </div>
              ))}
            </details>
          ))}
        </details>
      ))}
    </aside>
  )
}
