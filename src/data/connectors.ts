import type { ConnectorType, Port, SignalType } from '../types.ts'

/**
 * What travels on a port. A network cable carries many things: the IP
 * signals (ip: true) all go through the same switches and can share a
 * network, so they are compatible with each other and with plain "Réseau IP".
 */
export const SIGNALS: Record<SignalType, { label: string; color: string; ip?: boolean }> = {
  'audio-analog': { label: 'Audio analogique', color: '#e5484d' },
  'audio-digital': { label: 'Audio numérique (AES3, MADI, ADAT)', color: '#f76b15' },
  'audio-link': { label: 'Liaison audio propriétaire (AES50, Optocore, SuperMAC…)', color: '#c2410c' },
  speaker: { label: 'HP (puissance)', color: '#ffc53d' },
  dmx: { label: 'DMX', color: '#46a758' },
  network: { label: 'Réseau IP (données)', color: '#0090ff', ip: true },
  dante: { label: 'Dante / AES67 (audio sur IP)', color: '#3358d4', ip: true },
  avb: { label: 'AVB / Milan (audio sur IP)', color: '#00a2c7', ip: true },
  artnet: { label: 'Art-Net / sACN (lumière sur IP)', color: '#29a383', ip: true },
  ndi: { label: 'Vidéo sur IP (NDI, SMPTE 2110)', color: '#ab4aba', ip: true },
  'control-ip': { label: 'Contrôle IP (OSC, appli, télécommande)', color: '#e93d82', ip: true },
  video: { label: 'Vidéo', color: '#8e4ec6' },
  sync: { label: 'Synchro (word clock, timecode, genlock)', color: '#978365' },
  intercom: { label: 'Intercom', color: '#5eb1ef' },
  power: { label: 'Énergie', color: '#8b8d98' },
  rf: { label: 'HF (antenne)', color: '#12a594' },
  control: { label: 'Contrôle (MIDI, GPIO, série)', color: '#d6409f' },
}

/** Two signals that can meet on a cable: the same one, or two that both travel over IP. */
export const sameSignal = (a: SignalType, b: SignalType) => a === b || (!!SIGNALS[a].ip && !!SIGNALS[b].ip)

const byLabel = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true })

/** Alphabetical lists for the menus. */
export const SIGNAL_OPTIONS = (Object.keys(SIGNALS) as SignalType[]).sort((a, b) => byLabel(SIGNALS[a].label, SIGNALS[b].label))

/**
 * What a port named "Dante primaire" or "AES50" really carries, for ports
 * of the catalogue still marked with the general network or digital signal.
 */
export function refineSignal(port: Port): SignalType {
  const l = port.label
  if (port.signal === 'network') {
    if (/dante|aes67/i.test(l)) return 'dante'
    if (/\bavb\b|milan/i.test(l)) return 'avb'
    if (/art-?net|sacn|dmx/i.test(l)) return 'artnet'
    if (/\bndi\b|2110|vid[ée]o ip/i.test(l)) return 'ndi'
    if (/contr[ôo]le|control|osc\b|t[ée]l[ée]commande|remote|\boca\b|l-net|r1\b|ipmi|administration/i.test(l)) return 'control-ip'
    if (/ethersound/i.test(l)) return 'audio-link'
  }
  if (port.signal === 'audio-digital') {
    if (/aes50|optocore|supermac|twinlane|gigaace|dsnake|slink|ultranet|liaison/i.test(l)) return 'audio-link'
    if (/word ?clock|wclk/i.test(l)) return 'sync'
  }
  return port.signal
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
  sdi: 'BNC 75 Ω (SDI, MADI, word clock)',
  powercon: 'powerCON',
  'powercon-true1': 'powerCON TRUE1',
  schuko: 'Schuko 16A',
  'p17-16a': 'P17 16A mono',
  'p17-32a': 'P17 32A tri',
  socapex: 'Socapex 19 pts',
  speakon8: 'Speakon NL8',
  iec: 'IEC C14',
  'p17-63a': 'P17 63A tri',
  'p17-125a': 'P17 125A tri',
  microdot: 'MicroDot (DPA)',
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
  sfp: 'Cage SFP / SFP+ (module fibre)',
  lemo3: 'Lemo 3 broches (émetteur HF)',
  'ca-com': 'CA-COM 19 pts (L-Acoustics)',
  harting: 'Multibroche Harting',
  'p17-32a-mono': 'P17 32A mono',
  'p17-16a-tri': 'P17 16A tri',
}

/** Connectors that physically mate together without an adapter. */
const MATING: ConnectorType[][] = [
  ['rj45', 'ethercon'],
  ['powercon-true1'],
  // A combo socket takes either an XLR or a jack plug.
  ['xlr-combo', 'xlr3'],
  ['xlr-combo', 'jack'],
  // A fibre with LC plugs goes into the SFP module of the cage.
  ['sfp', 'lc-fiber'],
]

function mates(a: ConnectorType, b: ConnectorType) {
  if (a === b) return true
  return MATING.some((g) => g.includes(a) && g.includes(b))
}

/**
 * Single-phase 16 A sockets and appliance inlets: a power cord joins any
 * two of them (Schuko → IEC, TRUE1 → IEC, P17 16A → Schuko…), no adapter.
 */
const CORD = new Set<ConnectorType>(['schuko', 'p17-16a', 'powercon-true1', 'iec'])
export const isCord = (from: Port, to: Port) => from.signal === 'power' && to.signal === 'power' && CORD.has(from.connector) && CORD.has(to.connector)

/** The fastest SDI a port takes, read from its name ("12G-SDI in", "3G-SDI out"). */
const sdiSpeed = (p: Port) => (p.connector === 'sdi' && p.signal === 'video' ? Number(/(\d+)G-SDI/i.exec(p.label)?.[1] ?? 0) : 0)

/** Longest run, in metres, before a video signal needs a booster or a fibre. */
const MAX_RUN: Partial<Record<ConnectorType, [number, string]>> = { hdmi: [15, 'HDMI'], displayport: [5, 'DisplayPort'], usb: [5, 'USB'], 'usb-c': [3, 'USB-C'] }

/** Checks that depend on the cable itself: its length against what the signal carries. */
export function checkRun(from: Port | undefined, to: Port | undefined, length?: number): Issue[] {
  if (!from || !to || !length) return []
  const issues: Issue[] = []
  const run = MAX_RUN[from.connector] ?? MAX_RUN[to.connector]
  if (run && length > run[0]) issues.push({ severity: 'warning', message: `${run[1]} sur ${length} m : au-delà de ${run[0]} m, prévoir un câble actif, un extendeur ou une fibre` })
  const sdi = Math.max(sdiSpeed(from), sdiSpeed(to))
  const reach = sdi >= 12 ? 70 : sdi >= 6 ? 100 : sdi >= 3 ? 120 : 0
  if (from.connector === 'sdi' && from.signal === 'video' && reach && length > reach) issues.push({ severity: 'warning', message: `${sdi}G-SDI sur ${length} m : portée d’environ ${reach} m en coaxial, prévoir une fibre ou un répéteur` })
  if (to.connector === 'ethercon' || to.connector === 'rj45' || from.connector === 'rj45' || from.connector === 'ethercon')
    if (length > 100 && (from.signal !== 'video' || from.connector !== 'ethercon')) issues.push({ severity: 'warning', message: `Ethernet cuivre sur ${length} m : 100 m au plus, prévoir une fibre` })
  return issues
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

  if (!sameSignal(from.signal, to.signal)) {
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

  // SDI: a 12G output into a 3G input only passes if the source is set to 3G (1080p).
  const [out, inn] = [sdiSpeed(from), sdiSpeed(to)]
  if (out && inn && out > inn) issues.push({ severity: 'warning', message: `Sortie ${out}G-SDI vers une entrée ${inn}G-SDI : régler la source en ${inn}G (1080p au plus)` })

  if (!mates(from.connector, to.connector) && !isCord(from, to)) {
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

/** Connectors in alphabetical order, for the menus. */
export const CONNECTOR_OPTIONS = (Object.keys(CONNECTORS) as ConnectorType[]).sort((a, b) => byLabel(CONNECTORS[a], CONNECTORS[b]))
