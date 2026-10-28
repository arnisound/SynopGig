import type { DeviceTemplate } from '../types'
import { CATALOG } from './catalog'
import { refineSignal } from './connectors'
import { PANEL_TEMPLATES } from './panels'
import { port, series } from './ports'

const POWER_IN = port('pwr', 'Secteur', 'powercon-true1', 'power', 'in')

const GENERIC: DeviceTemplate[] = [
  // ---- Son
  {
    id: 'mic',
    model: 'Micro dynamique',
    category: 'Son',
    weight: 0.3,
    ports: [port('out', 'Sortie', 'xlr3', 'audio-analog', 'out')],
  },
  {
    id: 'di',
    model: 'DI active',
    category: 'Son',
    weight: 0.6,
    ports: [
      port('in', 'Entrée', 'jack', 'audio-analog', 'in'),
      port('thru', 'Thru', 'jack', 'audio-analog', 'out'),
      port('out', 'Sortie sym.', 'xlr3', 'audio-analog', 'out'),
    ],
  },
  {
    id: 'stagebox-16-8',
    model: 'Stagebox Dante 16/8',
    category: 'Son',
    rackU: 3,
    weight: 6,
    ports: [
      ...series('in', 'Mic', 16, 'xlr3', 'audio-analog', 'in'),
      ...series('out', 'Out', 8, 'xlr3', 'audio-analog', 'out'),
      port('pri', 'Dante primaire', 'ethercon', 'network', 'io'),
      port('sec', 'Dante secondaire', 'ethercon', 'network', 'io'),
      POWER_IN,
    ],
  },
  {
    id: 'console-num',
    model: 'Console numérique 48 voies',
    category: 'Son',
    weight: 25,
    ports: [
      ...series('in', 'Local in', 8, 'xlr3', 'audio-analog', 'in'),
      ...series('out', 'Local out', 8, 'xlr3', 'audio-analog', 'out'),
      port('aes', 'AES out', 'xlr3', 'audio-digital', 'out'),
      port('pri', 'Dante primaire', 'ethercon', 'network', 'io'),
      port('sec', 'Dante secondaire', 'ethercon', 'network', 'io'),
      port('ctl', 'Réseau contrôle', 'ethercon', 'network', 'io'),
      POWER_IN,
    ],
  },
  {
    id: 'processor',
    model: 'Processeur / matrice 4×8',
    category: 'Son',
    rackU: 1,
    weight: 4,
    ports: [
      ...series('in', 'In', 4, 'xlr3', 'audio-analog', 'in'),
      port('aes', 'AES in', 'xlr3', 'audio-digital', 'in'),
      ...series('out', 'Out', 8, 'xlr3', 'audio-analog', 'out'),
      port('net', 'Réseau', 'ethercon', 'network', 'io'),
      POWER_IN,
    ],
  },
  {
    id: 'amp-4ch',
    model: 'Ampli 4 canaux',
    category: 'Son',
    rackU: 2,
    weight: 13,
    ports: [
      ...series('in', 'In', 4, 'xlr3', 'audio-analog', 'in'),
      port('net', 'Réseau', 'ethercon', 'network', 'io'),
      ...series('hp', 'HP', 4, 'speakon', 'speaker', 'out'),
      POWER_IN,
    ],
  },
  {
    id: 'speaker-passive',
    model: 'Enceinte passive',
    category: 'Son',
    weight: 22,
    ports: [
      port('in', 'Entrée HP', 'speakon', 'speaker', 'in'),
      port('link', 'Link HP', 'speakon', 'speaker', 'out'),
    ],
  },
  {
    id: 'sub-passive',
    model: 'Sub passif',
    category: 'Son',
    weight: 55,
    ports: [
      port('in', 'Entrée HP', 'speakon', 'speaker', 'in'),
      port('link', 'Link HP', 'speakon', 'speaker', 'out'),
    ],
  },
  {
    id: 'wedge-active',
    model: 'Retour actif',
    category: 'Son',
    weight: 18,
    ports: [
      port('in', 'Entrée', 'xlr3', 'audio-analog', 'in'),
      port('thru', 'Thru', 'xlr3', 'audio-analog', 'out'),
      POWER_IN,
      port('pwr-out', 'Recopie secteur', 'powercon-true1', 'power', 'out'),
    ],
  },
  {
    id: 'hf-receiver',
    model: 'Récepteur HF double',
    category: 'Son',
    rackU: 1,
    weight: 3,
    ports: [
      ...series('out', 'Sortie', 2, 'xlr3', 'audio-analog', 'out'),
      port('net', 'Réseau', 'rj45', 'network', 'io'),
      POWER_IN,
    ],
  },
  // ---- Lumière
  {
    id: 'light-desk',
    model: 'Console lumière',
    category: 'Lumière',
    weight: 15,
    ports: [
      port('dmxA', 'DMX A', 'xlr5', 'dmx', 'out'),
      port('dmxB', 'DMX B', 'xlr5', 'dmx', 'out'),
      port('net', 'Art-Net / sACN', 'ethercon', 'network', 'io'),
      POWER_IN,
    ],
  },
  {
    id: 'node-dmx',
    model: 'Node Art-Net 4 univers',
    category: 'Lumière',
    rackU: 1,
    weight: 2,
    ports: [
      port('net', 'Réseau', 'ethercon', 'network', 'io'),
      ...series('dmx', 'DMX', 4, 'xlr5', 'dmx', 'out'),
      POWER_IN,
    ],
  },
  {
    id: 'splitter-dmx',
    model: 'Splitter DMX 1→6',
    category: 'Lumière',
    rackU: 1,
    weight: 2,
    ports: [
      port('in', 'DMX in', 'xlr5', 'dmx', 'in'),
      port('thru', 'DMX thru', 'xlr5', 'dmx', 'out'),
      ...series('out', 'DMX out', 6, 'xlr5', 'dmx', 'out'),
      POWER_IN,
    ],
  },
  {
    id: 'spot-lyre',
    model: 'Lyre spot',
    category: 'Lumière',
    weight: 24,
    ports: [
      port('dmxIn', 'DMX in', 'xlr5', 'dmx', 'in'),
      port('dmxOut', 'DMX out', 'xlr5', 'dmx', 'out'),
      POWER_IN,
      port('pwr-out', 'Recopie secteur', 'powercon-true1', 'power', 'out'),
    ],
  },
  {
    id: 'par-led',
    model: 'PAR LED',
    category: 'Lumière',
    weight: 4,
    ports: [
      port('dmxIn', 'DMX in', 'xlr5', 'dmx', 'in'),
      port('dmxOut', 'DMX out', 'xlr5', 'dmx', 'out'),
      POWER_IN,
      port('pwr-out', 'Recopie secteur', 'powercon-true1', 'power', 'out'),
    ],
  },
  {
    id: 'dimmer-6',
    model: 'Gradateur 6 × 2,3 kW',
    category: 'Lumière',
    rackU: 3,
    weight: 12,
    ports: [
      port('dmxIn', 'DMX in', 'xlr5', 'dmx', 'in'),
      port('dmxOut', 'DMX out', 'xlr5', 'dmx', 'out'),
      port('pwr', 'Alim tri', 'p17-32a', 'power', 'in'),
      port('soca', 'Sortie Socapex', 'socapex', 'power', 'out'),
    ],
  },
  // ---- Vidéo
  {
    id: 'camera',
    model: 'Caméra',
    category: 'Vidéo',
    weight: 3,
    ports: [port('sdi', 'SDI out', 'sdi', 'video', 'out'), POWER_IN],
  },
  {
    id: 'video-mixer',
    model: 'Mélangeur vidéo 4 entrées',
    category: 'Vidéo',
    rackU: 1,
    weight: 3,
    ports: [
      ...series('in', 'SDI in', 4, 'sdi', 'video', 'in'),
      port('pgm', 'Programme', 'sdi', 'video', 'out'),
      port('mv', 'Multiview', 'hdmi', 'video', 'out'),
      port('net', 'Contrôle', 'rj45', 'network', 'io'),
      POWER_IN,
    ],
  },
  {
    id: 'projector',
    model: 'Vidéoprojecteur',
    category: 'Vidéo',
    weight: 20,
    ports: [
      port('sdi', 'SDI in', 'sdi', 'video', 'in'),
      port('hdmi', 'HDMI in', 'hdmi', 'video', 'in'),
      port('net', 'Contrôle', 'rj45', 'network', 'io'),
      POWER_IN,
    ],
  },
  {
    id: 'screen',
    model: 'Écran de contrôle',
    category: 'Vidéo',
    weight: 5,
    ports: [port('hdmi', 'HDMI in', 'hdmi', 'video', 'in'), POWER_IN],
  },
  // ---- Réseau
  {
    id: 'switch-8',
    model: 'Switch réseau 8 ports',
    category: 'Réseau',
    rackU: 1,
    weight: 2,
    ports: [...series('p', 'Port', 8, 'ethercon', 'network', 'io'), POWER_IN],
  },
  {
    id: 'switch-fiber',
    model: 'Switch 8 ports + fibre',
    category: 'Réseau',
    rackU: 1,
    weight: 3,
    ports: [
      ...series('p', 'Port', 8, 'ethercon', 'network', 'io'),
      ...series('sfp', 'Fibre', 2, 'opticalcon', 'network', 'io'),
      POWER_IN,
    ],
  },
  {
    id: 'laptop',
    model: 'Ordinateur portable',
    category: 'Réseau',
    weight: 2,
    ports: [
      port('net', 'Ethernet', 'rj45', 'network', 'io'),
      port('hdmi', 'HDMI out', 'hdmi', 'video', 'out'),
    ],
  },
  // ---- Énergie
  {
    id: 'distro-32',
    model: 'Armoire de distribution 32A tri',
    category: 'Énergie',
    weight: 20,
    ports: [
      port('in', 'Arrivée P17 32A', 'p17-32a', 'power', 'in'),
      ...series('p16', 'P17 16A', 3, 'p17-16a', 'power', 'out'),
      ...series('sch', 'Schuko', 6, 'schuko', 'power', 'out'),
    ],
  },
  {
    id: 'multiprise',
    model: 'Multiprise / triplette',
    category: 'Énergie',
    weight: 1,
    ports: [
      port('in', 'Entrée', 'schuko', 'power', 'in'),
      ...series('out', 'Sortie', 3, 'powercon-true1', 'power', 'out'),
    ],
  },
  {
    id: 'rack-power-1u',
    model: 'Distribution secteur rack 1U',
    category: 'Énergie',
    rackU: 1,
    weight: 2,
    ports: [
      port('in', 'Entrée', 'powercon-true1', 'power', 'in'),
      port('thru', 'Recopie', 'powercon-true1', 'power', 'out'),
      ...series('out', 'Sortie TRUE1', 4, 'powercon-true1', 'power', 'out'),
      ...series('iec', 'Sortie IEC', 4, 'iec', 'power', 'out'),
    ],
  },
]

const GENERIC_FAMILY: Record<string, string> = {
  mic: 'Micros filaires',
  di: 'DI',
  'stagebox-16-8': 'Stageboxes & moteurs',
  'console-num': 'Consoles',
  processor: 'Processeurs',
  'amp-4ch': 'Amplis',
  'speaker-passive': 'Enceintes',
  'sub-passive': 'Subs',
  'wedge-active': 'Retours',
  'hf-receiver': 'HF — récepteurs',
  'light-desk': 'Consoles lumière',
  'node-dmx': 'Nodes & splitters DMX',
  'splitter-dmx': 'Nodes & splitters DMX',
  'spot-lyre': 'Lyres spot / profile',
  'par-led': 'Barres & PAR LED',
  'dimmer-6': 'Gradateurs',
  camera: 'Caméras',
  'video-mixer': 'Mélangeurs',
  projector: 'Vidéoprojecteurs',
  screen: 'LED',
  'switch-8': 'Switchs',
  'switch-fiber': 'Switchs PoE & fibre',
  laptop: 'Ordinateurs & serveurs',
  'distro-32': 'Distribution',
  multiprise: 'Distribution',
  'rack-power-1u': 'Distribution',
}

/** Ports of the catalogue with what they really carry (Dante, AES50…) rather than "network". */
const refined = (t: DeviceTemplate): DeviceTemplate => (t.panel ? t : { ...t, ports: t.ports.map((p) => ({ ...p, signal: refineSignal(p) })) })

/** Generic models first, then patch panels and the brand catalogue. */
export const LIBRARY: DeviceTemplate[] = [
  ...GENERIC.map((t) => ({ ...t, family: GENERIC_FAMILY[t.id] })),
  ...PANEL_TEMPLATES.map((t) => ({ ...t, family: 'Bandeaux de câblage' })),
  ...CATALOG,
].map(refined)

export const CATEGORY_COLORS: Record<string, string> = {
  Son: '#e5484d',
  Lumière: '#46a758',
  Vidéo: '#8e4ec6',
  Réseau: '#0090ff',
  Énergie: '#8b8d98',
  Câblage: '#d6409f',
  Autre: '#ad7f58',
}

export const ZONES = ['Plateau', 'Régie FOH', 'Coulisses', 'Grill', 'Façade', 'Retours']

/** Families in alphabetical order. */
export const FAMILY_ORDER = [...new Set([...CATALOG.map((t) => t.family).filter((f) => f !== undefined), 'Bandeaux de câblage'])].sort((a, b) =>
  a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true }),
)
