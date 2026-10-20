import { useMemo, useState } from 'react'
import { CATEGORY_COLORS } from '../data/library'
import type { DeviceTemplate } from '../types'

export const DND_TYPE = 'application/x-synopgig-template'

const ORDER = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Câblage', 'Autre']

interface Props {
  templates: DeviceTemplate[]
  onAdd: (t: DeviceTemplate) => void
}

export default function Palette({ templates, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const groups = useMemo(() => {
    const map = new Map<string, Map<string, DeviceTemplate[]>>()
    for (const t of templates) {
      if (q && !`${t.brand ?? ''} ${t.model} ${t.category}`.toLowerCase().includes(q)) continue
      const brand = t.brand ?? 'Générique'
      const cat = map.get(t.category) ?? new Map<string, DeviceTemplate[]>()
      cat.set(brand, [...(cat.get(brand) ?? []), t])
      map.set(t.category, cat)
    }
    return [...map.entries()]
      .sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]))
      .map(([cat, brands]) => {
        const sorted = [...brands.entries()].sort((a, b) =>
          a[0] === 'Générique' ? -1 : b[0] === 'Générique' ? 1 : a[0].localeCompare(b[0]),
        )
        return { cat, brands: sorted, count: sorted.reduce((s, [, l]) => s + l.length, 0) }
      })
  }, [templates, q])

  return (
    <aside className="palette">
      <input
        className="search"
        placeholder="Rechercher : Yamaha, LA4X, MegaPointe…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="hint">Glissez un équipement sur le synoptique, ou cliquez pour l’ajouter. Connectique indicative : vérifiez la fiche constructeur.</p>
      {groups.map(({ cat, brands, count }) => (
        <details key={`${cat}-${q ? 'q' : ''}`} open={!!q || cat === 'Câblage'}>
          <summary style={{ color: CATEGORY_COLORS[cat] }}>
            {cat} <small>{count}</small>
          </summary>
          {brands.map(([brand, list]) => (
            <div key={brand} className="brand-group">
              <div className="brand">{brand}</div>
              {list.map((t) => (
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
                  <small>{t.panel ? `${t.panel.holes.filter((h) => h.connector).length} connecteurs` : `${t.ports.length} ports`}{t.rackU ? ` · ${t.rackU}U` : ''}</small>
                </button>
              ))}
            </div>
          ))}
        </details>
      ))}
    </aside>
  )
}
