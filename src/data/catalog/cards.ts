import { A, AES, AVB, NET, SYNC, dante, link, madi, opt, port, series } from '../catalogKit'

/*
 * Option cards, by console family: fitted on a device from the inspector
 * (Ports tab), their sockets then appear on the synoptic.
 */

const sg = (label = 'Waves SoundGrid') => series('sg', label, 2, 'ethercon', NET, 'io')
const madiBnc = () => madi('sdi')
const db25 = (id: string, label: string, n: number, signal = A, dir: 'in' | 'out' | 'io' = 'io') => series(id, label, n, 'db25', signal, dir)

/** dLive and Avantis I/O ports. */
export const DLIVE_CARDS = [
  opt('dante64', 'Carte Dante 64×64', dante()),
  opt('dante128', 'Carte Dante 128×128', dante()),
  opt('madi', 'Carte MADI (BNC)', madiBnc()),
  opt('gigaace', 'Carte gigaACE', link('gace', 'gigaACE', 2)),
  opt('fibreace', 'Carte fibreACE', link('face', 'fibreACE', 2, 'opticalcon')),
  opt('dx', 'Carte DX Link', link('dx', 'DX', 2)),
  opt('supermac', 'Carte SuperMAC (AES50)', link('aes50', 'AES50', 2)),
  opt('waves', 'Carte Waves v4', sg()),
]

/** SQ option slot. */
export const SQ_CARDS = [
  opt('dante', 'Carte SQ Dante 64×64', dante()),
  opt('slink', 'Carte SLink', link('slink2', 'SLink 2')),
  opt('waves', 'Carte SQ Waves v3', sg()),
]

/** X32 / M32 card slot (the USB card comes fitted). */
const xCards = (prefix: 'X' | 'DN32') => [
  opt('dante', prefix === 'X' ? 'Carte X-DANTE' : 'Carte DN32-DANTE', dante()),
  opt('madi', prefix === 'X' ? 'Carte X-MADI' : 'Carte DN32-MADI', [...madiBnc(), port('madiOpt', 'MADI optique', 'sfp', AES, 'io')]),
  opt('live', prefix === 'X' ? 'Carte X-LIVE (SD + USB)' : 'Carte DN32-LIVE (SD + USB)', [port('usbLive', 'USB audio 32×32', 'usb', AES, 'io')]),
  opt('adat', prefix === 'X' ? 'Carte X-ADAT' : 'Carte DN32-ADAT', [...series('adatIn', 'ADAT in', 4, 'toslink', AES, 'in'), ...series('adatOut', 'ADAT out', 4, 'toslink', AES, 'out')]),
  opt('wsg', prefix === 'X' ? 'Carte X-WSG (Waves)' : 'Carte DN32-WSG (Waves)', sg()),
]
export const X32_CARDS = xCards('X')
export const M32_CARDS = xCards('DN32')

export const WING_CARDS = [opt('dante', 'Carte WING-DANTE', dante()), opt('wsg', 'Carte WING-WSG (Waves)', sg())]

/** Yamaha TF: NY64-D slot. */
export const TF_CARDS = [opt('ny64d', 'Carte NY64-D (Dante)', dante())]

/** Yamaha CL / QL: MY slots. */
export const MY_CARDS = [
  opt('aud2', 'Carte MY16-AUD2 (Dante)', dante()),
  opt('md64', 'Carte MY16-MD64 (MADI)', [...madiBnc(), port('madiOpt', 'MADI optique', 'sfp', AES, 'io')]),
  opt('ae96s', 'Carte MY8-AE96S (AES/EBU)', db25('ae', 'AES/EBU', 1, AES)),
  opt('ad96', 'Carte MY8-AD96 (8 entrées analogiques)', db25('ad', 'Entrées 1-8', 1, A, 'in')),
  opt('da96', 'Carte MY8-DA96 (8 sorties analogiques)', db25('da', 'Sorties 1-8', 1, A, 'out')),
  opt('waves', 'Carte Waves MY-WAVES3', sg()),
]

/** Yamaha DM7: PY slot. */
export const PY_CARDS = [
  opt('py64d', 'Carte PY64-D (Dante)', dante()),
  opt('py64md', 'Carte PY64-MD (MADI)', madiBnc()),
  opt('py64ae', 'Carte PY64-AE (AES/EBU)', db25('ae', 'AES/EBU', 4, AES)),
]

/** Yamaha RIVAGE PM: HY slots. */
export const HY_CARDS = [
  opt('hy144d', 'Carte HY144-D-SRC (Dante)', dante()),
  opt('hy256tl', 'Carte HY256-TL (TWINLANe)', link('twin', 'TWINLANe', 2, 'opticalcon')),
  opt('hy128md', 'Carte HY128-MD (MADI)', madiBnc()),
]

/** DiGiCo DMI slots. */
export const DMI_CARDS = [
  opt('madi', 'Carte DMI-MADI-B (BNC)', madiBnc()),
  opt('dante', 'Carte DMI-DANTE64', dante()),
  opt('mic', 'Carte DMI-MIC (8 entrées micro)', db25('mic', 'Entrées micro 1-8', 1, A, 'in')),
  opt('aes', 'Carte DMI-AES (8 entrées, 8 sorties)', db25('aes', 'AES/EBU', 2, AES)),
  opt('waves', 'Carte DMI-WAVES', sg()),
  opt('opto', 'Carte DMI-OPTO (Optocore)', link('opto', 'Optocore', 2, 'opticalcon')),
]

/** Soundcraft Si option slot. */
export const SI_CARDS = [
  opt('dante', 'Carte Dante', dante()),
  opt('madi', 'Carte MADI (optique)', [port('madiOpt', 'MADI optique', 'opticalcon', AES, 'io')]),
  opt('usb', 'Carte USB', [port('usbCard', 'USB audio', 'usb', AES, 'io')]),
]

/** Midas HD96 CM-1 slots. */
export const CM1_CARDS = [opt('dante', 'Module Dante', dante()), opt('madi', 'Module MADI', madiBnc()), opt('aes50', 'Module AES50', link('aes50', 'AES50', 2))]

/** Avid S6L engine: AVB cards. */
export const AVB_CARDS = [opt('avb192', 'Carte AVB-192', series('avb', 'AVB', 2, 'ethercon', AVB, 'io'))]

/** Allen & Heath ME personal mixing, PreSonus... no slot. Word clock card where it exists. */
export const WCLK_CARD = [opt('wclk', 'Carte word clock', [port('wcIn', 'Word clock in', 'sdi', SYNC, 'in'), port('wcOut', 'Word clock out', 'sdi', SYNC, 'out')])]
