import { useRef, useState } from 'react'
import { shrink } from '../library/images'
import { findDocuments, findPhotos, saveDocs, savePhoto } from '../library/photos'
import type { DeviceData, ProductDoc } from '../types'
import DeviceArt from '../ui/DeviceArt'

/** The product's photo: found on the maker's pages through the relay, or imported; kept for the model. */
export function PhotoPicker({ d, onChange }: { d: DeviceData; onChange: (image?: string) => void }) {
  const [found, setFound] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const pick = (image?: string) => {
    onChange(image)
    if (!d.templateId.startsWith('custom-')) savePhoto(d.templateId, image)
  }
  const search = async () => {
    setStatus('Recherche sur les pages du fabricant…')
    try {
      const got = await findPhotos(d.brand ?? '', d.model)
      setFound(got)
      setStatus(got.length ? 'Cliquez sur la bonne photo : elle servira pour ce modèle dans tous vos projets.' : 'Aucune photo trouvée : importez une image, ou gardez le symbole.')
    } catch (e) {
      setStatus(`Recherche impossible : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return (
    <div className="photo-picker">
      <DeviceArt image={d.image} family={d.family} templateId={d.templateId} model={d.model} category={d.category} size={64} />
      <div className="grow">
        <div className="actions">
          <button className="small-btn" onClick={search}>Chercher une photo</button>
          <button className="small-btn" onClick={() => input.current?.click()}>Importer</button>
          {d.image && <button className="small-btn" onClick={() => pick(undefined)}>Symbole</button>}
        </div>
        {status && <p className="muted small">{status}</p>}
        {found.length > 0 && (
          <div className="photo-row">
            {found.map((ph) => (
              <button key={ph.slice(-32)} className={`photo-pick ${d.image === ph ? 'active' : ''}`} onClick={() => pick(ph)}>
                <img src={ph} alt="" width={56} height={56} />
              </button>
            ))}
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) pick(await shrink(f).catch(() => undefined))
          }}
        />
      </div>
    </div>
  )
}

/** Looks the model's user guide and data sheet up on the web, and adds them. */
export function FindDocsButton({ d, onChange }: { d: DeviceData; onChange: (docs: ProductDoc[]) => void }) {
  const [status, setStatus] = useState('')
  return (
    <div className="find-docs">
      <button
        className="small-btn"
        onClick={async () => {
          setStatus('Recherche du mode d’emploi et de la fiche technique…')
          try {
            const got = await findDocuments(d.brand ?? '', d.model)
            const docs = [...got, ...(d.docs ?? []).filter((x) => !got.some((g) => g.url === x.url))]
            onChange(docs)
            if (!d.templateId.startsWith('custom-')) saveDocs(d.templateId, docs)
            setStatus(got.length ? `${got.length} document${got.length > 1 ? 's' : ''} trouvé${got.length > 1 ? 's' : ''}, gardé${got.length > 1 ? 's' : ''} pour ce modèle.` : 'Rien trouvé de sûr : les recherches web restent disponibles.')
          } catch (e) {
            setStatus(`Recherche impossible : ${e instanceof Error ? e.message : String(e)}`)
          }
        }}
      >
        Chercher la documentation
      </button>
      {status && <span className="muted small"> {status}</span>}
    </div>
  )
}
