import { CONNECTORS, SIGNALS } from '../data/connectors'
import { CATEGORY_COLORS } from '../data/library'
import { buildGuide } from '../guide/steps'
import { buildTables, type TableBlock } from '../lists/tables'
import { rackOfNode, resolveCables } from '../project'
import RackFace from '../racks/RackFace'
import { BannerArt, CaseFront } from '../cases/CaseSvg'
import { bannerSize, caseHeightMm } from '../cases/geometry'
import type { DeviceNode, Project } from '../types'
import { departmentsOf, SECTIONS, type SectionId } from './sections'
import type { Shot } from './SynopticShooter'
import { buildPatch, channelsBySource, patchLabel } from '../patch/patch'
import { stageOf } from '../stage/stage'
import StageSvg from '../stage/StageSvg'
import Page from './PrintPage'
import SynopticPages, { type SynopticMode } from './SynopticPages'
import DeviceArt from '../ui/DeviceArt'

const TABLE_OF: Partial<Record<SectionId, string | string[]>> = { cables: 'cables', bom: 'nomenclature', ip: ['ip', 'reseau'], dmx: 'dmx', panels: 'bandeaux', power: 'energie' }

function Table({ block }: { block: Pick<TableBlock, 'head' | 'rows'> }) {
  return (
    <table>
      <thead>
        <tr>{block.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {block.rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
        {block.rows.length === 0 && (
          <tr><td colSpan={block.head.length} className="muted">Aucune donnée</td></tr>
        )}
      </tbody>
    </table>
  )
}

/** Text safe inside a CSS string. */
const cssString = (t: string) => t.replace(/[\\"\n\r<>]/g, ' ')

const deviceName = (n: DeviceNode) => (n.data.brand ? `${n.data.brand} ${n.data.model}` : n.data.model)

/** The complete printed file of a project; the sections are chosen by the user. */
export default function Dossier({
  project,
  sections,
  printedOn,
  synopticMode,
  shots,
}: {
  project: Project
  sections: Set<SectionId>
  printedOn: string
  synopticMode: SynopticMode
  shots: Map<string, Shot | undefined>
}) {
  const has = (id: SectionId) => sections.has(id)
  const { nodes, edges, cases } = project
  const tables = new Map(buildTables(project).map((t) => [t.file, t]))
  const cables = resolveCables(nodes, edges)
  const racks = cases.filter((c) => c.kind === 'rack')
  const caseOf = rackOfNode(cases)
  const zones = [...new Set(nodes.map((n) => n.data.zone || 'Sans zone'))].sort()
  const alerts = cables.filter((c) => c.issues.length > 0)
  const date = project.date ? new Date(project.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  // "Port → cable → other end", for the detailed device sheets.
  const plugged = new Map<string, { id: string; other: string; length?: number }>()
  for (const c of cables) {
    const id = c.edge.data?.cableId ?? ''
    const len = c.edge.data?.length
    if (c.from && c.fromPort) plugged.set(`${c.from.id}/${c.fromPort.id}`, { id, other: `${c.to?.data.name ?? '?'} [${c.toPort?.label ?? '?'}]`, length: len })
    if (c.to && c.toPort) plugged.set(`${c.to.id}/${c.toPort.id}`, { id, other: `${c.from?.data.name ?? '?'} [${c.fromPort?.label ?? '?'}]`, length: len })
  }

  const table = (id: SectionId) => {
    if (!has(id)) return null
    return [TABLE_OF[id] ?? []].flat().map((file) => {
      const t = tables.get(file)
      if (!t || (file === 'reseau' && t.rows.length === 0)) return null
      return (
        <section key={file} className="d-page">
          <h2>{t.title}</h2>
          <Table block={t} />
        </section>
      )
    })
  }

  const toc = SECTIONS.filter((s) => s.id !== 'cover' && has(s.id))

  return (
    <div className="dossier">
      {/* Page footer of the file: project on the left, the app, its maker and the page number on the right. */}
      <style>{`@page { size: A4; @bottom-left { content: "${cssString(project.name)}${project.venue ? ` — ${cssString(project.venue)}` : ''} · dossier technique"; font: 7pt Arial, sans-serif; color: #777; } @bottom-right { content: "SynopGig · Arnisound tools · arnisoundtools.com · page " counter(page) " / " counter(pages); font: 7pt Arial, sans-serif; color: #777; } }`}</style>
      {has('cover') && (
        <section className="d-page d-cover">
          <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={90} height={90} />
          <h1>{project.name}</h1>
          <p className="d-sub">{[project.venue, date].filter(Boolean).join(' — ')}</p>
          <p className="d-kind">Dossier technique</p>
          <dl className="d-stats">
            <div><dt>Équipements</dt><dd>{nodes.length}</dd></div>
            <div><dt>Câbles</dt><dd>{cables.length}</dd></div>
            <div><dt>Racks</dt><dd>{racks.length}</dd></div>
            <div><dt>Flight cases</dt><dd>{cases.length - racks.length}</dd></div>
            <div><dt>Alertes</dt><dd>{alerts.length}</dd></div>
          </dl>
          <h2>Sommaire</h2>
          <ol className="d-toc">
            {toc.map((s) => <li key={s.id}>{s.label}</li>)}
          </ol>
          <p className="d-maker">SynopGig, une application <b>Arnisound tools</b> — arnisoundtools.com</p>
          <p className="d-foot">Édité le {printedOn}. Connectique indicative : vérifiez les fiches constructeur.</p>
        </section>
      )}

      {has('synoptic') && <SynopticPages title="Synoptique" shot={shots.get('all')} mode={synopticMode} />}

      {has('departments') && departmentsOf(project).map((d) => <SynopticPages key={d} title={`Synoptique — ${d}`} shot={shots.get(`dept:${d}`)} mode={synopticMode} />)}

      {has('patch') && (() => {
        const { inputs, outputs } = buildPatch(project)
        return (
          <section className="d-page">
            <h2>Patch</h2>
            <h3>Liste d’entrées <small>({inputs.length})</small></h3>
            <Table block={{ head: ['Voie', 'Nom', 'Source', 'Arrivée', 'Pied', '48 V', 'Notes'], rows: inputs.map((r) => [r.channel, r.name, `${patchLabel(r.far)} · ${r.far?.node.data.model ?? ''}`, patchLabel(r.at), r.stand, r.phantom ? '48 V' : '', r.note]) }} />
            <h3>Liste de sorties <small>({outputs.length})</small></h3>
            <Table block={{ head: ['Sortie', 'Mix', 'Départ', 'Destination', 'Notes'], rows: outputs.map((r) => [r.channel, r.name, patchLabel(r.at), `${patchLabel(r.far)} · ${r.far?.node.data.model ?? ''}`, r.note]) }} />
          </section>
        )
      })()}

      {has('stage') && (() => {
        const st = stageOf(project)
        const wide = st.width / st.depth > 1.15
        return (
          <Page wide={wide}>
            <h2>Plan de scène <small>{st.width} × {st.depth} m</small></h2>
            <StageSvg project={project} channels={channelsBySource(project)} className={`stage-print ${wide ? 'wide' : ''}`} />
          </Page>
        )
      })()}

      {has('devices') && (
        <section className="d-page">
          <h2>Équipements par zone</h2>
          {zones.map((z) => (
            <div key={z} className="d-block">
              <h3>{z}</h3>
              <Table
                block={{
                  head: ['Nom', 'Modèle', 'Département', 'Rack / case', 'IP', 'DMX', 'Mode', 'Consignes'],
                  rows: nodes
                    .filter((n) => (n.data.zone || 'Sans zone') === z)
                    .map((n) => [
                      n.data.name,
                      deviceName(n),
                      n.data.category,
                      caseOf.get(n.id)?.name,
                      n.data.config.ip,
                      n.data.config.dmxAddress ? `U${n.data.config.dmxUniverse || 1}.${n.data.config.dmxAddress}` : '',
                      n.data.config.mode,
                      n.data.config.notes,
                    ]),
                }}
              />
            </div>
          ))}
        </section>
      )}

      {has('ports') && (
        <section className="d-page">
          <h2>Fiches équipements</h2>
          {nodes.map((n) => (
            <div key={n.id} className="d-block d-device" style={{ borderLeftColor: CATEGORY_COLORS[n.data.category] }}>
              <h3 className="d-device-head">
                <DeviceArt image={n.data.image} family={n.data.family} templateId={n.data.templateId} model={n.data.model} category={n.data.category} size={36} />
                {n.data.name} <small>{deviceName(n)} · {n.data.zone}{n.data.rackU ? ` · ${n.data.rackU}U` : ''}{n.data.weight ? ` · ${n.data.weight} kg` : ''}</small></h3>
              {(n.data.config.ip || n.data.config.mode || n.data.config.notes) && (
                <p className="d-config">{[n.data.config.ip && `IP ${n.data.config.ip}`, n.data.config.mode && `Mode ${n.data.config.mode}`, n.data.config.notes].filter(Boolean).join(' · ')}</p>
              )}
              <Table
                block={{
                  head: ['Port', 'Connecteur', 'Signal', 'Sens', 'Câble', 'Relié à', 'Longueur'],
                  rows: n.data.ports.map((p) => {
                    const c = plugged.get(`${n.id}/${p.id}`)
                    return [p.label, CONNECTORS[p.connector], SIGNALS[p.signal].label, p.dir === 'in' ? 'Entrée' : p.dir === 'out' ? 'Sortie' : 'Bidir.', c?.id ?? '—', c?.other ?? 'libre', c?.length ? `${c.length} m` : '']
                  }),
                }}
              />
            </div>
          ))}
        </section>
      )}

      {table('cables')}

      {has('alerts') && (
        <section className="d-page">
          <h2>Alertes de câblage</h2>
          {alerts.length === 0 ? (
            <p>Toutes les liaisons sont conformes.</p>
          ) : (
            <Table block={{ head: ['Repère', 'De', 'Vers', 'Alerte'], rows: alerts.map((c) => [c.edge.data?.cableId, `${c.from?.data.name} [${c.fromPort?.label}]`, `${c.to?.data.name} [${c.toPort?.label}]`, c.issues.map((i) => i.message).join(' / ')]) }} />
          )}
        </section>
      )}

      {table('bom')}
      {table('ip')}
      {table('dmx')}
      {table('panels')}
      {table('power')}

      {has('racks') &&
        racks.map((r) => {
          const members = nodes.filter((n) => r.devices.includes(n.id))
          const weight = members.reduce((s, m) => s + (m.data.weight ?? 0), 0) + (r.emptyWeight ?? 0)
          return (
            <section key={r.id} className="d-page">
              <h2>Rack « {r.name} » <small>{r.rackU}U · {weight.toFixed(1)} kg · n° {r.number}</small></h2>
              <div className="d-rack">
                <div><h3>Face avant</h3><RackFace fc={r} nodes={nodes} edges={edges} side="front" /></div>
                <div><h3>Face arrière</h3><RackFace fc={r} nodes={nodes} edges={edges} side="rear" /></div>
              </div>
            </section>
          )
        })}

      {has('cases') &&
        cases.map((c) => {
            const content = c.devices.map((id) => nodes.find((n) => n.id === id)).filter((n) => n !== undefined)
            const weight = content.reduce((s, m) => s + (m.data.weight ?? 0), 0) + (c.emptyWeight ?? 0)
            const { bw, bh } = bannerSize(c)
            return (
              <section key={c.id} className="d-page">
                <h2>Flight case n° {c.number} « {c.name} »</h2>
                <div className="d-case">
                  <CaseFront fc={c} />
                  <div>
                    <dl className="d-specs">
                      <div><dt>Dimensions ext.</dt><dd>{c.width} × {Math.round(caseHeightMm(c) / 10)} × {c.depth} cm</dd></div>
                      <div><dt>Poids total</dt><dd>{weight.toFixed(1)} kg</dd></div>
                      <div><dt>Roulettes</dt><dd>{c.wheels ? 'oui' : 'non'}</dd></div>
                      <div><dt>Bandeau</dt><dd>{bw / 10} × {bh / 10} cm</dd></div>
                    </dl>
                    <h3>Contenu</h3>
                    <ul>
                      {content.map((n) => <li key={n.id}>{n.data.name} — {deviceName(n)}</li>)}
                      {c.extras.split('\n').filter((l) => l.trim()).map((l, i) => <li key={`x${i}`}>{l}</li>)}
                    </ul>
                  </div>
                </div>
                <svg className="d-banner" viewBox={`0 0 ${bw} ${bh}`}><BannerArt banner={c.banner} number={c.number} w={bw} h={bh} /></svg>
              </section>
            )
          })}

      {has('guide') && (
        <section className="d-page">
          <h2>Feuille de montage</h2>
          {buildGuide(project).map((s) => (
            <div key={s.title} className="d-block">
              <h3>{s.title}</h3>
              {s.steps.length === 0 && <p className="muted">Rien à faire ici.</p>}
              <ol className="d-steps">
                {s.steps.map((step) => (
                  <li key={step.id} style={{ borderLeftColor: step.color }}>
                    <span className="d-check">{project.progress[step.id] ? '☑' : '☐'}</span>
                    <div>
                      <b>{step.title}</b>
                      {step.detail && <div className="d-detail">{step.detail}</div>}
                      {step.warnings?.map((w) => <div key={w} className="d-warn">⚠ {w}</div>)}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
