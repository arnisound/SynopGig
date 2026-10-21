import type { ConnectorType, Port, SignalType } from '../types.ts'

export const SIGNALS: Record<SignalType, { label: string; color: string }> = {
  'audio-analog': { label: 'Audio analogique', color: '#e5484d' },
  'audio-digital': { label: 'Audio numérique (AES/MADI)', color: '#f76b15' },
  speaker: { label: 'HP (puissance)', color: '#ffc53d' },
  dmx: { label: 'DMX', color: '#46a758' },
  network: { label: 'Réseau (Dante / Art-Net / sACN)', color: '#0090ff' },
  video: { label: 'Vidéo', color: '#8e4ec6' },
  power: { label: 'Énergie', color: '#8b8d98' },
  rf: { label: 'HF (antenne)', color: '#12a594' },
  control: { label: 'Contrôle (MIDI, GPIO, série)', color: '#d6409f' },
}

export const CONNECTORS: Record<ConnectorType, string> = {
  xlr3: 'XLR 3 pts',
  xlr5: 'XLR 5 pts',
  jack: 'Jack 6.35',
  speakon: 'Speakon NL4',
  rj45: 'RJ45',
  ethercon: 'etherCON',
  opticalcon: 'opticalCON',
  hdmi: 'HDMI',
  sdi: 'BNC SDI',
  powercon: 'powerCON',
  'powercon-true1': 'powerCON TRUE1',
  schuko: 'Schuko 16A',
  'p17-16a': 'P17 16A mono',
  'p17-32a': 'P17 32A tri',
  socapex: 'Socapex 19 pts',
  speakon8: 'Speakon NL8',
  iec: 'IEC C14',
  'p17-63a': 'P17 63A tri',
  usb: 'USB',
  bnc: 'BNC (HF 50 Ω)',
  ntype: 'N (HF)',
  dc: 'Alim DC (bloc)',
  minijack: 'Mini-jack 3,5',
  rmp54: 'RMP 54 pts (multipaire 16 voies)',
  'xlr-combo': 'Combo XLR / jack',
  xlr4: 'XLR 4 pts',
  'mini-xlr': 'Mini-XLR (TA3 / TA4 / TA5)',
  rca: 'RCA (cinch)',
  toslink: 'Optique Toslink / ADAT',
  midi: 'DIN 5 (MIDI)',
  euroblock: 'Bornier Euroblock / Phoenix',
  'binding-post': 'Bornes HP (banane / à vis)',
  db9: 'Sub-D 9 (RS-232 / RS-422)',
  db25: 'Sub-D 25 (DB25, 8 voies)',
  displayport: 'DisplayPort',
  dvi: 'DVI',
  vga: 'VGA (HD-15)',
  'usb-c': 'USB-C',
  'lc-fiber': 'Fibre LC duplex',
  'smpte-fiber': 'Fibre SMPTE 311 (caméra)',
}

/** Connectors that physically mate together without an adapter. */
const MATING: ConnectorType[][] = [
  ['rj45', 'ethercon'],
  ['powercon-true1'],
  // A combo socket takes either an XLR or a jack plug.
  ['xlr-combo', 'xlr3'],
  ['xlr-combo', 'jack'],
]

function mates(a: ConnectorType, b: ConnectorType) {
  if (a === b) return true
  return MATING.some((g) => g.includes(a) && g.includes(b))
}

export type Severity = 'danger' | 'warning'

export interface Issue {
  severity: Severity
  message: string
}

/**
 * Checks a link between two ports. Problems are reported, never blocking:
 * on a gig, the technician keeps the last word.
 */
export function checkLink(from: Port | undefined, to: Port | undefined): Issue[] {
  if (!from || !to) return [{ severity: 'danger', message: 'Port introuvable' }]
  const issues: Issue[] = []

  if (from.signal !== to.signal) {
    const speakerMix = from.signal === 'speaker' || to.signal === 'speaker'
    const powerMix = from.signal === 'power' || to.signal === 'power'
    issues.push({
      severity: speakerMix || powerMix ? 'danger' : 'warning',
      message: speakerMix
        ? `Sortie HP vers ${SIGNALS[to.signal].label} : risque de destruction du matériel`
        : powerMix
          ? 'Énergie mélangée avec un signal : danger électrique'
          : `Signal incompatible : ${SIGNALS[from.signal].label} → ${SIGNALS[to.signal].label}`,
    })
  }

  if (!mates(from.connector, to.connector)) {
    issues.push({
      severity: 'warning',
      message: `Adaptateur nécessaire : ${CONNECTORS[from.connector]} → ${CONNECTORS[to.connector]}`,
    })
  }

  if (from.dir === 'in' && to.dir === 'in') {
    issues.push({ severity: 'warning', message: 'Entrée reliée à une entrée' })
  }
  if (from.dir === 'out' && to.dir === 'out') {
    issues.push({
      severity: from.signal === 'speaker' || from.signal === 'power' ? 'danger' : 'warning',
      message: 'Sortie reliée à une sortie',
    })
  }

  return issues
}
