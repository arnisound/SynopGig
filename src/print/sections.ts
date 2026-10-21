import type { Category, Project, SynopticView } from '../types'
import { viewOf } from '../synoptic/view'

/** Parts of the printed file, in print order. */
export const SECTIONS = [
  { id: 'cover', label: 'Couverture et sommaire' },
  { id: 'synoptic', label: 'Synoptique (vue d’ensemble)' },
  { id: 'departments', label: 'Synoptique par département' },
  { id: 'devices', label: 'Équipements par zone' },
  { id: 'ports', label: 'Fiche détaillée de chaque équipement (ports et câbles)' },
  { id: 'cables', label: 'Liste de câbles' },
  { id: 'alerts', label: 'Alertes de câblage' },
  { id: 'bom', label: 'Nomenclature' },
  { id: 'ip', label: 'Plan d’adressage IP' },
  { id: 'dmx', label: 'Patch DMX' },
  { id: 'panels', label: 'Bandeaux de câblage' },
  { id: 'racks', label: 'Racks (faces avant et arrière)' },
  { id: 'cases', label: 'Flight cases et bandeaux' },
  { id: 'guide', label: 'Guide technicien (feuille de montage)' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']


/** Departments that get their own synoptic page. */
export function departmentsOf(project: Project): Category[] {
  return [...new Set(project.nodes.map((n) => n.data.category))].filter((c) => c !== 'Câblage' && c !== 'Autre')
}

/** The synoptic pictures a file needs: the screen view, then one per department. */
export function shotPlan(project: Project, sections: Set<SectionId>): { key: string; view: SynopticView }[] {
  const view = viewOf(project)
  return [
    ...(sections.has('synoptic') ? [{ key: 'all', view }] : []),
    ...(sections.has('departments') ? departmentsOf(project).map((d) => ({ key: `dept:${d}`, view: { ...view, department: d } })) : []),
  ]
}
