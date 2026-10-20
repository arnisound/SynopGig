import { useMemo, useState } from 'react'
import { CATEGORY_COLORS } from '../data/library'
import type { DeviceTemplate } from '../types'

export const DND_TYPE = 'application/x-synopgig-template'

interface Props {
  templates: DeviceTemplate[]
  onAdd: (t: DeviceTemplate) => void
}

export default function Palette({ templates, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, DeviceTemplate[]>()
    for (const t of templates) {
      if (q && !`${t.model} ${t.category}`.toLowerCase().includes(q)) continue
      map.set(t.category, [...(map.get(t.category) ?? []), t])
    }
    return [...map.entries()]
  }, [templates, query])

  return (
    <aside className="palette">
      <input
        className="search"
        placeholder="Rechercher un équipement…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="hint">Glissez un équipement sur le synoptique, ou cliquez pour l’ajouter.</p>
      {groups.map(([cat, list]) => (
        <section key={cat}>
          <h4 style={{ color: CATEGORY_COLORS[cat] }}>{cat}</h4>
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
              <small>{t.ports.length} ports{t.rackU ? ` · ${t.rackU}U` : ''}</small>
            </button>
          ))}
        </section>
      ))}
    </aside>
  )
}
