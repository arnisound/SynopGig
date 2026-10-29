import { useState } from 'react'
import type { ProductDoc, Spec } from '../types'

/*
 * The product sheet beyond its sockets, shared by the library editor and the
 * synoptic's inspector: characteristics grouped by kind, and documents.
 */

const SPEC_GROUPS = ['Physique', 'Alimentation', 'Audio', 'Vidéo', 'Lumière', 'Réseau', 'Autres']

/** Groups in a stable order: the usual ones first, then any other. */
function groupSpecs(specs: Spec[]) {
  const groups = new Map<string, { spec: Spec; i: number }[]>()
  specs.forEach((spec, i) => groups.set(spec.group || 'Autres', [...(groups.get(spec.group || 'Autres') ?? []), { spec, i }]))
  const rank = (g: string) => (SPEC_GROUPS.includes(g) ? SPEC_GROUPS.indexOf(g) : SPEC_GROUPS.length)
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], 'fr'))
}

export function SpecsEditor({ specs = [], onChange }: { specs?: Spec[]; onChange: (specs: Spec[]) => void }) {
  const [group, setGroup] = useState('Physique')
  const set = (i: number, patch: Partial<Spec>) => onChange(specs.map((s, k) => (k === i ? { ...s, ...patch } : s)))
  return (
    <div className="spec-sheet">
      {specs.length === 0 && <p className="muted small">Aucune caractéristique pour l’instant.</p>}
      {groupSpecs(specs).map(([name, items]) => (
        <details key={name} open>
          <summary>{name} <small className="muted">{items.length}</small></summary>
          {items.map(({ spec, i }) => (
            <div key={i} className="spec-row">
              <input aria-label="Caractéristique" value={spec.label} onChange={(e) => set(i, { label: e.target.value })} />
              <input aria-label="Valeur" className="spec-value" value={spec.value} onChange={(e) => set(i, { value: e.target.value })} />
              <input aria-label="Unité" className="spec-unit" placeholder="unité" value={spec.unit ?? ''} onChange={(e) => set(i, { unit: e.target.value || undefined })} />
              <button className="icon" title="Retirer" onClick={() => onChange(specs.filter((_, k) => k !== i))}>×</button>
            </div>
          ))}
        </details>
      ))}
      <div className="row wrap">
        <select aria-label="Groupe" value={group} onChange={(e) => setGroup(e.target.value)}>
          {SPEC_GROUPS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <button onClick={() => onChange([...specs, { group, label: 'Nouvelle caractéristique', value: '—' }])}>+ Ajouter une caractéristique</button>
      </div>
    </div>
  )
}

export function DocsEditor({ docs = [], onChange }: { docs?: ProductDoc[]; onChange: (docs: ProductDoc[]) => void }) {
  return (
    <div className="docs">
      {docs.length === 0 && <p className="muted small">Aucun document : ajoutez le lien de la fiche technique ou du mode d’emploi.</p>}
      {docs.map((d, i) => (
        <div key={i} className="doc-row">
          <input aria-label="Titre" value={d.title} onChange={(e) => onChange(docs.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} />
          <input aria-label="Adresse" className="doc-url" value={d.url} onChange={(e) => onChange(docs.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} />
          {/^https?:\/\//.test(d.url) && <a href={d.url} target="_blank" rel="noopener noreferrer" title="Ouvrir">↗</a>}
          <button className="icon" title="Retirer" onClick={() => onChange(docs.filter((_, k) => k !== i))}>×</button>
        </div>
      ))}
      <button onClick={() => onChange([...docs, { title: 'Fiche technique', url: 'https://' }])}>+ Ajouter un document</button>
    </div>
  )
}
