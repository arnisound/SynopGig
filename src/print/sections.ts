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
