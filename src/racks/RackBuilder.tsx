import { useMemo, useState } from 'react'
import { CATEGORY_COLORS } from '../data/library'
import { toggleHole } from '../data/panels'
import CaseImport from '../cases/CaseImport'
import { applySpec, type CaseSpec } from '../cases/caseImport'
import { createCase, createDevice, internalRack, rackOfNode, resolveCables, setPanel } from '../project'
import type { DeviceNode, DeviceTemplate, FlightCase, Project } from '../types'
import { canPlace, firstFree, mountRack } from './layout'
import PanelEditor from './PanelEditor'
import PortWiring from './PortWiring'
import RackFace, { RACK_DND } from './RackFace'
import { autoWire } from './wiring'

interface Props {
  project: Project
  setProject: (fn: (p: Project) => Project) => void
  templates: DeviceTemplate[]
}

type Side = 'front' | 'rear' | 'both'

/** Where a new device lands on the synoptic: next to the rack's other devices. */
function spotFor(nodes: DeviceNode[], members: DeviceNode[]) {
  if (members.length) {
    const x = Math.max(...members.map((m) => m.position.x)) + 320
    return { x, y: Math.min(...members.map((m) => m.position.y)) }
  }
  const y = nodes.length ? Math.max(...nodes.map((n) => n.position.y)) + 400 : 0
  return { x: 0, y }
}

export default function RackBuilder({ project, setProject, templates }: Props) {
  const racks = project.cases.filter((c) => c.kind === 'rack')
  const [rackId, setRackId] = useState(racks[0]?.id)
  const [selected, setSelected] = useState<string>()
  const [holes, setHoles] = useState<Set<string>>(new Set())
  const [side, setSide] = useState<Side>('both')
  const [query, setQuery] = useState('')

  const fc = racks.find((r) => r.id === rackId) ?? racks[0]
  const layout = fc ? mountRack(fc, project.nodes) : undefined
  const members = layout ? [...layout.mounted.map((m) => m.node), ...layout.loose, ...layout.overflow] : []
  const node = members.find((m) => m.id === selected)
  const rackedElsewhere = rackOfNode(project.cases)

  const rackable = useMemo(() => {
    const q = query.trim().toLowerCase()
    return templates
      .filter((t) => (t.rackU ?? 0) > 0)
      .filter((t) => !q || `${t.brand ?? ''} ${t.model} ${t.category}`.toLowerCase().includes(q))
      .sort((a, b) => `${a.brand ?? ''} ${a.model}`.localeCompare(`${b.brand ?? ''} ${b.model}`, 'fr', { sensitivity: 'base', numeric: true }))
      .slice(0, 60)
  }, [templates, query])

  const unmounted = project.nodes.filter((n) => (n.data.rackU ?? 0) > 0 && !rackedElsewhere.has(n.id))

  const updateRack = (fn: (c: FlightCase, p: Project) => FlightCase) =>
    setProject((p) => ({ ...p, cases: p.cases.map((c) => (c.id === fc.id ? fn(c, p) : c)) }))

  const newRack = (spec?: CaseSpec) => {
    let c = createCase(project.cases)
    c.kind = 'rack'
    c.rackU = 12
    c.name = `Rack ${racks.length + 1}`
    if (spec) c = applySpec(c, { ...spec, kind: 'rack' })
    c.banner = { ...c.banner, title: 'RACK', subtitle: c.name.toUpperCase() }
    setProject((p) => ({ ...p, cases: [...p.cases, c] }))
    setRackId(c.id)
    setSelected(undefined)
  }

  /** Mounts a device in the current rack, taking it out of any other case. */
  const mount = (p: Project, nodeId: string, top?: number): Project | null => {
    const n = p.nodes.find((x) => x.id === nodeId)
    const rack = p.cases.find((c) => c.id === fc.id)
    if (!n || !rack) return null
    const current = mountRack(rack, p.nodes).mounted
    const h = n.data.rackU ?? 1
    const at = top != null && canPlace(rack.rackU, current, nodeId, top, h) ? top : firstFree(rack.rackU, current, h, nodeId)
    if (at == null) {
      alert(`Plus de place : il faut ${h}U libres dans « ${rack.name} ».`)
      return null
    }
    return {
      ...p,
      cases: p.cases.map((c) =>
        c.id === rack.id
          ? { ...c, devices: c.devices.includes(nodeId) ? c.devices : [...c.devices, nodeId], rackLayout: { ...c.rackLayout, [nodeId]: at } }
          : { ...c, devices: c.devices.filter((d) => d !== nodeId) },
      ),
    }
  }

  /** Applies a change computed from the current project; null = nothing to do. */
  const apply = (next: Project | null) => {
    if (next) setProject(() => next)
    return next
  }

  const addTemplate = (t: DeviceTemplate, top?: number) => {
    const n = createDevice(t, spotFor(project.nodes, members), project.nodes, members[0]?.data.zone ?? 'Plateau')
    if (apply(mount({ ...project, nodes: [...project.nodes, n] }, n.id, top))) setSelected(n.id)
  }

  const onDrop = (payload: string, top: number) => {
    const [kind, id] = payload.split(':')
    if (kind === 'tpl') {
      const t = templates.find((x) => x.id === id)
      if (t) addTemplate(t, top)
    } else {
      if (apply(mount(project, id, top || undefined))) setSelected(id)
    }
  }

  const unmount = (nodeId: string) => {
    updateRack((c) => {
      const rackLayout = { ...c.rackLayout }
      delete rackLayout[nodeId]
      return { ...c, devices: c.devices.filter((d) => d !== nodeId), rackLayout }
    })
    setSelected(undefined)
  }

  const remove = (nodeId: string) => {
    if (!confirm('Supprimer cet équipement du projet (et ses câbles) ?')) return
    setProject((p) => ({
      ...p,
      nodes: p.nodes.filter((n) => n.id !== nodeId),
      edges: p.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      cases: p.cases.map((c) => ({ ...c, devices: c.devices.filter((d) => d !== nodeId) })),
    }))
    setSelected(undefined)
  }

  const wire = (ids: string[]) => {
    let next = project
    let added = 0
    for (const id of ids) {
      const r = autoWire(next, id, members.map((m) => m.id))
      next = r.project
      added += r.added
    }
    apply(added ? next : null)
    alert(added ? `${added} câble(s) ajouté(s).` : 'Aucun port libre compatible à relier.')
  }

  const wireAll = () => {
    const panels = members.filter((m) => m.data.panel).map((m) => m.id)
    wire([...panels, ...members.filter((m) => !m.data.panel).map((m) => m.id)])
  }

  const cables = fc ? resolveCables(project.nodes, project.edges) : []
  const rackMap = rackOfNode(project.cases)
  const internal = cables.filter((c) => internalRack(rackMap, c.edge)?.id === fc?.id)
  const weight = members.reduce((s, m) => s + (m.data.weight ?? 0), 0)

  return (
    <div className="page racks">
      <aside className="case-list">
        <div className="section-head">
          <h3>Racks</h3>
          <button onClick={() => newRack()}>+ Nouveau</button>
        </div>
        {racks.map((r) => (
          <button key={r.id} className={`case-item ${r.id === fc?.id ? 'active' : ''}`} onClick={() => { setRackId(r.id); setSelected(undefined) }}>
            <span className="swatch" style={{ background: r.banner.bg, color: r.banner.fg }}>{r.rackU}U</span>
            <span>
              {r.name}
              <small>{r.devices.length} élément(s)</small>
            </span>
          </button>
        ))}
        {racks.length === 0 && <p className="muted">Aucun rack. Créez-en un, ou sélectionnez des équipements sur le synoptique puis « Créer un rack ».</p>}
        <CaseImport rackOnly onCreate={newRack} />
      </aside>

      {fc && layout ? (
        <>
          <div className="rack-stage">
            <div className="section-head">
              <div className="seg">
                {(['front', 'rear', 'both'] as Side[]).map((s) => (
                  <button key={s} className={side === s ? 'active' : ''} onClick={() => setSide(s)}>
                    {s === 'front' ? 'Avant' : s === 'rear' ? 'Arrière' : 'Les deux'}
                  </button>
                ))}
              </div>
              <button className="primary" onClick={wireAll}>Tout câbler automatiquement</button>
            </div>
            <p className="muted small">
              Glissez le matériel depuis la droite vers une unité du rack, ou déplacez-le dans le rack. Cliquez sur les trous d’un bandeau pour y poser des connecteurs.
            </p>
            <div className="rack-views">
              {(side === 'front' || side === 'both') && (
                <RackFace
                  fc={fc}
                  nodes={project.nodes}
                  edges={project.edges}
                  side="front"
                  selected={selected}
                  selectedHoles={holes}
                  onSelect={(id) => { if (id !== selected) setHoles(new Set()); setSelected(id) }}
                  onHole={(_, h, extend) => setHoles((s) => toggleHole(s, h, extend))}
                  onDrop={onDrop}
                />
              )}
              {(side === 'rear' || side === 'both') && (
                <RackFace
                  fc={fc}
                  nodes={project.nodes}
                  edges={project.edges}
                  side="rear"
                  selected={selected}
                  selectedHoles={holes}
                  onSelect={(id) => { if (id !== selected) setHoles(new Set()); setSelected(id) }}
                  onHole={(_, h, extend) => setHoles((s) => toggleHole(s, h, extend))}
                  onDrop={onDrop}
                />
              )}
            </div>
            {layout.overflow.length > 0 && (
              <div className="issue danger">Ne rentre pas : {layout.overflow.map((n) => n.data.name).join(', ')}. Agrandissez le rack.</div>
            )}
            {layout.loose.length > 0 && (
              <p className="muted">Rangé dans le case (non rackable) : {layout.loose.map((n) => n.data.name).join(', ')}</p>
            )}
            <dl className="specs">
              <div><dt>Occupation</dt><dd className={layout.usedU > fc.rackU ? 'bad' : ''}>{layout.usedU} / {fc.rackU} U</dd></div>
              <div><dt>Poids du matériel</dt><dd>{weight.toFixed(1)} kg</dd></div>
              {fc.emptyWeight ? <div><dt>Poids total</dt><dd>{(weight + fc.emptyWeight).toFixed(1)} kg</dd></div> : null}
              <div><dt>Câbles internes</dt><dd>{internal.length}</dd></div>
              <div><dt>Alertes internes</dt><dd className={internal.some((c) => c.issues.length) ? 'bad' : ''}>{internal.filter((c) => c.issues.length).length}</dd></div>
            </dl>
          </div>

          <aside className="rack-side">
            {node ? (
              <section>
                <div className="section-head">
                  <h3>{node.data.name}</h3>
                  <button className="icon" title="Fermer" onClick={() => setSelected(undefined)}>×</button>
                </div>
                <div className="row">
                  <label className="field">
                    <span>Nom</span>
                    <input
                      value={node.data.name}
                      onChange={(e) => setProject((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, name: e.target.value } } : n)) }))}
                    />
                  </label>
                  <label className="field narrow">
                    <span>Position (U)</span>
                    <input
                      type="number"
                      min={1}
                      max={fc.rackU}
                      value={layout.mounted.find((m) => m.node.id === node.id)?.top ?? ''}
                      onChange={(e) => apply(mount(project, node.id, Number(e.target.value)))}
                    />
                  </label>
                </div>
                <div className="actions">
                  <button onClick={() => unmount(node.id)}>Démonter</button>
                  <button className="danger" onClick={() => remove(node.id)}>Supprimer</button>
                </div>
                {node.data.panel && (
                  <>
                    <h4>Bandeau de câblage</h4>
                    <PanelEditor
                      spec={node.data.panel}
                      selected={holes}
                      onSelect={setHoles}
                      onChange={(spec) => setProject((p) => setPanel(p, node.id, spec))}
                    />
                  </>
                )}
                <div className="section-head">
                  <h4>Câblage interne</h4>
                  <button onClick={() => wire([node.id])}>Câbler auto</button>
                </div>
                <PortWiring project={project} setProject={setProject} node={node} members={members} />
              </section>
            ) : (
              <>
                <section>
                  <h3>Rack</h3>
                  <div className="row">
                    <label className="field">
                      <span>Nom</span>
                      <input value={fc.name} onChange={(e) => updateRack((c) => ({ ...c, name: e.target.value }))} />
                    </label>
                    <label className="field narrow">
                      <span>Hauteur (U)</span>
                      <input type="number" min={1} max={48} value={fc.rackU} onChange={(e) => updateRack((c) => ({ ...c, rackU: Math.max(1, Number(e.target.value) || 1) }))} />
                    </label>
                  </div>
                  <p className="muted small">Le bandeau imprimé et les dimensions du flight case se règlent dans l’onglet Flight cases.</p>
                </section>
                {unmounted.length > 0 && (
                  <section>
                    <h4>Matériel du projet à monter</h4>
                    <div className="pick-list">
                      {unmounted.map((n) => (
                        <button
                          key={n.id}
                          className="palette-item"
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData(RACK_DND, `node:${n.id}`)}
                          onClick={() => onDrop(`node:${n.id}`, 0)}
                        >
                          <span className="dot" style={{ background: CATEGORY_COLORS[n.data.category] }} />
                          <span>{n.data.name}</span>
                          <small>{n.data.rackU}U · {n.data.model}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                <section>
                  <h4>Ajouter depuis la base</h4>
                  <input className="search" placeholder="Bandeau, Rio, LA4X, GigaCore…" value={query} onChange={(e) => setQuery(e.target.value)} />
                  <div className="pick-list">
                    {rackable.map((t) => (
                      <button
                        key={t.id}
                        className="palette-item"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData(RACK_DND, `tpl:${t.id}`)}
                        onClick={() => addTemplate(t)}
                      >
                        <span className="dot" style={{ background: CATEGORY_COLORS[t.category] }} />
                        <span>{t.brand ? <b>{t.brand} </b> : null}{t.model}</span>
                        <small>{t.rackU}U · {t.category}</small>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}
          </aside>
        </>
      ) : (
        <div className="empty-state">
          <p>Montez vos racks unité par unité, ajoutez des bandeaux de câblage et câblez l’intérieur.</p>
          <button onClick={() => newRack()}>+ Créer un rack</button>
        </div>
      )}
    </div>
  )
}
