import type { DeviceTemplate } from '../../types'
import { A, AES, AVB, CIP, LINK, SYNC, aesIn, aesOut, ctl, dante, dc, dev, family, footswitch, gpio, iec, link, madi, mainLR, midi, phones, port, run, stereoIns, stereoOuts, talkback, usbAudio, wclk } from '../catalogKit'
import { CM1_CARDS, DLIVE_CARDS, DMI_CARDS, HY_CARDS, M32_CARDS, MY_CARDS, PY_CARDS, SI_CARDS, SQ_CARDS, TF_CARDS, WING_CARDS, X32_CARDS } from './cards'

/*
 * Mixing consoles, built like the AI reading of a data sheet: every
 * physical socket, rear panel first then front, the protocol of each one,
 * a short description, the characteristics, and the cards that can be
 * fitted (Ports tab of the inspector).
 */

const mix = (ch: string, bus: string, fs = '96') => [
  ['Audio', 'Canaux d’entrée', ch] as [string, string, string],
  ['Audio', 'Bus de mixage', bus] as [string, string, string],
  ['Audio', 'Fréquence d’échantillonnage', fs, 'kHz'] as [string, string, string, string],
]
const mic = (n: number, start = 1, c: 'xlr3' | 'xlr-combo' = 'xlr3', label = 'Mic') => run('in', label, n, c, A, 'in', start)
const out = (n: number, label = 'Out', c: 'xlr3' | 'jack' = 'xlr3', id = 'out', start = 1) => run(id, label, n, c, A, 'out', start)
const line = (n: number, label = 'Line', start = 1, id = 'line') => run(id, label, n, 'jack', A, 'in', start)
const usbRec = (label = 'USB (enregistrement)') => port('usbRec', label, 'usb', AES, 'io')

/** X32 / M32 rear panel: local XLR I/O, aux, AES50 A/B, Ultranet, MIDI, remote, AES out, card. */
const xRear = (mics: number, outs: number) => [
  ...mic(mics),
  ...out(outs),
  ...run('auxIn', 'Aux in', 6, 'jack', A, 'in'),
  ...run('auxOut', 'Aux out', 6, 'jack', A, 'out'),
  ...link('aes50', 'AES50', 2),
  port('ultranet', 'Ultranet (P16)', 'rj45', LINK, 'out'),
  ...aesOut(1),
  ...midi(),
  ctl('Remote'),
  usbAudio('USB audio (carte X-USB / DN32-USB)'),
  iec(),
]

export const CONSOLES: DeviceTemplate[] = family('Consoles', [
  // ---- Allen & Heath
  dev('ah-avantis', 'Allen & Heath', 'Avantis', 'Son', { kg: 26, w: 120, v: '100-240 V', d: 'Console numérique 64 voies / 42 bus avec deux écrans tactiles Full HD, moteur XCVI du dLive ; I/O de scène via SLink ou cartes d’extension.', x: mix('64', '42'), opt: DLIVE_CARDS }, [
    ...mic(12), ...out(12), ...aesIn(1), ...aesOut(2), ...link('slink', 'SLink'), ctl('Réseau'), port('usb', 'USB (enregistrement)', 'usb', AES, 'io'), iec(), phones(),
  ]),
  dev('ah-avantis-solo', 'Allen & Heath', 'Avantis Solo', 'Son', { kg: 22, v: '100-240 V', d: 'Version un écran de l’Avantis : 64 voies / 42 bus, même moteur 96 kHz, I/O de scène via SLink ou cartes.', x: mix('64', '42'), opt: DLIVE_CARDS }, [
    ...mic(6), ...out(6), ...aesIn(1), ...aesOut(1), ...wclk(), ...link('slink', 'SLink'), ctl('Réseau'), port('usb', 'USB (enregistrement)', 'usb', AES, 'io'), iec(), phones(),
  ]),
  dev('ah-cq12t', 'Allen & Heath', 'CQ-12T', 'Son', { kg: 2.8, v: '12 V DC (bloc secteur fourni)', d: 'Petite console numérique à écran tactile 7″ pour petits groupes et conférences, avec Bluetooth et enregistrement SD/USB.', x: mix('12', '6', '96') }, [
    ...mic(5), ...mic(5, 6, 'xlr-combo', 'In'), ...stereoIns(1, 'St'), ...mainLR(), ...out(6, 'Out', 'jack'), ctl('Réseau'), usbRec('USB-B (audio)'), dc('Alim 12 V DC'), phones(), port('usbA', 'USB-A (clé)', 'usb', AES, 'io'),
  ]),
  dev('ah-cq18t', 'Allen & Heath', 'CQ-18T', 'Son', { kg: 3.6, v: '12 V DC (bloc secteur fourni)', d: 'Console numérique 18 entrées à écran tactile 10″, enregistrement multipiste USB et Bluetooth.', x: mix('18', '6', '96') }, [
    ...mic(8), ...mic(8, 9, 'xlr-combo', 'In'), ...stereoIns(1, 'St'), ...mainLR(), ...out(6, 'Out', 'jack'), ctl('Réseau'), usbRec('USB-B (audio)'), dc('Alim 12 V DC'), phones(), port('usbA', 'USB-A (clé)', 'usb', AES, 'io'),
  ]),
  dev('ah-cq20b', 'Allen & Heath', 'CQ-20B', 'Son', { kg: 3, v: '100-240 V', d: 'Console numérique sans surface (format boîtier) pilotée par tablette ou ordinateur, 20 entrées.', x: mix('20', '6', '96') }, [
    ...mic(8), ...mic(8, 9, 'xlr-combo', 'In'), ...stereoIns(2, 'St'), ...mainLR(), ...out(6), ...stereoOuts(1, 'Alt out'), ctl('Réseau'), usbRec('USB-B (audio)'), iec(), phones(),
  ]),
  ...(['C1500', 'C2500', 'C3500'] as const).map((m, i) =>
    dev(`ah-dlive-${m.toLowerCase()}`, 'Allen & Heath', `dLive ${m}`, 'Son', { kg: [14, 18, 25][i], v: '100-240 V', d: `Surface de contrôle dLive série C (${[12, 20, 24][i]} faders) : pilote une MixRack dLive par gigaACE, avec un peu d’I/O locale.`, x: mix('128', '64'), opt: DLIVE_CARDS }, [
      ...mic(6), ...out(6), ...aesIn(1), ...aesOut(1), ...link('gigaace', 'gigaACE (MixRack)'), ctl('Réseau'), port('usb', 'USB', 'usb', AES, 'io'), iec(), talkback(), phones(),
    ]),
  ),
  ...(['S5000', 'S7000'] as const).map((m, i) =>
    dev(`ah-dlive-${m.toLowerCase()}`, 'Allen & Heath', `dLive ${m}`, 'Son', { kg: [33, 43][i], v: '100-240 V', d: `Surface de contrôle dLive série S (${[28, 36][i]} faders) reliée à la MixRack par gigaACE redondé.`, x: mix('128', '64'), opt: DLIVE_CARDS }, [
      ...mic(8), ...out(8), ...aesIn(2), ...aesOut(3), ...link('gigaace', 'gigaACE (MixRack)', 2), ctl('Réseau'), port('usb', 'USB', 'usb', AES, 'io'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
    ]),
  ),
  dev('ah-qu16', 'Allen & Heath', 'Qu-16', 'Son', { kg: 12, v: '100-240 V', w: 60, d: 'Console numérique compacte 16 entrées micro, enregistrement multipiste USB, extension par stagebox dSNAKE.', x: mix('22', '12 + LR', '48') }, [
    ...mic(16), ...line(16, 'Line'), ...stereoIns(2, 'St'), ...out(10, 'Mix'), ...mainLR(), ...stereoOuts(1, 'Alt out'), ...stereoOuts(1, '2TR out', 'jack', '2tr'), ...aesOut(1), ...link('dsnake', 'dSNAKE'), ctl('Réseau'), usbAudio('USB-B (audio)'), iec(), talkback(), phones(), port('usbA', 'USB-A (clé)', 'usb', AES, 'io'),
  ]),
  dev('ah-qu24', 'Allen & Heath', 'Qu-24', 'Son', { kg: 16, v: '100-240 V', w: 80, d: 'Console numérique 24 entrées micro avec groupes et matrices, enregistrement USB, dSNAKE.', x: mix('30', '12 + 4 grp + 2 mtx', '48') }, [
    ...mic(24), ...line(24, 'Line'), ...stereoIns(2, 'St'), ...out(10, 'Mix'), ...stereoOuts(2, 'Matrix', 'xlr3', 'mtx'), ...mainLR(), ...stereoOuts(1, 'Alt out'), ...aesOut(1), ...link('dsnake', 'dSNAKE'), ctl('Réseau'), usbAudio('USB-B (audio)'), iec(), talkback(), phones(), port('usbA', 'USB-A (clé)', 'usb', AES, 'io'),
  ]),
  ...(['SQ-5', 'SQ-6', 'SQ-7'] as const).map((m, i) =>
    dev(`ah-${m.toLowerCase().replace('-', '')}`, 'Allen & Heath', m, 'Son', { kg: [12, 16, 20][i], v: '100-240 V', d: `Console numérique 96 kHz ${[16, 24, 32][i]} préamplis, 48 voies, avec enregistrement USB et un slot d’extension.`, x: mix('48', '12 st + 3 st mtx'), opt: SQ_CARDS }, [
      ...mic([16, 24, 32][i]), ...out([12, 14, 16][i]), ...aesOut(1), ...link('slink', 'SLink'), ctl('Réseau'), usbAudio('USB-B (audio)'), footswitch(), iec(), talkback(), phones(), port('usbA', 'USB-A (clé)', 'usb', AES, 'io'),
    ]),
  ),
  dev('ah-zed22fx', 'Allen & Heath', 'ZED-22FX (analogique)', 'Son', { kg: 8, v: '100-240 V', d: 'Console analogique 16 voies mono + 3 stéréo, 4 groupes, effets intégrés et interface USB.', x: [['Audio', 'Voies', '16 mono + 3 stéréo'], ['Audio', 'Groupes', '4'], ['Audio', 'Auxiliaires', '4']] }, [
    ...mic(16), ...line(16, 'Line'), ...run('ins', 'Insert', 16, 'jack', A, 'io'), ...stereoIns(3, 'St'), ...mainLR(), ...stereoOuts(1, 'Main out', 'jack', 'mainJ'), ...out(4, 'Group', 'jack', 'grp'), ...out(4, 'Aux', 'jack', 'aux'), ...stereoOuts(1, 'Monitor'), ...stereoIns(1, '2TR in', 'rca', '2trin'), usbAudio(), iec(), phones(),
  ]),
  // ---- Avid
  ...(['24C', '32D', '48D'] as const).map((m, i) =>
    dev(`avid-s6l-${m.toLowerCase()}`, 'Avid', `VENUE S6L-${m} (surface)`, 'Son', { kg: [44, 60, 80][i], v: '100-240 V', d: 'Surface de contrôle VENUE S6L ; le traitement est dans le moteur E6L et l’I/O dans les racks Stage, reliés en AVB.', x: mix(['144', '192', '192'][i], '64') }, [
      ...mic(8), ...out(8), ...aesIn(4), ...aesOut(4), ...run('avb', 'AVB (moteur E6L)', 2, 'ethercon', AVB, 'io'), ctl('ECx', 'ethercon'), gpio(), ...midi(), port('dvi', 'DVI (écran externe)', 'dvi', 'video', 'out'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'), talkback(),
    ]),
  ),
  // ---- Behringer
  dev('beh-wing', 'Behringer', 'Wing', 'Son', { kg: 21, v: '100-240 V', w: 90, d: 'Console numérique 48 voies / 28 bus avec écran tactile 10″, 3 ports AES50, StageConnect et interface USB 48×48.', x: mix('48', '28 + 8 mtx', '48'), opt: WING_CARDS }, [
    ...mic(8), ...out(8), ...run('auxIn', 'Aux in', 8, 'jack', A, 'in'), ...run('auxOut', 'Aux out', 8, 'jack', A, 'out'), ...aesIn(1), ...aesOut(1), ...link('aes50', 'AES50', 3), port('stagec', 'StageConnect', 'xlr3', LINK, 'io'), ...midi(), ctl('Réseau'), usbAudio('USB audio 48×48'), iec(), talkback(), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
  ]),
  dev('beh-wing-compact', 'Behringer', 'Wing Compact', 'Son', { kg: 17, v: '100-240 V', d: 'Version compacte du Wing avec 24 préamplis locaux, mêmes 48 voies / 28 bus.', x: mix('48', '28 + 8 mtx', '48'), opt: WING_CARDS }, [
    ...mic(24), ...out(8), ...run('auxIn', 'Aux in', 8, 'jack', A, 'in'), ...run('auxOut', 'Aux out', 8, 'jack', A, 'out'), ...aesIn(1), ...aesOut(1), ...link('aes50', 'AES50', 3), port('stagec', 'StageConnect', 'xlr3', LINK, 'io'), ...midi(), ctl('Réseau'), usbAudio('USB audio 48×48'), iec(), talkback(), phones(),
  ]),
  dev('beh-wing-rack', 'Behringer', 'Wing Rack', 'Son', { u: 4, kg: 8, v: '100-240 V', d: 'Moteur Wing en rack 19″ avec écran tactile 10″ : 24 préamplis, 48 voies / 28 bus.', x: mix('48', '28 + 8 mtx', '48'), opt: WING_CARDS }, [
    ...mic(24), ...out(8), ...run('auxIn', 'Aux in', 8, 'jack', A, 'in'), ...run('auxOut', 'Aux out', 8, 'jack', A, 'out'), ...aesIn(1), ...aesOut(1), ...link('aes50', 'AES50', 3), port('stagec', 'StageConnect', 'xlr3', LINK, 'io'), ...midi(), ctl('Réseau'), usbAudio('USB audio 48×48'), iec(), phones(),
  ]),
  dev('beh-x32', 'Behringer', 'X32', 'Son', { kg: 20.5, dim: '202 × 891 × 529', v: '100-240 V', w: 120, d: 'Console numérique 40 voies / 25 bus à 32 préamplis Midas, AES50 pour les stageboxes S16/S32 et Ultranet pour les retours P16.', x: mix('40', '16 aux + 6 mtx + LRC', '48'), opt: X32_CARDS }, [
    ...xRear(32, 16), talkback(), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
  ]),
  dev('beh-x32-compact', 'Behringer', 'X32 Compact', 'Son', { kg: 15, v: '100-240 V', w: 100, d: 'X32 en format compact : 16 préamplis locaux, même moteur 40 voies / 25 bus.', x: mix('40', '16 aux + 6 mtx + LRC', '48'), opt: X32_CARDS }, [
    ...xRear(16, 8), talkback(), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
  ]),
  dev('beh-x32-producer', 'Behringer', 'X32 Producer', 'Son', { kg: 11, v: '100-240 V', w: 80, d: 'X32 en format rackable avec 16 faders et 16 préamplis.', x: mix('40', '16 aux + 6 mtx + LRC', '48'), opt: X32_CARDS }, [...xRear(16, 8), talkback(), phones()]),
  dev('beh-x32-rack', 'Behringer', 'X32 Rack', 'Son', { u: 3, kg: 6, v: '100-240 V', w: 60, d: 'Moteur X32 en rack 3U avec écran, 16 préamplis ; se pilote par tablette ou ordinateur.', x: mix('40', '16 aux + 6 mtx + LRC', '48'), opt: X32_CARDS }, [...xRear(16, 8), phones()]),
  dev('beh-xr12', 'Behringer', 'XR12 (rack)', 'Son', { kg: 2, v: '100-240 V', d: 'Mélangeur numérique 12 entrées piloté en Wi-Fi par tablette, sans surface.', x: mix('12', '2 aux + 4 FX + LR', '48') }, [
    ...mic(4, 1, 'xlr-combo', 'In'), ...line(8, 'Line', 5), ...mainLR(), ...out(2, 'Aux', 'jack', 'aux'), ctl('Réseau'), port('usbA', 'USB-A (clé)', 'usb', AES, 'io'), iec(), phones(),
  ]),
  dev('beh-xr16', 'Behringer', 'XR16 (rack)', 'Son', { kg: 2, v: '100-240 V', d: 'Mélangeur numérique 16 entrées piloté en Wi-Fi par tablette, sans surface.', x: mix('16', '4 aux + 4 FX + LR', '48') }, [
    ...mic(8, 1, 'xlr-combo', 'In'), ...line(8, 'Line', 9), ...mainLR(), ...out(4, 'Aux', 'xlr3', 'aux'), ctl('Réseau'), port('usbA', 'USB-A (clé)', 'usb', AES, 'io'), iec(), phones(),
  ]),
  dev('beh-xr18', 'Behringer', 'XR18 (rack)', 'Son', { kg: 2, v: '100-240 V', d: 'Mélangeur numérique 18 entrées / 12 bus en boîtier, Wi-Fi intégré, interface USB 18×18 et sortie Ultranet.', x: mix('18', '6 aux + 4 FX + LR', '48') }, [
    ...mic(12), ...mic(4, 13, 'xlr-combo', 'In'), ...run('auxIn', 'Aux in', 2, 'jack', A, 'in'), ...mainLR(), ...out(6, 'Aux', 'xlr3', 'aux'), port('ultranet', 'Ultranet', 'rj45', LINK, 'out'), ...midi(), usbAudio('USB audio 18×18'), ctl('Réseau'), iec(), phones(),
  ]),
  // ---- DiGiCo
  dev('digico-q225', 'DiGiCo', 'Quantum 225', 'Son', { kg: 25, v: '100-240 V', d: 'Console numérique compacte de la gamme Quantum, 96 kHz, deux ports MADI redondés et un slot DMI.', x: mix('72', '36'), opt: DMI_CARDS }, [
    ...mic(8), ...out(8), ...aesIn(2), ...aesOut(2), ...madi('sdi', 'A'), ...madi('sdi', 'B'), ...wclk(), gpio(), ctl('Réseau', 'ethercon'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones(),
  ]),
  dev('digico-q338', 'DiGiCo', 'Quantum 338', 'Son', { kg: 50, v: '100-240 V', d: 'Console Quantum 128 voies, six ports MADI BNC, Optocore en option, alimentations redondées.', x: mix('128', '56'), opt: DMI_CARDS }, [
    ...mic(8), ...out(8), ...aesIn(4), ...aesOut(4), ...madi('sdi', 'A'), ...madi('sdi', 'B'), ...madi('sdi', 'C'), ...wclk(), gpio(), ctl('Réseau', 'ethercon'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones(),
  ]),
  dev('digico-q852', 'DiGiCo', 'Quantum 852', 'Son', { kg: 90, v: '100-240 V', d: 'Console tournée haut de gamme DiGiCo, double moteur, réseau Optocore.', x: mix('256', '128'), opt: DMI_CARDS }, [
    ...mic(8), ...out(8), ...aesIn(4), ...aesOut(4), ...madi('sdi', 'A'), ...madi('sdi', 'B'), ...link('fibre', 'Optocore', 2, 'opticalcon'), ...wclk(), gpio(), ctl('Réseau', 'ethercon'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones(),
  ]),
  ...(['S21', 'S31'] as const).map((m, i) =>
    dev(`digico-${m.toLowerCase()}`, 'DiGiCo', m, 'Son', { kg: [22, 25][i], v: '100-240 V', d: `Console numérique DiGiCo d’entrée de gamme (${[21, 31][i]} faders), 24 préamplis locaux, deux slots DMI.`, x: mix('48', '16 + 8 mtx'), opt: DMI_CARDS }, [
      ...mic(24), ...out(12), ...aesIn(1), ...aesOut(1), ...wclk(), gpio(), ...run('net', 'Réseau', 2, 'rj45', CIP, 'io'), port('dvi', 'DVI (écran externe)', 'dvi', 'video', 'out'), iec(), phones(),
    ]),
  ),
  ...(['SD5', 'SD7 Quantum', 'SD10'] as const).map((m, i) =>
    dev(`digico-${['sd5', 'sd7q', 'sd10'][i]}`, 'DiGiCo', m, 'Son', { kg: [75, 110, 47][i], v: '100-240 V', d: 'Console tournée DiGiCo série SD, MADI et Optocore pour les racks de scène.', x: mix(['124', '256', '96'][i], ['56', '128', '48'][i]), opt: DMI_CARDS }, [
      ...mic(8), ...out(8), ...aesIn(4), ...aesOut(4), ...madi('sdi', 'A'), ...madi('sdi', 'B'), ...link('fibre', 'Optocore', 2, 'opticalcon'), ...wclk(), gpio(), ctl('Réseau', 'ethercon'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones(),
    ]),
  ),
  dev('digico-sd12', 'DiGiCo', 'SD12', 'Son', { kg: 40, v: '100-240 V', d: 'Console SD compacte à deux écrans, 72 voies (96 en Quantum), deux ports MADI.', x: mix('72', '36'), opt: DMI_CARDS }, [
    ...mic(12), ...out(12), ...aesIn(4), ...aesOut(4), ...madi('sdi', 'A'), ...madi('sdi', 'B'), ...wclk(), gpio(), ctl('Réseau', 'ethercon'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones(),
  ]),
  dev('digico-sd9', 'DiGiCo', 'SD9', 'Son', { kg: 25, v: '100-240 V', d: 'Console SD compacte à un écran, 48 voies, un port MADI vers D-Rack ou SD-Mini Rack.', x: mix('48', '16 + 8 mtx') }, [
    ...mic(8), ...out(8), ...aesIn(2), ...aesOut(2), ...madi('sdi'), ...wclk(), gpio(), ctl('Réseau', 'ethercon'), iec(), talkback(), phones(),
  ]),
  // ---- Midas
  dev('midas-hd96', 'Midas', 'HD96-24', 'Son', { kg: 50, v: '100-240 V', d: 'Console numérique Midas 144 voies / 96 kHz avec écran 21″, liaisons Snake vers les racks DL et deux slots CM-1.', x: mix('144', '120'), opt: CM1_CARDS }, [
    ...mic(8), ...out(8), ...aesIn(2), ...aesOut(2), ...link('snake', 'Snake (HyperMAC)', 2), ctl('Réseau'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones(),
  ]),
  dev('midas-m32', 'Midas', 'M32', 'Son', { kg: 25, v: '100-240 V', w: 120, d: 'Console numérique 40 voies / 25 bus à 32 préamplis Midas PRO, AES50 vers les stageboxes DL et Ultranet pour les retours.', x: mix('40', '16 aux + 6 mtx + LRC', '48'), opt: M32_CARDS }, [
    ...xRear(32, 16), talkback(), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
  ]),
  dev('midas-m32-live', 'Midas', 'M32 Live', 'Son', { kg: 25, v: '100-240 V', w: 120, d: 'M32 livrée avec la carte DN32-LIVE : enregistrement 32 pistes sur cartes SD et USB.', x: mix('40', '16 aux + 6 mtx + LRC', '48'), opt: M32_CARDS }, [
    ...xRear(32, 16), talkback(), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
  ]),
  dev('midas-m32r', 'Midas', 'M32R Live', 'Son', { kg: 17, v: '100-240 V', w: 80, d: 'M32 en format compact rackable : 16 préamplis, même moteur 40 voies.', x: mix('40', '16 aux + 6 mtx + LRC', '48'), opt: M32_CARDS }, [...xRear(16, 8), talkback(), phones()]),
  dev('midas-mr12', 'Midas', 'MR12 (rack)', 'Son', { kg: 2, v: '100-240 V', d: 'Mélangeur numérique 12 entrées piloté en Wi-Fi par tablette, préamplis Midas PRO.', x: mix('12', '2 aux + 4 FX + LR', '48') }, [
    ...mic(4, 1, 'xlr-combo', 'In'), ...line(8, 'Line', 5), ...mainLR(), ...out(2, 'Aux', 'jack', 'aux'), ctl('Réseau'), port('usbA', 'USB-A (clé)', 'usb', AES, 'io'), iec(), phones(),
  ]),
  dev('midas-mr18', 'Midas', 'MR18 (rack)', 'Son', { u: 3, kg: 4, v: '100-240 V', d: 'Mélangeur numérique 18 entrées en boîtier, Wi-Fi intégré, interface USB 18×18 et Ultranet.', x: mix('18', '6 aux + 4 FX + LR', '48') }, [
    ...mic(12), ...mic(4, 13, 'xlr-combo', 'In'), ...run('auxIn', 'Aux in', 2, 'jack', A, 'in'), ...mainLR(), ...out(6, 'Aux', 'xlr3', 'aux'), port('ultranet', 'Ultranet', 'rj45', LINK, 'out'), ...midi(), usbAudio('USB audio 18×18'), ctl('Réseau'), iec(), phones(),
  ]),
  dev('midas-pro2', 'Midas', 'PRO2', 'Son', { kg: 46, v: '100-240 V', d: 'Console tournée Midas PRO (génération précédente), 64 voies, réseau AES50 vers les racks DL.', x: mix('64', '27 + 8 mtx') }, [
    ...mic(8), ...out(16), ...aesIn(2), ...aesOut(3), ...run('aes50', 'AES50', 6, 'ethercon', LINK, 'io'), ...midi(), gpio(), ctl('Réseau'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones(),
  ]),
  // ---- PreSonus
  ...([['16iii', 'StudioLive 16 Series III', 16, 8, 9], ['24iii', 'StudioLive 24 Series III', 24, 16, 13]] as const).map(([id, m, n, flex, kg]) =>
    dev(`presonus-${id}`, 'PreSonus', m, 'Son', { kg, v: '100-240 V', d: `Console numérique ${n} entrées avec enregistrement intégré sur carte SD et USB, réseau AVB pour les stageboxes et retours personnels.`, x: mix(String(n + 4), `${flex} FlexMix`) }, [
      ...mic(n), ...out(flex, 'FlexMix'), ...mainLR(), port('mono', 'Mono / Center', 'xlr3', A, 'out'), ...aesOut(1), ...stereoIns(1, 'Tape in', 'rca', 'tapein'), ...stereoOuts(1, 'Tape out', 'rca', 'tapeout'), port('avb', 'AVB', 'ethercon', AVB, 'io'), ctl('Réseau'), usbAudio(), footswitch(), iec(), talkback(), phones(),
    ]),
  ),
  dev('presonus-32r', 'PreSonus', 'StudioLive 32R (rack)', 'Son', { u: 3, kg: 7, v: '100-240 V', d: 'Mélangeur / stagebox numérique 32 entrées en rack 3U, AVB et USB.', x: mix('40', '16 FlexMix') }, [
    ...mic(32), ...run('flex', 'FlexMix', 16, 'jack', A, 'out'), ...mainLR(), ...stereoIns(1, 'Tape in', 'rca', 'tapein'), port('avb', 'AVB', 'ethercon', AVB, 'io'), ctl('Réseau'), usbAudio(), iec(), phones(),
  ]),
  dev('presonus-32sx', 'PreSonus', 'StudioLive 32SX', 'Son', { kg: 13, v: '100-240 V', d: 'Console numérique compacte 32 entrées, 22 faders, enregistrement USB et SD, AVB.', x: mix('40', '16 FlexMix') }, [
    ...mic(32), ...out(12, 'FlexMix'), ...run('flexj', 'FlexMix', 4, 'jack', A, 'out', 13), ...mainLR(), port('mono', 'Mono / Center', 'xlr3', A, 'out'), ...aesOut(1), ...stereoIns(1, 'Tape in', 'rca', 'tapein'), ...stereoOuts(1, 'Tape out', 'rca', 'tapeout'), port('avb', 'AVB', 'ethercon', AVB, 'io'), ctl('Réseau'), usbAudio(), iec(), talkback(), phones(),
  ]),
  // ---- Solid State Logic
  ...([['l100', 'Live L100 Plus', 12, 12, 30, '96'], ['l200', 'Live L200 Plus', 12, 12, 40, '144'], ['l350', 'Live L350 Plus', 16, 16, 60, '240'], ['l550', 'Live L550 Plus', 16, 16, 75, '288']] as const).map(([id, m, ins, outs, kg, paths]) =>
    dev(`ssl-${id}`, 'Solid State Logic', m, 'Son', { kg, v: '100-240 V', d: `Console SSL Live (${paths} chemins de traitement), MADI coaxial et optique, Dante intégré pour les stageboxes SSL.`, x: [['Audio', 'Chemins de traitement', paths], ['Audio', 'Fréquence d’échantillonnage', '96', 'kHz']] }, [
      ...mic(ins), ...out(outs), ...aesIn(4), ...aesOut(4), ...madi('sdi', 'A'), ...madi('sdi', 'B'), port('madiOpt', 'MADI optique', 'opticalcon', AES, 'io'), ...dante(), ...wclk(), gpio(), ctl('Réseau'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), ...run('tb', 'Talkback', 2, 'xlr3', A, 'in'), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
    ]),
  ),
  // ---- Soundcraft
  dev('sc-si-expr3', 'Soundcraft', 'Si Expression 3', 'Son', { kg: 20, v: '100-240 V', d: 'Console numérique 32 entrées micro, 30 faders, un slot d’extension Si.', x: mix('66', '14 aux + 4 mtx + LR', '48'), opt: SI_CARDS }, [
    ...mic(32), ...line(4, 'Line'), ...out(16), ...aesOut(1), ...midi(), ctl('Réseau'), iec(), talkback(), phones(),
  ]),
  dev('sc-si-impact', 'Soundcraft', 'Si Impact', 'Son', { kg: 18, v: '100-240 V', d: 'Console numérique 32 entrées micro avec écran tactile, carte USB/MADI combinée livrée pour l’enregistrement et les stageboxes Mini.', x: mix('80', '14 aux + 4 mtx + LR', '48'), opt: SI_CARDS }, [
    ...mic(32), ...run('line', 'Line', 8, 'xlr-combo', A, 'in'), ...out(16), ...aesOut(1), port('wcOut', 'Word clock out', 'sdi', SYNC, 'out'), ...midi(), port('madi', 'MADI CAT5 (stagebox)', 'ethercon', AES, 'io'), usbAudio('USB audio (carte combo)'), ctl('Réseau'), iec(), talkback(), phones(),
  ]),
  dev('sc-sig22', 'Soundcraft', 'Signature 22 MTK (analogique)', 'Son', { kg: 10, v: '100-240 V', d: 'Console analogique 16 mono + 3 stéréo avec effets Lexicon et interface USB multipiste 24×22.', x: [['Audio', 'Voies', '16 mono + 3 stéréo'], ['Audio', 'Auxiliaires', '4 + 2 FX']] }, [
    ...mic(16), ...line(16, 'Line'), ...run('ins', 'Insert', 16, 'jack', A, 'io'), ...stereoIns(3, 'St'), ...mainLR(), ...out(4, 'Aux', 'jack', 'aux'), ...stereoOuts(1, 'Monitor'), port('usb', 'USB multipiste', 'usb', AES, 'io'), iec(), phones(),
  ]),
  dev('sc-ui16', 'Soundcraft', 'Ui16 (rack)', 'Son', { kg: 2, v: 'Bloc secteur externe', d: 'Mélangeur numérique 16 entrées piloté par navigateur web (Wi-Fi intégré), sans surface.', x: mix('16', '4 aux + 3 FX + LR', '48') }, [
    ...mic(8, 1, 'xlr-combo', 'In'), ...mic(4, 9), ...stereoIns(1, 'Line'), ...mainLR(), ...out(4, 'Aux', 'xlr3', 'aux'), ctl('Réseau'), dc('Alim externe'), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
  ]),
  dev('sc-ui24r', 'Soundcraft', 'Ui24R (rack)', 'Son', { u: 3, kg: 5, v: '100-240 V', d: 'Mélangeur numérique 24 voies en rack, piloté par navigateur, enregistrement multipiste USB 22 pistes.', x: mix('24', '10 aux + 4 FX + LR', '48') }, [
    ...mic(10), ...mic(10, 11, 'xlr-combo', 'In'), ...stereoIns(1, 'Line'), ...mainLR(), ...out(8, 'Aux', 'xlr3', 'aux'), usbAudio('USB-B (audio)'), ctl('Réseau'), port('hdmi', 'HDMI (écran)', 'hdmi', 'video', 'out'), footswitch(), iec(), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
  ]),
  ...(['Vi1000', 'Vi3000'] as const).map((m, i) =>
    dev(`sc-${m.toLowerCase()}`, 'Soundcraft', m, 'Son', { kg: [27, 48][i], v: '100-240 V', d: 'Console numérique Soundcraft Vi avec I/O de scène (Vi Stagebox ou Mini Stagebox) en MADI.', x: mix(['64', '144'][i], ['24 + 8 mtx', '36 + 8 mtx'][i]) }, [
      ...mic(16), ...out(16), ...aesOut(1), ...madi(), ...midi(), ctl('Réseau'), iec(), talkback(), phones(),
    ]),
  ),
  // ---- Yamaha
  ...([['cl1', 'CL1', 48, 20], ['cl3', 'CL3', 64, 26], ['cl5', 'CL5', 72, 34]] as const).map(([id, m, ch, kg]) =>
    dev(`yam-${id}`, 'Yamaha', m, 'Son', { kg, v: '100-240 V', w: 170, d: `Console numérique Yamaha série CL (${ch} voies mono), I/O de scène Rio en Dante, trois slots MY.`, x: mix(`${ch} mono + 8 st`, '24 mix + 8 mtx'), opt: MY_CARDS }, [
      ...mic(8, 1, 'xlr3', 'Omni in'), ...out(8, 'Omni out'), port('2trIn', '2TR in (coax)', 'rca', AES, 'in'), port('2trOut', '2TR out (coax)', 'rca', AES, 'out'), ...wclk(), gpio(), ...dante(), ctl('Réseau'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwrExt', 'Alim externe PW800W (redondance)', 'xlr5', 'power', 'in'), talkback(), phones(),
    ]),
  ),
  ...([['ql1', 'QL1', 32, 16, 8, 15], ['ql5', 'QL5', 64, 32, 16, 30]] as const).map(([id, m, ch, ins, outs, kg]) =>
    dev(`yam-${id}`, 'Yamaha', m, 'Son', { kg, v: '100-240 V', d: `Console numérique Yamaha série QL (${ch} voies mono), ${ins} entrées locales, Dante intégré, deux slots MY.`, x: mix(`${ch} mono + 8 st`, '16 mix + 8 mtx'), opt: MY_CARDS }, [
      ...mic(ins), ...out(outs), port('2trIn', '2TR in (coax)', 'rca', AES, 'in'), port('2trOut', '2TR out (coax)', 'rca', AES, 'out'), ...wclk(), gpio(), ...dante(), ctl('Réseau'), iec(), talkback(), phones(),
    ]),
  ),
  dev('yam-dm3', 'Yamaha', 'DM3', 'Son', { kg: 6.8, dim: '140 × 320 × 455', v: '100-240 V', d: 'Console numérique ultra-compacte 22 voies à écran 9″, interface USB 18×18 et Dante 16×16.', x: mix('22', '8 mix + 2 mtx', '96') }, [
    ...mic(12), ...mic(4, 13, 'xlr-combo', 'In'), ...out(8), ...dante('rj45'), ctl('Réseau'), usbAudio('USB audio 18×18'), footswitch(), iec(), phones(),
  ]),
  dev('yam-dm3s', 'Yamaha', 'DM3 Standard', 'Son', { kg: 6.8, dim: '140 × 320 × 455', v: '100-240 V', d: 'DM3 sans Dante : console numérique compacte 22 voies, interface USB 18×18.', x: mix('22', '8 mix + 2 mtx', '96') }, [
    ...mic(12), ...mic(4, 13, 'xlr-combo', 'In'), ...out(8), ctl('Réseau'), usbAudio('USB audio 18×18'), footswitch(), iec(), phones(),
  ]),
  dev('yam-dm7', 'Yamaha', 'DM7', 'Son', { kg: 30, v: '100-240 V', d: 'Console numérique Yamaha 120 voies, deux écrans 12″, Dante 144×144, slot PY.', x: mix('120', '48 mix + 12 mtx'), opt: PY_CARDS }, [
    ...mic(32), ...out(16), ...aesOut(1), ...wclk(), gpio(), ...dante(), ctl('Réseau'), usbAudio('USB audio 18×18'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones(),
  ]),
  dev('yam-dm7c', 'Yamaha', 'DM7 Compact', 'Son', { kg: 21, dim: '324 × 468 × 564', v: '100-240 V', d: 'DM7 en format compact : 72 voies, 16 faders, 16 entrées / 16 sorties locales, Dante 144×144.', x: mix('72', '48 mix + 12 mtx'), opt: PY_CARDS }, [
    ...mic(16), ...out(16), ...aesOut(1), ...wclk(), gpio(), ...dante(), ctl('Réseau'), usbAudio('USB audio 18×18'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones(),
  ]),
  dev('yam-mg10xu', 'Yamaha', 'MG10XU (analogique)', 'Son', { kg: 2.1, v: 'Bloc secteur PA-10 (fourni)', w: 22, d: 'Petite console analogique 10 voies avec effets SPX et interface USB 2×2.', x: [['Audio', 'Voies', '4 mono + 3 stéréo'], ['Audio', 'Préamplis micro', '4']] }, [
    ...mic(4, 1, 'xlr-combo', 'In'), ...stereoIns(3, 'St'), ...stereoIns(1, '2TR in', 'rca', '2trin'), ...mainLR(), ...stereoOuts(1, 'Stereo out', 'jack', 'stJ'), port('mon', 'Monitor out', 'jack', A, 'out'), port('fx', 'FX send', 'jack', A, 'out'), port('usb', 'USB audio', 'usb', AES, 'io'), dc('Alim PA-10'), phones(),
  ]),
  dev('yam-mg16xu', 'Yamaha', 'MG16XU (analogique)', 'Son', { kg: 5.6, v: 'Bloc secteur PA-30 (fourni)', w: 36, d: 'Console analogique 16 voies avec 4 groupes, effets SPX et interface USB 2×2.', x: [['Audio', 'Voies', '8 mono + 4 stéréo'], ['Audio', 'Groupes', '4'], ['Audio', 'Auxiliaires', '4']] }, [
    ...mic(10, 1, 'xlr-combo', 'In'), ...run('ins', 'Insert', 4, 'jack', A, 'io'), ...stereoIns(4, 'St'), ...stereoIns(1, '2TR in', 'rca', '2trin'), ...mainLR(), ...stereoOuts(1, 'Stereo out', 'jack', 'stJ'), ...out(4, 'Group', 'jack', 'grp'), ...out(4, 'Aux', 'jack', 'aux'), ...stereoOuts(1, 'Monitor'), port('usb', 'USB audio', 'usb', AES, 'io'), dc('Alim PA-30'), phones(),
  ]),
  dev('yam-pm10', 'Yamaha', 'RIVAGE PM10 (surface CS-R10)', 'Son', { kg: 75, v: '100-240 V', d: 'Surface de contrôle de la RIVAGE PM10 ; le traitement est dans le moteur DSP-R10, l’I/O dans les racks RPio, reliés en TWINLANe.', x: mix('144', '72 mix + 36 mtx'), opt: HY_CARDS }, [
    ...mic(8, 1, 'xlr3', 'Omni in'), ...out(8, 'Omni out'), ...aesIn(4), ...aesOut(4), ...wclk(), gpio(), ...midi(), ctl('Réseau', 'ethercon'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
  ]),
  dev('yam-pm5', 'Yamaha', 'RIVAGE PM5 (surface CS-R5)', 'Son', { kg: 42, dim: '414 × 1444 × 643', v: '100-240 V', d: 'Surface RIVAGE à trois écrans tactiles, avec moteur DSP-RX ou DSP-RX-EX ; réseaux TWINLANe et Dante.', x: mix('144', '72 mix + 36 mtx'), opt: HY_CARDS }, [
    ...mic(8, 1, 'xlr3', 'Omni in'), ...out(8, 'Omni out'), ...aesIn(4), ...aesOut(4), ...wclk(), gpio(), ...midi(), ctl('Réseau', 'ethercon'), port('pwr', 'Secteur', 'iec', 'power', 'in'), port('pwr2', 'Secteur (redondant)', 'iec', 'power', 'in'), talkback(), phones('jack', 'phones1', 'Casque 1'), phones('jack', 'phones2', 'Casque 2'),
  ]),
  dev('yam-pm3', 'Yamaha', 'RIVAGE PM3 (surface CS-R3)', 'Son', { kg: 38, dim: '385 × 1145 × 650', v: '100-240 V', d: 'Surface RIVAGE compacte à un écran tactile, avec moteur DSP-RX ; réseaux TWINLANe et Dante.', x: mix('144', '72 mix + 36 mtx'), opt: HY_CARDS }, [
    ...mic(8, 1, 'xlr3', 'Omni in'), ...out(8, 'Omni out'), ...wclk(), gpio(), ...midi(), ctl('Réseau', 'ethercon'), iec(), talkback(), phones(),
  ]),
  ...([['tf1', 'TF1', 16, 13], ['tf3', 'TF3', 24, 17], ['tf5', 'TF5', 32, 21]] as const).map(([id, m, n, kg]) =>
    dev(`yam-${id}`, 'Yamaha', m, 'Son', { kg, v: '100-240 V', w: 100, d: `Console numérique Yamaha série TF, ${n} entrées locales, écran tactile TouchFlow, interface USB 34×34 ; Dante avec la carte NY64-D.`, x: mix('40', '20 aux + 8 FX + LR', '48'), opt: TF_CARDS }, [
      ...mic(n, 1, 'xlr-combo', 'In'), ...stereoIns(2, 'ST in', 'rca'), ...out(16, 'Omni out'), ctl('Réseau'), usbAudio('USB audio 34×34'), footswitch(), iec(), phones(), port('usbA', 'USB-A (clé)', 'usb', AES, 'io'),
    ]),
  ),
])
