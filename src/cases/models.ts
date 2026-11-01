import type { CaseKind, FlightCase } from '../types'

/** The kinds of storage, flight cases or not: how each one is drawn and named. */
export const KINDS: Record<CaseKind, string> = {
  rack: 'Rack 19"',
  malle: 'Malle',
  valise: 'Valise',
  console: 'Case console (capot)',
  tiroirs: 'Flight à tiroirs',
  palox: 'Palox de stockage',
  bac: 'Caisse plastique (bac crocodile)',
  roll: 'Roll container grillagé',
  etagere: 'Rack métal de rangement',
  chariot: 'Chariot / plateau roulant',
  housse: 'Housse, sac de transport',
}

/** Real flight cases: a hard shell with corners and latches. */
export const FLIGHT: CaseKind[] = ['rack', 'malle', 'valise', 'console', 'tiroirs']

export type CaseModel = Pick<FlightCase, 'kind' | 'width' | 'height' | 'depth' | 'wheels' | 'handles'> & {
  name: string
  rackU?: number
  emptyWeight?: number
  shell?: string
}

const m = (name: string, kind: CaseKind, [width, height, depth]: [number, number, number], emptyWeight: number, wheels = false, handles = 2, extra: Partial<CaseModel> = {}): CaseModel => ({
  name,
  kind,
  width,
  height,
  depth,
  emptyWeight,
  wheels,
  handles,
  ...extra,
})

/** Usual sizes (outside dimensions, cm) and empty weights: a starting point, to adjust to the real case. */
export const CASE_MODELS: CaseModel[] = [
  m('Rack 19" 2U court', 'rack', [53, 18, 40], 6, false, 2, { rackU: 2 }),
  m('Rack 19" 4U', 'rack', [53, 27, 50], 9, false, 2, { rackU: 4 }),
  m('Rack 19" 6U double porte', 'rack', [53, 36, 60], 13, false, 2, { rackU: 6 }),
  m('Rack 19" 8U double porte', 'rack', [53, 44, 60], 15, false, 2, { rackU: 8 }),
  m('Rack 19" 12U sur roulettes', 'rack', [60, 72, 70], 32, true, 2, { rackU: 12 }),
  m('Rack amplis 16U sur roulettes', 'rack', [60, 90, 75], 45, true, 2, { rackU: 16 }),
  m('Rack 19" 24U sur roulettes', 'rack', [62, 128, 80], 65, true, 4, { rackU: 24 }),
  m('Flight 4 tiroirs 19" (10U)', 'tiroirs', [60, 60, 60], 38, true, 2),
  m('Flight atelier 6 tiroirs', 'tiroirs', [80, 90, 60], 60, true, 2),
  m('Malle à câbles 80 × 50 × 50', 'malle', [80, 50, 50], 22, true, 2),
  m('Malle 120 × 60 × 60 sur roulettes', 'malle', [120, 60, 60], 38, true, 4),
  m('Malle cloisonnée 100 × 60 × 60 (pieds, enceintes)', 'malle', [100, 60, 60], 34, true, 4),
  m('Malle projecteurs (4 lyres)', 'malle', [120, 90, 80], 70, true, 4),
  m('Valise micros 50 × 35 × 18 (mousse découpée)', 'valise', [50, 18, 35], 4, false, 1),
  m('Valise HF 4 récepteurs', 'valise', [60, 25, 45], 9, false, 1),
  m('Flight console 16-24 voies', 'console', [85, 30, 65], 25, false, 2),
  m('Flight console grand format (CL5, dLive S7000)', 'console', [125, 45, 90], 60, true, 4),
  m('Palox plastique 1200 × 800 × 760 (500 L)', 'palox', [120, 76, 80], 38, false, 0, { shell: '#3b3f45' }),
  m('Palox plastique 1200 × 1000 × 790 (610 L)', 'palox', [120, 79, 100], 45, false, 0, { shell: '#3b3f45' }),
  m('Palox grillagé repliable 1200 × 800 × 800', 'palox', [120, 80, 80], 60, false, 0, { shell: '#9aa0a6' }),
  m('Bac crocodile 600 × 400 × 320 (60 L)', 'bac', [60, 32, 40], 2.6, false, 2, { shell: '#c8382e' }),
  m('Bac crocodile 600 × 400 × 400 (75 L)', 'bac', [60, 40, 40], 3, false, 2, { shell: '#1f3b73' }),
  m('Bac crocodile 800 × 600 × 400 (140 L)', 'bac', [80, 40, 60], 5, false, 2, { shell: '#3b3f45' }),
  m('Bac Euronorme 600 × 400 × 220 (40 L)', 'bac', [60, 22, 40], 1.8, false, 2, { shell: '#2f5d34' }),
  m('Bac Euronorme 400 × 300 × 220 (20 L)', 'bac', [40, 22, 30], 1, false, 2, { shell: '#e8e8e8' }),
  m('Roll container grillagé 800 × 720 × 1800', 'roll', [80, 180, 72], 45, true, 0, { shell: '#9aa0a6' }),
  m('Roll câbles 2 niveaux 1000 × 600 × 1200', 'roll', [100, 120, 60], 35, true, 0, { shell: '#9aa0a6' }),
  m('Rack métal de rangement 1000 × 500 × 2000 (5 niveaux)', 'etagere', [100, 200, 50], 30, false, 0, { shell: '#5b6168' }),
  m('Rack métal de rangement 1800 × 600 × 2000 (4 niveaux)', 'etagere', [180, 200, 60], 55, false, 0, { shell: '#1f3b73' }),
  m('Rack à câbles mobile (barres de suspension)', 'etagere', [120, 180, 60], 40, true, 0, { shell: '#5b6168' }),
  m('Chariot plateau 900 × 600 (dolly pour flight)', 'chariot', [90, 18, 60], 12, true, 0, { shell: '#3b3f45' }),
  m('Plateau roulant 600 × 400 (pile de bacs)', 'chariot', [60, 15, 40], 3, true, 0, { shell: '#2b2d31' }),
  m('Housse enceinte (12-15")', 'housse', [50, 75, 45], 2, false, 2, { shell: '#1c1c1f' }),
  m('Sac à câbles 60 L', 'housse', [60, 35, 30], 1.5, false, 2, { shell: '#1c1c1f' }),
  m('Sac pieds d’enceinte (2 pieds)', 'housse', [120, 20, 20], 1.2, false, 1, { shell: '#1c1c1f' }),
]

/** A case given the size, weight and look of a model (its banner and contents are kept). */
export function applyModel(fc: FlightCase, model: CaseModel): FlightCase {
  const { name, rackU, emptyWeight, shell, ...rest } = model
  return { ...fc, ...rest, name, rackU: rackU ?? fc.rackU, emptyWeight, shell: shell ?? fc.shell }
}
