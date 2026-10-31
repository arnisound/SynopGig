import type { SignalType } from '../types'

/*
 * The nature of a cable, from the signal it carries: it names the cable
 * (AUD-001, LUM-004…) and makes the synoptic's layers. A Dante line is an
 * audio cable, an Art-Net line a lighting one: the layer follows the
 * department that uses it, not the connector.
 */

export type CableFamily = 'audio' | 'video' | 'light' | 'network' | 'power' | 'control'

export const FAMILIES: Record<CableFamily, { label: string; prefix: string; color: string }> = {
  audio: { label: 'Audio', prefix: 'AUD', color: '#e5484d' },
  video: { label: 'Vidéo', prefix: 'VID', color: '#8e4ec6' },
  light: { label: 'Lumière', prefix: 'LUM', color: '#46a758' },
  network: { label: 'Réseau', prefix: 'RES', color: '#0090ff' },
  power: { label: 'Électrique', prefix: 'ELE', color: '#8b8d98' },
  control: { label: 'Contrôle', prefix: 'CTL', color: '#d6409f' },
}

export const FAMILY_ORDER = Object.keys(FAMILIES) as CableFamily[]

const OF_SIGNAL: Record<SignalType, CableFamily> = {
  'audio-analog': 'audio',
  'audio-digital': 'audio',
  'audio-link': 'audio',
  speaker: 'audio',
  dante: 'audio',
  avb: 'audio',
  intercom: 'audio',
  rf: 'audio',
  dmx: 'light',
  artnet: 'light',
  video: 'video',
  ndi: 'video',
  network: 'network',
  'control-ip': 'network',
  power: 'power',
  sync: 'control',
  control: 'control',
}

export const familyOf = (signal?: SignalType): CableFamily | undefined => (signal ? OF_SIGNAL[signal] : undefined)

/** The signals of a family, for showing or hiding its layer. */
export const signalsOf = (f: CableFamily) => (Object.keys(OF_SIGNAL) as SignalType[]).filter((s) => OF_SIGNAL[s] === f)

/** Tag prefix of a cable carrying this signal; CAB when its nature is unknown. */
export const prefixOf = (signal?: SignalType) => {
  const f = familyOf(signal)
  return f ? FAMILIES[f].prefix : 'CAB'
}
