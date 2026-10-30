import { useRef, useState } from 'react'
import { findDocs } from './finder'
import { findDocuments, findPhotos, saveDocs, savePhoto, savedDocs, savedPhotos } from './photos'
import type { DeviceTemplate } from '../types'
import { download } from '../project'

/*
 * Fills the catalogue with direct links and photos, model after model,
 * through the relay (it reads the makers' sites). What it finds is kept
 * in this browser at once, and exported for the catalogue of everyone.
 * Paced to stay under the relay's hourly limit.
 */

const PAUSE = 25_000

export default function CatalogFiller({ templates }: { templates: DeviceTemplate[] }) {
  const brands = [...new Set(templates.map((t) => t.brand).filter((b): b is string => !!b && b !== 'Générique'))].sort((a, b) => a.localeCompare(b, 'fr'))
  const [brand, setBrand] = useState('')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [done, setDone] = useState(0)
  const stop = useRef(false)

  const todo = () => {
    const docs = savedDocs()
    const photos = savedPhotos()
    return templates.filter((t) => t.brand && t.brand !== 'Générique' && (!brand || t.brand === brand) && !(docs[t.id] && photos[t.id]))
  }

  const run = async () => {
    stop.current = false
    setRunning(true)
    const list = todo()
    for (let i = 0; i < list.length && !stop.current; i++) {
      const t = list[i]
      const name = `${t.brand} ${t.model.replace(/\s*\(.*\)$/, '')}`
      try {
        const found = await findDocs(t.brand ?? '', t.model.replace(/\s*\(.*\)$/, ''))
        const docs = await findDocuments(t.brand ?? '', t.model, found)
        if (docs.length) saveDocs(t.id, [...docs, ...(t.docs ?? []).filter((d) => !docs.some((x) => x.url === d.url))])
        const photo = savedPhotos()[t.id] ? undefined : (await findPhotos(t.brand ?? '', t.model, found))[0]
        if (photo) savePhoto(t.id, photo)
        setLog((l) => [`${name} : ${docs.length} lien${docs.length > 1 ? 's' : ''}${photo ? ', photo' : ''}`, ...l].slice(0, 30))
      } catch (e) {
        setLog((l) => [`${name} : ${e instanceof Error ? e.message : String(e)}`, ...l].slice(0, 30))
        if (/limite|429|trop/i.test(String(e))) await new Promise((r) => setTimeout(r, 10 * 60_000))
      }
      setDone((n) => n + 1)
      if (i < list.length - 1 && !stop.current) await new Promise((r) => setTimeout(r, PAUSE))
    }
    setRunning(false)
  }

  const exportJson = () => {
    const docs = savedDocs()
    const photos = savedPhotos()
    const ids = new Set([...Object.keys(docs), ...Object.keys(photos)])
    const out: Record<string, { docs?: unknown; photo?: string }> = {}
    // Photos kept as pictures (imported files) stay here: only web addresses go to the catalogue.
    for (const id of ids) out[id] = { ...(docs[id] ? { docs: docs[id] } : {}), ...(photos[id]?.startsWith('https://') ? { photo: photos[id] } : {}) }
    download('media.json', JSON.stringify(out, null, 1), 'application/json')
  }

  const left = todo().length
  return (
    <section className="card catalog-filler">
      <h4>Compléter le catalogue (liens directs et photos)</h4>
      <p className="muted small">
        Pour chaque produit, le relais SynopGig cherche la page du fabricant, le mode d’emploi et la fiche technique, et l’adresse de la photo (affichée depuis le site du fabricant, jamais copiée). Un produit toutes les 25 secondes,
        pour rester sous la limite du relais : laissez l’onglet ouvert. Ce qui est trouvé sert tout de suite dans vos projets ; « Exporter » le donne pour le catalogue de tous.
      </p>
      <div className="actions">
        <select value={brand} onChange={(e) => setBrand(e.target.value)} disabled={running} aria-label="Marque">
          <option value="">Toutes les marques</option>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        {running ? <button onClick={() => (stop.current = true)}>Pause</button> : <button className="primary" disabled={!left} onClick={run}>Lancer ({left} produit{left > 1 ? 's' : ''}, ≈ {Math.ceil((left * PAUSE) / 3_600_000)} h)</button>}
        <button onClick={exportJson}>Exporter (media.json)</button>
      </div>
      {(running || done > 0) && <p className="small">{done} produit{done > 1 ? 's' : ''} traité{done > 1 ? 's' : ''}{running ? '…' : '.'}</p>}
      {log.length > 0 && <ul className="filler-log small muted">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>}
    </section>
  )
}
