import { useMemo } from 'react'
import { download, slug, toCsv } from '../project'
import type { PatchEdit, Project } from '../types'
import { buildPatch, patchLabel, type PatchRow } from './patch'

const STANDS = ['Grand pied perche', 'Petit pied perche', 'Pied droit', 'Pince', 'Suspendu', 'Pied de table', 'Aucun (DI / ligne)']

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
}

/** Input and output lists, generated from the synoptic, editable line by line. */
export default function PatchPage({ project, setProject }: Props) {
  const { inputs, outputs } = useMemo(() => buildPatch(project), [project])

  const edit = (list: 'inputs' | 'outputs', key: string, patch: PatchEdit) =>
    setProject((p) => {
      const lists = p.patch ?? {}
      const cur = lists[list] ?? {}
      return { ...p, patch: { ...lists, [list]: { ...cur, [key]: { ...cur[key], ...patch } } } }
    })

  const reset = () => confirm('Revenir à la numérotation et aux noms générés depuis le synoptique ?') && setProject((p) => ({ ...p, patch: {} }))

  const csv = () => {
    const rows = [
      ['Liste d’entrées'],
      ['Voie', 'Nom', 'Source', 'Modèle', 'Arrivée', 'Pied', '48 V', 'Notes'],
      ...inputs.map((r) => [r.channel, r.name, patchLabel(r.far), r.far?.node.data.model, patchLabel(r.at), r.stand, r.phantom ? 'oui' : '', r.note]),
      [],
      ['Liste de sorties'],
      ['Sortie', 'Mix', 'Départ', 'Destination', 'Modèle', 'Notes'],
      ...outputs.map((r) => [r.channel, r.name, patchLabel(r.at), patchLabel(r.far), r.far?.node.data.model, r.note]),
    ]
    download(`${slug(project.name)}-patch.csv`, toCsv(rows), 'text/csv')
  }

  const cell = (list: 'inputs' | 'outputs', r: PatchRow, field: 'channel' | 'name' | 'note', width?: number) => (
    <input className="cell" style={width ? { width } : undefined} value={r[field]} onChange={(e) => edit(list, r.key, { [field]: e.target.value })} />
  )

  return (
    <div className="page patch">
      <header className="page-head">
        <div>
          <h2>Patch</h2>
          <p>Listes d’entrées et de sorties, tirées du synoptique (consoles et stageboxes). Numéros, noms, pieds, 48 V et notes se modifient ici.</p>
        </div>
        <div className="no-print">
          <button onClick={csv}>Export CSV</button>
          <button onClick={() => window.print()}>Imprimer / PDF</button>
          <button onClick={reset}>Réinitialiser</button>
        </div>
      </header>

      <section>
        <h3>Liste d’entrées <small className="muted">({inputs.length})</small></h3>
        <datalist id="stands">{STANDS.map((s) => <option key={s} value={s} />)}</datalist>
        <table className="patch-table">
          <thead>
            <tr><th>Voie</th><th>Nom</th><th>Source</th><th>Arrivée</th><th>Pied</th><th>48 V</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {inputs.map((r) => (
              <tr key={r.key}>
                <td>{cell('inputs', r, 'channel', 52)}</td>
                <td>{cell('inputs', r, 'name')}</td>
                <td>{patchLabel(r.far)}<small className="muted"> {r.far?.node.data.model}</small></td>
                <td>{patchLabel(r.at)}</td>
                <td><input className="cell" list="stands" value={r.stand} onChange={(e) => edit('inputs', r.key, { stand: e.target.value })} /></td>
                <td><input type="checkbox" checked={r.phantom} onChange={(e) => edit('inputs', r.key, { phantom: e.target.checked })} aria-label="48 V" /></td>
                <td>{cell('inputs', r, 'note')}</td>
              </tr>
            ))}
            {inputs.length === 0 && (
              <tr><td colSpan={7} className="muted">Aucune entrée : câblez des micros, DI ou récepteurs HF vers une console ou une stagebox sur le synoptique.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Liste de sorties <small className="muted">({outputs.length})</small></h3>
        <table className="patch-table">
          <thead>
            <tr><th>Sortie</th><th>Mix</th><th>Départ</th><th>Destination</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {outputs.map((r) => (
              <tr key={r.key}>
                <td>{cell('outputs', r, 'channel', 52)}</td>
                <td>{cell('outputs', r, 'name')}</td>
                <td>{patchLabel(r.at)}</td>
                <td>{patchLabel(r.far)}<small className="muted"> {r.far?.node.data.model}</small></td>
                <td>{cell('outputs', r, 'note')}</td>
              </tr>
            ))}
            {outputs.length === 0 && (
              <tr><td colSpan={5} className="muted">Aucune sortie câblée depuis une console ou une stagebox.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
