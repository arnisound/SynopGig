import { useState } from 'react'
import { describeSpec, readCase, type CaseSpec } from './caseImport'

interface Props {
  /** Racks page: whatever the page says, the result is a rack case. */
  rackOnly?: boolean
  onCreate: (spec: CaseSpec) => void
}

/** "Recreate from a shop page": paste a link (or the page text), get the case. */
export default function CaseImport({ rackOnly, onCreate }: Props) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [pasting, setPasting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const run = async () => {
    if (!url.trim() && !text.trim()) return
    setBusy(true)
    try {
      const { spec, ai, note } = await readCase({ url, text: pasting ? text : undefined }, setStatus)
      if (rackOnly) spec.kind = 'rack'
      onCreate(spec)
      const what = describeSpec(spec)
      setStatus(
        `« ${spec.name ?? 'Case'} » créé${what ? ` : ${what}` : ''}. ${ai ? 'Lu par l’IA' : `Lecture simple, sans IA${note ? ` (${note})` : ''}`} : vérifiez les cotes.`,
      )
      setUrl('')
      setText('')
    } catch (e) {
      setStatus(`Impossible de lire la page : ${e instanceof Error ? e.message : String(e)} Collez plutôt le texte de la page.`)
      setPasting(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="case-import">
      <h4>Recréer depuis un site</h4>
      <p className="muted small">Collez le lien d’une page produit (Thomann, Woodbrass, fabricant…) : {rackOnly ? 'le rack' : 'le flight case'} est recréé avec ses dimensions.</p>
      <input type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
      {pasting ? (
        <textarea rows={4} placeholder="Ou collez ici le texte de la page (dimensions, poids…)" value={text} onChange={(e) => setText(e.target.value)} />
      ) : (
        <button className="link" onClick={() => setPasting(true)}>ou coller le texte de la page</button>
      )}
      <button className="primary" disabled={busy || (!url.trim() && !text.trim())} onClick={run}>
        {busy ? 'Lecture…' : 'Recréer'}
      </button>
      {status && <p className="small status-line">{status}</p>}
    </div>
  )
}
