import type { Project, StageItemKind, StagePlot } from '../types'

/** Drawing units per metre. */
export const M = 100

/** Default size (metres) and name of each kind of stage element. */
export const KINDS: Record<StageItemKind, { label: string; w: number; h: number }> = {
  device: { label: 'Appareil', w: 0.7, h: 0.45 },
  musician: { label: 'Musicien', w: 0.6, h: 0.6 },
  riser: { label: 'Praticable 2 × 2', w: 2, h: 2 },
  stand: { label: 'Pied de micro', w: 0.35, h: 0.35 },
  wedge: { label: 'Retour', w: 0.7, h: 0.5 },
  drums: { label: 'Batterie', w: 2, h: 1.8 },
  amp: { label: 'Ampli instrument', w: 0.7, h: 0.4 },
  keys: { label: 'Clavier', w: 1.4, h: 0.5 },
  power: { label: '220 V', w: 0.35, h: 0.25 },
  label: { label: 'Texte', w: 1.6, h: 0.4 },
}

export const DEFAULT_STAGE: StagePlot = { width: 10, depth: 8, items: [] }
export const stageOf = (p: Project): StagePlot => ({ ...DEFAULT_STAGE, ...p.stage, items: p.stage?.items ?? [] })
