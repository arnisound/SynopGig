import { useState, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createCase, download, slug, toCsv } from '../project'
import type { CaseKind, FlightCase, Project } from '../types'
import RackFace from '../racks/RackFace'
import { BannerArt, CaseFront } from './CaseSvg'
import { bannerSize, caseHeightMm } from './geometry'

const KINDS: Record<CaseKind, string> = {
  rack: 'Rack 19"',
  malle: 'Malle',
  valise: 'Valise',
  console: 'Case console (capot)',
}

const FONTS = [
  { label: 'Impact', value: 'Impact, "Arial Black", sans-serif' },
  { label: 'Stencil', value: '"Stencil Std", Stencil, "Black Ops One", Impact, sans-serif' },
  { label: 'Sans', value: '"Helvetica Neue", Arial, sans-serif' },
  { label: 'Mono', value: '"Courier New", monospace' },
]

const SHELLS = ['#1c1c1f', '#3b3f45', '#c8b28a', '#1f3b73', '#7a1f1f', '#2f5d34', '#e8e8e8']

const PRESETS = [
  { title: 'SON', bg: '#e5484d', fg: '#ffffff' },
  { title: 'LUMIÈRE', bg: '#46a758', fg: '#ffffff' },
  { title: 'VIDÉO', bg: '#8e4ec6', fg: '#ffffff' },
  { title: 'RÉSEAU', bg: '#0090ff', fg: '#ffffff' },
  { title: 'ÉNERGIE', bg: '#ffc53d', fg: '#1c1c1f' },
  { title: 'PLATEAU', bg: '#1c1c1f', fg: '#ffc53d' },
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
}

export default function CaseEditor({ project, setProject }: Props) {
  const { cases, nodes } = project
  const [selectedId, setSelectedId] = useState<string | undefined>(cases[0]?.id)
  const fc = cases.find((c) => c.id === selectedId) ?? cases[0]

  const update = (patch: Partial<FlightCase>) =>
    setProject((p) => ({ ...p, cases: p.cases.map((c) => (c.id === fc.id ? { ...c, ...patch } : c)) }))
  const setBanner = (patch: Partial<FlightCase['banner']>) => update({ banner: { ...fc.banner, ...patch } })

  const add = () => {
    const c = createCase(cases)
    setProject((p) => ({ ...p, cases: [...p.cases, c] }))
    setSelectedId(c.id)
  }

  const duplicate = () => {
    const c = { ...structuredClone(fc), id: `fc-${Math.random().toString(36).slice(2, 10)}`, number: String(cases.length + 1).padStart(2, '0'), devices: [] }
    setProject((p) => ({ ...p, cases: [...p.cases, c] }))
    setSelectedId(c.id)
  }

  const remove = () => {
    if (!confirm(`Supprimer « ${fc.name} » ?`)) return
    setProject((p) => ({ ...p, cases: p.cases.filter((c) => c.id !== fc.id) }))
    setSelectedId(undefined)
  }

  const inOtherCase = new Map<string, string>()
  for (const c of cases) if (c.id !== fc?.id) for (const d of c.devices) inOtherCase.set(d, c.name)

  const devices = fc ? fc.devices.map((id) => nodes.find((n) => n.id === id)).filter((n) => n !== undefined) : []
  const weight = devices.reduce((s, d) => s + (d.data.weight ?? 0), 0)
  const usedU = devices.reduce((s, d) => s + (d.data.rackU ?? 0), 0)

  const onLogo = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setBanner({ logo: String(reader.result) })
    reader.readAsDataURL(file)
  }

  const printBanners = (list: FlightCase[]) => {
    const html = list
      .map((c) => {
        const { bw, bh } = bannerSize(c)
        const contents = c.devices
          .map((id) => nodes.find((n) => n.id === id)?.data.name)
          .filter(Boolean)
          .concat(c.extras.split('\n').filter((l) => l.trim()))
        const svg = renderToStaticMarkup(
          <svg xmlns="http://www.w3.org/2000/svg" width={`${bw}mm`} height={`${bh}mm`} viewBox={`0 0 ${bw} ${bh}`}>
            <BannerArt banner={c.banner} number={c.number} w={bw} h={bh} />
          </svg>,
        )
        return `<section><h2>${escapeHtml(c.name)} — bandeau ${bw / 10} × ${bh / 10} cm</h2>${svg}
          <div class="label"><b>${escapeHtml(project.name)}</b> · Case n° ${escapeHtml(c.number)} · ${escapeHtml(c.name)}
          <ul>${contents.map((l) => `<li>${escapeHtml(String(l))}</li>`).join('')}</ul></div></section>`
      })
      .join('')
    const w = window.open('', '_blank')
    if (!w) return alert('Autorisez les fenêtres pop-up pour imprimer.')
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bandeaux — ${escapeHtml(project.name)}</title>
      <style>
        @page { margin: 10mm; }
        body { font-family: Arial, sans-serif; color: #111; background: #fff; }
        section { page-break-after: always; }
        h2 { font-size: 12px; color: #666; font-weight: normal; }
        @media screen { svg { max-width: 100%; height: auto; } }
        .label { margin-top: 10mm; border: 1px dashed #999; padding: 4mm; width: 90mm; font-size: 11px; }
        .label ul { margin: 2mm 0 0; padding-left: 4mm; }
      </style></head><body>${html}<script>window.onload = () => window.print()</script></body></html>`)
    w.document.close()
  }

  const exportPacking = () => {
    const rows: (string | number | undefined)[][] = [['Case', 'N°', 'Type', 'Contenu', 'Modèle', 'Poids (kg)']]
    for (const c of cases) {
      for (const id of c.devices) {
        const n = nodes.find((x) => x.id === id)
        if (n) rows.push([c.name, c.number, KINDS[c.kind], n.data.name, n.data.model, n.data.weight])
      }
      for (const l of c.extras.split('\n').filter((x) => x.trim())) rows.push([c.name, c.number, KINDS[c.kind], l, '', ''])
    }
    download(`${slug(project.name)}-colisage.csv`, toCsv(rows), 'text/csv')
  }

  return (
    <div className="page cases">
      <aside className="case-list">
        <div className="section-head">
          <h3>Flight cases</h3>
          <button onClick={add}>+ Nouveau</button>
        </div>
        {cases.map((c) => (
          <button key={c.id} className={`case-item ${c.id === fc?.id ? 'active' : ''}`} onClick={() => setSelectedId(c.id)}>
            <span className="swatch" style={{ background: c.banner.bg, color: c.banner.fg }}>{c.number}</span>
            <span>
              {c.name}
              <small>{KINDS[c.kind]} · {c.devices.length} équip.</small>
            </span>
          </button>
        ))}
        {cases.length > 0 && (
          <div className="stack">
            <button onClick={() => printBanners(cases)}>Imprimer tous les bandeaux</button>
            <button onClick={exportPacking}>Liste de colisage CSV</button>
          </div>
        )}
      </aside>

      {!fc ? (
        <div className="empty-state">
          <p>Aucun flight case. Créez-en un pour dessiner son bandeau et y ranger le matériel du synoptique.</p>
          <button onClick={add}>+ Créer un flight case</button>
        </div>
      ) : (
        <>
          <div className="case-form">
            <h3>Case</h3>
            <div className="row">
              <Field label="N°"><input value={fc.number} onChange={(e) => update({ number: e.target.value })} /></Field>
              <Field label="Nom"><input value={fc.name} onChange={(e) => update({ name: e.target.value })} /></Field>
            </div>
            <Field label="Type">
              <select value={fc.kind} onChange={(e) => update({ kind: e.target.value as CaseKind })}>
                {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <div className="row">
              {fc.kind === 'rack' ? (
                <Field label="Unités (U)"><input type="number" min={1} max={48} value={fc.rackU} onChange={(e) => update({ rackU: Number(e.target.value) || 1 })} /></Field>
              ) : (
                <Field label="Hauteur (cm)"><input type="number" min={10} value={fc.height} onChange={(e) => update({ height: Number(e.target.value) || 10 })} /></Field>
              )}
              <Field label="Largeur (cm)"><input type="number" min={20} value={fc.width} onChange={(e) => update({ width: Number(e.target.value) || 20 })} /></Field>
              <Field label="Profondeur (cm)"><input type="number" min={10} value={fc.depth} onChange={(e) => update({ depth: Number(e.target.value) || 10 })} /></Field>
            </div>
            <Field label="Couleur de la coque">
              <div className="swatches">
                {SHELLS.map((s) => (
                  <button key={s} className={`swatch-btn ${fc.shell === s ? 'active' : ''}`} style={{ background: s }} onClick={() => update({ shell: s })} aria-label={s} />
                ))}
                <input type="color" value={fc.shell} onChange={(e) => update({ shell: e.target.value })} />
              </div>
            </Field>
            <div className="row">
              <label className="toggle"><input type="checkbox" checked={fc.wheels} onChange={(e) => update({ wheels: e.target.checked })} /> Roulettes</label>
              <Field label="Poignées"><input type="number" min={0} max={4} value={fc.handles} onChange={(e) => update({ handles: Number(e.target.value) })} /></Field>
            </div>

            <h3>Bandeau</h3>
            <div className="presets">
              {PRESETS.map((p) => (
                <button key={p.title} style={{ background: p.bg, color: p.fg }} onClick={() => setBanner({ title: p.title, bg: p.bg, fg: p.fg })}>
                  {p.title}
                </button>
              ))}
            </div>
            <Field label="Titre"><input value={fc.banner.title} onChange={(e) => setBanner({ title: e.target.value })} /></Field>
            <Field label="Sous-titre"><input value={fc.banner.subtitle} onChange={(e) => setBanner({ subtitle: e.target.value })} /></Field>
            <div className="row">
              <Field label="Fond"><input type="color" value={fc.banner.bg} onChange={(e) => setBanner({ bg: e.target.value })} /></Field>
              <Field label="Texte"><input type="color" value={fc.banner.fg} onChange={(e) => setBanner({ fg: e.target.value })} /></Field>
              <Field label="Police">
                <select value={fc.banner.font} onChange={(e) => setBanner({ font: e.target.value })}>
                  {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Logo">
              <div className="row">
                <input type="file" accept="image/*" onChange={(e) => onLogo(e.target.files?.[0])} />
                {fc.banner.logo && <button onClick={() => setBanner({ logo: undefined })}>Retirer</button>}
              </div>
            </Field>

            <h3>Contenu</h3>
            <p className="muted">Matériel du synoptique rangé dans ce case :</p>
            <ul className="check-list">
              {nodes.map((n) => {
                const checked = fc.devices.includes(n.id)
                const elsewhere = inOtherCase.get(n.id)
                return (
                  <li key={n.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => update({ devices: checked ? fc.devices.filter((d) => d !== n.id) : [...fc.devices, n.id] })}
                      />
                      {n.data.name}
                      <small>
                        {n.data.rackU ? ` · ${n.data.rackU}U` : ''}
                        {elsewhere ? ` · déjà dans « ${elsewhere} »` : ''}
                      </small>
                    </label>
                  </li>
                )
              })}
            </ul>
            <Field label="Autres éléments (un par ligne)">
              <textarea rows={4} value={fc.extras} onChange={(e) => update({ extras: e.target.value })} />
            </Field>
            <div className="actions">
              <button onClick={duplicate}>Dupliquer</button>
              <button className="danger" onClick={remove}>Supprimer</button>
            </div>
          </div>

          <div className="case-preview">
            <div className="section-head">
              <h3>Aperçu</h3>
              <button onClick={() => printBanners([fc])}>Imprimer le bandeau (taille réelle)</button>
            </div>
            <CaseFront fc={fc} />
            <dl className="specs">
              <div><dt>Dimensions ext.</dt><dd>{fc.width} × {Math.round(caseHeightMm(fc) / 10)} × {fc.depth} cm</dd></div>
              <div><dt>Bandeau</dt><dd>{bannerSize(fc).bw / 10} × {bannerSize(fc).bh / 10} cm</dd></div>
              <div><dt>Poids du contenu</dt><dd>{weight.toFixed(1)} kg</dd></div>
              {fc.kind === 'rack' && <div><dt>Occupation</dt><dd className={usedU > fc.rackU ? 'bad' : ''}>{usedU} / {fc.rackU} U</dd></div>}
            </dl>
            {fc.kind === 'rack' && (
              <>
                <h4>Vue rack ouvert</h4>
                <RackFace fc={fc} nodes={nodes} edges={project.edges} side="front" />
                <p className="muted small">Pour monter et câbler ce rack, ouvrez l’onglet Racks.</p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
