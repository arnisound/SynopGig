import type { Category, ConnectorType, DeviceTemplate, Port, PortDirection, SignalType } from '../types'
import { port, series } from './ports'

/*
 * Recurring brand models in live sound, lighting and video.
 * Port lists cover the connectors used on a gig and are indicative:
 * check the manufacturer's data sheet before building a show on them.
 */

const A: SignalType = 'audio-analog'
const AES: SignalType = 'audio-digital'
const HP: SignalType = 'speaker'
const DMX: SignalType = 'dmx'
const NET: SignalType = 'network'
const V: SignalType = 'video'
const PWR: SignalType = 'power'

const ins = (n: number, label = 'In', c: ConnectorType = 'xlr3') => series('in', label, n, c, A, 'in')
const outs = (n: number, label = 'Out', c: ConnectorType = 'xlr3') => series('out', label, n, c, A, 'out')
const pair = (prefix: string, label: string, c: ConnectorType, s: SignalType, d: PortDirection = 'io'): Port[] => [
  port(`${prefix}A`, `${label} A`, c, s, d),
  port(`${prefix}B`, `${label} B`, c, s, d),
]
const dante = () => [port('pri', 'Dante primaire', 'ethercon', NET, 'io'), port('sec', 'Dante secondaire', 'ethercon', NET, 'io')]
const net = (label = 'Réseau', c: ConnectorType = 'ethercon') => port('net', label, c, NET, 'io')
const iec = () => port('pwr', 'Secteur', 'iec', PWR, 'in')
const t1 = () => port('pwr', 'Secteur', 'powercon-true1', PWR, 'in')
const t1Link = () => [t1(), port('pwr-out', 'Recopie secteur', 'powercon-true1', PWR, 'out')]
const pc32 = () => port('pwr', 'Secteur', 'powercon', PWR, 'in')
const dmxInOut = (c: ConnectorType = 'xlr5') => [port('dmxIn', 'DMX in', c, DMX, 'in'), port('dmxOut', 'DMX out', c, DMX, 'out')]
const dmxOuts = (n: number) => series('dmx', 'DMX', n, 'xlr5', DMX, 'out')
const hpIn = (c: ConnectorType = 'speakon') => [port('in', 'Entrée HP', c, HP, 'in'), port('link', 'Link HP', c, HP, 'out')]

function dev(
  id: string,
  brand: string,
  model: string,
  category: Category,
  spec: { u?: number; kg?: number },
  ports: Port[],
): DeviceTemplate {
  return { id, brand, model, category, rackU: spec.u, weight: spec.kg, ports }
}

const SON: DeviceTemplate[] = [
  // Consoles
  dev('yam-cl5', 'Yamaha', 'CL5', 'Son', { kg: 36 }, [...ins(8, 'Omni in'), ...outs(8, 'Omni out'), port('aes', 'AES out', 'xlr3', AES, 'out'), ...dante(), net('Réseau', 'rj45'), port('wc', 'Word clock', 'sdi', AES, 'out'), iec()]),
  dev('yam-ql1', 'Yamaha', 'QL1', 'Son', { kg: 15 }, [...ins(16), ...outs(8), ...dante(), net('Réseau', 'rj45'), iec()]),
  dev('yam-tf5', 'Yamaha', 'TF5', 'Son', { kg: 21 }, [...ins(32), ...outs(16, 'Omni out'), net('Réseau', 'rj45'), iec()]),
  dev('yam-dm7c', 'Yamaha', 'DM7 Compact', 'Son', { kg: 21 }, [...ins(16), ...outs(8), ...dante(), net('Réseau', 'rj45'), iec()]),
  dev('midas-m32', 'Midas', 'M32', 'Son', { kg: 25 }, [...ins(32), ...outs(16), ...pair('aes50', 'AES50', 'ethercon', AES), port('ultranet', 'Ultranet', 'rj45', AES, 'out'), port('aes', 'AES/EBU out', 'xlr3', AES, 'out'), net('Remote', 'rj45'), iec()]),
  dev('midas-m32r', 'Midas', 'M32R Live', 'Son', { kg: 17 }, [...ins(16), ...outs(8), ...pair('aes50', 'AES50', 'ethercon', AES), net('Remote', 'rj45'), iec()]),
  dev('beh-x32', 'Behringer', 'X32', 'Son', { kg: 20 }, [...ins(32), ...outs(16), ...pair('aes50', 'AES50', 'ethercon', AES), port('ultranet', 'Ultranet', 'rj45', AES, 'out'), net('Remote', 'rj45'), iec()]),
  dev('beh-wing', 'Behringer', 'Wing', 'Son', { kg: 21 }, [...ins(8), ...outs(8), ...pair('aes50', 'AES50', 'ethercon', AES), port('aes50C', 'AES50 C', 'ethercon', AES, 'io'), port('stagec', 'StageConnect', 'xlr3', AES, 'out'), net('Réseau', 'rj45'), iec()]),
  dev('ah-sq5', 'Allen & Heath', 'SQ-5', 'Son', { kg: 12 }, [...ins(16), ...outs(12), port('slink', 'SLink', 'ethercon', AES, 'io'), net('Réseau', 'rj45'), iec()]),
  dev('ah-sq7', 'Allen & Heath', 'SQ-7', 'Son', { kg: 20 }, [...ins(32), ...outs(12), port('slink', 'SLink', 'ethercon', AES, 'io'), net('Réseau', 'rj45'), iec()]),
  dev('ah-avantis', 'Allen & Heath', 'Avantis', 'Son', { kg: 30 }, [...ins(12), ...outs(12), ...pair('gigaace', 'gigaACE', 'ethercon', AES), net('Réseau', 'rj45'), iec()]),
  dev('ah-dlive-c3500', 'Allen & Heath', 'dLive C3500', 'Son', { kg: 25 }, [...ins(8), ...outs(8), ...pair('gigaace', 'gigaACE', 'ethercon', AES), net('Réseau', 'rj45'), iec()]),
  dev('digico-sd12', 'DiGiCo', 'SD12', 'Son', { kg: 40 }, [...ins(12), ...outs(12), port('madiInA', 'MADI in A', 'sdi', AES, 'in'), port('madiOutA', 'MADI out A', 'sdi', AES, 'out'), port('madiInB', 'MADI in B', 'sdi', AES, 'in'), port('madiOutB', 'MADI out B', 'sdi', AES, 'out'), port('aesIn', 'AES in', 'xlr3', AES, 'in'), port('aesOut', 'AES out', 'xlr3', AES, 'out'), net('Réseau', 'ethercon'), iec()]),
  dev('digico-q338', 'DiGiCo', 'Quantum 338', 'Son', { kg: 50 }, [...ins(16), ...outs(16), port('madiInA', 'MADI in A', 'sdi', AES, 'in'), port('madiOutA', 'MADI out A', 'sdi', AES, 'out'), ...pair('fibre', 'Optocore', 'opticalcon', AES), net('Réseau', 'ethercon'), iec()]),
  // Stageboxes
  dev('yam-rio3224', 'Yamaha', 'Rio3224-D2', 'Son', { u: 4, kg: 11 }, [...ins(32), ...outs(16), port('aes', 'AES out', 'xlr3', AES, 'out'), ...dante(), iec()]),
  dev('yam-rio1608', 'Yamaha', 'Rio1608-D2', 'Son', { u: 3, kg: 8 }, [...ins(16), ...outs(8), ...dante(), iec()]),
  dev('yam-tio1608', 'Yamaha', 'Tio1608-D', 'Son', { u: 3, kg: 7 }, [...ins(16), ...outs(8), ...dante(), iec()]),
  dev('midas-dl16', 'Midas', 'DL16', 'Son', { u: 3, kg: 6 }, [...ins(16), ...outs(8), ...pair('aes50', 'AES50', 'ethercon', AES), port('ultranet', 'Ultranet', 'rj45', AES, 'out'), iec()]),
  dev('midas-dl32', 'Midas', 'DL32', 'Son', { u: 3, kg: 9 }, [...ins(32), ...outs(16), ...pair('aes50', 'AES50', 'ethercon', AES), iec()]),
  dev('beh-s16', 'Behringer', 'S16', 'Son', { u: 3, kg: 6 }, [...ins(16), ...outs(8), ...pair('aes50', 'AES50', 'ethercon', AES), iec()]),
  dev('beh-s32', 'Behringer', 'S32', 'Son', { u: 3, kg: 9 }, [...ins(32), ...outs(16), ...pair('aes50', 'AES50', 'ethercon', AES), iec()]),
  dev('ah-ab168', 'Allen & Heath', 'AB168', 'Son', { u: 3, kg: 6 }, [...ins(16), ...outs(8), port('slink', 'SLink', 'ethercon', AES, 'io'), iec()]),
  dev('ah-dx168', 'Allen & Heath', 'DX168', 'Son', { u: 3, kg: 6 }, [...ins(16), ...outs(8), ...pair('dx', 'DX', 'ethercon', AES), iec()]),
  dev('ah-gx4816', 'Allen & Heath', 'GX4816', 'Son', { u: 4, kg: 12 }, [...ins(48), ...outs(16), ...pair('gigaace', 'gigaACE', 'ethercon', AES), iec()]),
  dev('digico-sd-mini', 'DiGiCo', 'SD-MiNi Rack', 'Son', { u: 3, kg: 10 }, [...ins(32), ...outs(8), port('madiIn', 'MADI in', 'sdi', AES, 'in'), port('madiOut', 'MADI out', 'sdi', AES, 'out'), iec()]),
  // Wireless & in-ears
  dev('shure-ulxd4d', 'Shure', 'ULXD4D', 'Son', { u: 1, kg: 3 }, [...outs(2, 'Sortie XLR'), ...pair('net', 'Ethernet', 'rj45', NET), iec()]),
  dev('shure-ulxd4q', 'Shure', 'ULXD4Q', 'Son', { u: 1, kg: 4 }, [...outs(4, 'Sortie XLR'), ...dante(), iec()]),
  dev('shure-ad4q', 'Shure', 'Axient Digital AD4Q', 'Son', { u: 1, kg: 5 }, [...outs(4, 'Sortie XLR'), ...dante(), iec()]),
  dev('shure-p10t', 'Shure', 'PSM1000 P10T', 'Son', { u: 1, kg: 4 }, [...ins(2, 'Entrée', 'xlr3'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('shure-p3t', 'Shure', 'PSM300 P3T', 'Son', { u: 1, kg: 2 }, [...ins(2, 'Entrée', 'xlr3'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), port('pwr', 'Alim externe', 'usb', PWR, 'in')]),
  dev('senn-ewdx-em4', 'Sennheiser', 'EW-DX EM 4 Dante', 'Son', { u: 1, kg: 4 }, [...outs(4, 'Sortie XLR'), ...dante(), iec()]),
  dev('senn-em300g4', 'Sennheiser', 'EM 300-500 G4', 'Son', { u: 1, kg: 1.5 }, [port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), net('Ethernet', 'rj45'), port('pwr', 'Alim externe', 'usb', PWR, 'in')]),
  dev('senn-sr2050', 'Sennheiser', 'SR 2050 IEM', 'Son', { u: 1, kg: 4 }, [...ins(2, 'Entrée', 'xlr3'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), net('Ethernet', 'rj45'), iec()]),
  // Mics & DI
  dev('shure-sm58', 'Shure', 'SM58', 'Son', { kg: 0.3 }, [port('out', 'Sortie', 'xlr3', A, 'out')]),
  dev('shure-sm57', 'Shure', 'SM57', 'Son', { kg: 0.3 }, [port('out', 'Sortie', 'xlr3', A, 'out')]),
  dev('shure-beta52', 'Shure', 'Beta 52A', 'Son', { kg: 0.6 }, [port('out', 'Sortie', 'xlr3', A, 'out')]),
  dev('shure-beta91', 'Shure', 'Beta 91A', 'Son', { kg: 0.5 }, [port('out', 'Sortie', 'xlr3', A, 'out')]),
  dev('senn-e604', 'Sennheiser', 'e604', 'Son', { kg: 0.1 }, [port('out', 'Sortie', 'xlr3', A, 'out')]),
  dev('senn-e906', 'Sennheiser', 'e906', 'Son', { kg: 0.2 }, [port('out', 'Sortie', 'xlr3', A, 'out')]),
  dev('neumann-km184', 'Neumann', 'KM 184', 'Son', { kg: 0.1 }, [port('out', 'Sortie (48 V)', 'xlr3', A, 'out')]),
  dev('radial-j48', 'Radial', 'J48 (DI active)', 'Son', { kg: 0.8 }, [port('in', 'Entrée', 'jack', A, 'in'), port('thru', 'Thru', 'jack', A, 'out'), port('out', 'Sortie XLR', 'xlr3', A, 'out')]),
  dev('radial-prod2', 'Radial', 'ProD2 (DI stéréo)', 'Son', { kg: 1 }, [...series('in', 'Entrée', 2, 'jack', A, 'in'), ...series('thru', 'Thru', 2, 'jack', A, 'out'), ...series('out', 'Sortie XLR', 2, 'xlr3', A, 'out')]),
  dev('bss-ar133', 'BSS', 'AR133 (DI active)', 'Son', { kg: 0.9 }, [port('in', 'Entrée', 'jack', A, 'in'), port('thru', 'Thru', 'jack', A, 'out'), port('out', 'Sortie XLR', 'xlr3', A, 'out')]),
  // Amplifiers & processing
  dev('la-la4x', 'L-Acoustics', 'LA4X', 'Son', { u: 2, kg: 12 }, [...ins(4, 'In analog/AES'), ...series('thru', 'Link', 4, 'xlr3', A, 'out'), ...pair('net', 'Ethernet', 'ethercon', NET), ...series('hp', 'Sortie HP', 4, 'speakon', HP, 'out'), pc32()]),
  dev('la-la12x', 'L-Acoustics', 'LA12X', 'Son', { u: 2, kg: 15 }, [...ins(4, 'In analog/AES'), ...series('thru', 'Link', 4, 'xlr3', A, 'out'), ...pair('net', 'Ethernet', 'ethercon', NET), ...series('hp', 'Sortie HP', 4, 'speakon', HP, 'out'), port('hp8', 'Sortie NL8', 'speakon8', HP, 'out'), pc32()]),
  dev('la-la7-16', 'L-Acoustics', 'LA7.16', 'Son', { u: 2, kg: 15 }, [...ins(4, 'In analog'), ...dante(), ...series('hp', 'Sortie NL8', 2, 'speakon8', HP, 'out'), port('soca', 'Sortie SpeakON 16', 'socapex', HP, 'out'), pc32()]),
  dev('db-d80', 'd&b audiotechnik', 'D80', 'Son', { u: 2, kg: 19 }, [...ins(4, 'In analog/AES'), ...series('thru', 'Link', 4, 'xlr3', A, 'out'), ...pair('net', 'Ethernet', 'ethercon', NET), ...series('hp', 'Sortie HP', 4, 'speakon', HP, 'out'), pc32()]),
  dev('db-d20', 'd&b audiotechnik', 'D20', 'Son', { u: 2, kg: 10 }, [...ins(4, 'In analog/AES'), ...series('thru', 'Link', 4, 'xlr3', A, 'out'), ...pair('net', 'Ethernet', 'ethercon', NET), ...series('hp', 'Sortie HP', 4, 'speakon', HP, 'out'), pc32()]),
  dev('db-30d', 'd&b audiotechnik', '30D', 'Son', { u: 2, kg: 9 }, [...ins(4, 'In analog/AES'), ...pair('net', 'Ethernet', 'ethercon', NET), ...series('hp', 'Sortie HP', 4, 'speakon', HP, 'out'), pc32()]),
  dev('lab-plm20k44', 'Lab.gruppen', 'PLM 20K44', 'Son', { u: 2, kg: 15 }, [...ins(4, 'In analog'), port('aes', 'AES in', 'xlr3', AES, 'in'), ...dante(), ...series('hp', 'Sortie HP', 4, 'speakon', HP, 'out'), pc32()]),
  dev('ps-x8', 'Powersoft', 'X8', 'Son', { u: 1, kg: 13 }, [...ins(8, 'In analog/AES'), ...dante(), ...series('hp', 'Sortie HP', 8, 'speakon', HP, 'out'), pc32()]),
  dev('lake-lm44', 'Lake', 'LM 44', 'Son', { u: 1, kg: 4 }, [...ins(4), ...outs(4), ...dante(), iec()]),
  dev('xilica-solaro', 'Xilica', 'Solaro FR1 (processeur)', 'Son', { u: 1, kg: 4 }, [...ins(8), ...outs(8), ...dante(), net('Contrôle', 'rj45'), iec()]),
  // Speakers
  dev('la-k2', 'L-Acoustics', 'K2', 'Son', { kg: 56 }, hpIn('speakon8')),
  dev('la-kara2', 'L-Acoustics', 'Kara II', 'Son', { kg: 26 }, hpIn('speakon8')),
  dev('la-ks28', 'L-Acoustics', 'KS28', 'Son', { kg: 79 }, hpIn()),
  dev('la-sb18', 'L-Acoustics', 'SB18', 'Son', { kg: 52 }, hpIn()),
  dev('la-x15', 'L-Acoustics', 'X15 HiQ (retour)', 'Son', { kg: 21 }, hpIn()),
  dev('la-x12', 'L-Acoustics', 'X12 (retour)', 'Son', { kg: 20 }, hpIn()),
  dev('la-5xt', 'L-Acoustics', '5XT', 'Son', { kg: 3 }, hpIn()),
  dev('db-ksl8', 'd&b audiotechnik', 'KSL8', 'Son', { kg: 80 }, hpIn('speakon8')),
  dev('db-v8', 'd&b audiotechnik', 'V8', 'Son', { kg: 46 }, hpIn()),
  dev('db-vsub', 'd&b audiotechnik', 'V-SUB', 'Son', { kg: 64 }, hpIn()),
  dev('db-y10p', 'd&b audiotechnik', 'Y10P', 'Son', { kg: 20 }, hpIn()),
  dev('db-m4', 'd&b audiotechnik', 'M4 (retour)', 'Son', { kg: 25 }, hpIn()),
  dev('db-e8', 'd&b audiotechnik', 'E8', 'Son', { kg: 14 }, hpIn()),
  dev('qsc-k122', 'QSC', 'K12.2 (amplifiée)', 'Son', { kg: 18 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Thru', 'xlr3', A, 'out'), iec()]),
  dev('qsc-ks118', 'QSC', 'KS118 (sub amplifié)', 'Son', { kg: 46 }, [...series('in', 'Entrée', 2, 'xlr3', A, 'in'), ...series('thru', 'Thru', 2, 'xlr3', A, 'out'), iec()]),
  dev('rcf-art912', 'RCF', 'ART 912-A (amplifiée)', 'Son', { kg: 18 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Thru', 'xlr3', A, 'out'), ...t1Link()]),
  dev('yam-dxr12', 'Yamaha', 'DXR12 mkII (amplifiée)', 'Son', { kg: 20 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Thru', 'xlr3', A, 'out'), iec()]),
]

const LUMIERE: DeviceTemplate[] = [
  // Consoles
  dev('ma3-full', 'MA Lighting', 'grandMA3 full-size', 'Lumière', { kg: 60 }, [...dmxOuts(8), ...pair('net', 'MA-Net3', 'ethercon', NET), t1()]),
  dev('ma3-light', 'MA Lighting', 'grandMA3 light', 'Lumière', { kg: 40 }, [...dmxOuts(4), ...pair('net', 'MA-Net3', 'ethercon', NET), t1()]),
  dev('ma3-compact-xt', 'MA Lighting', 'grandMA3 compact XT', 'Lumière', { kg: 22 }, [...dmxOuts(4), ...pair('net', 'MA-Net3', 'ethercon', NET), t1()]),
  dev('ma3-cmd-wing', 'MA Lighting', 'grandMA3 onPC command wing', 'Lumière', { kg: 13 }, [...dmxOuts(2), net('Ethernet', 'ethercon'), port('usb', 'USB (PC)', 'usb', NET, 'io'), iec()]),
  dev('ma-8port', 'MA Lighting', 'grandMA3 Node 8 Port', 'Lumière', { u: 2, kg: 5 }, [...pair('net', 'Ethernet', 'ethercon', NET), ...dmxOuts(8), t1()]),
  dev('chamsys-mq80', 'ChamSys', 'MagicQ MQ80', 'Lumière', { kg: 12 }, [...dmxOuts(4), net('Ethernet', 'ethercon'), iec()]),
  dev('chamsys-mq250', 'ChamSys', 'MagicQ MQ250M', 'Lumière', { kg: 30 }, [...dmxOuts(4), ...pair('net', 'Ethernet', 'ethercon', NET), port('sdi', 'Sortie vidéo', 'hdmi', V, 'out'), t1()]),
  dev('avo-tiger', 'Avolites', 'Tiger Touch II', 'Lumière', { kg: 28 }, [...dmxOuts(4), net('Ethernet', 'ethercon'), iec()]),
  dev('avo-arena', 'Avolites', 'Arena', 'Lumière', { kg: 45 }, [...dmxOuts(4), ...pair('net', 'Ethernet', 'ethercon', NET), iec()]),
  dev('etc-ion-xe', 'ETC', 'Ion Xe', 'Lumière', { kg: 18 }, [...dmxOuts(2), net('Ethernet', 'ethercon'), iec()]),
  dev('etc-eos-apex', 'ETC', 'Eos Apex 10', 'Lumière', { kg: 45 }, [...dmxOuts(4), ...pair('net', 'Ethernet', 'ethercon', NET), iec()]),
  // Nodes & splitters
  dev('luminex-lumi4', 'Luminex', 'LumiNode 4', 'Lumière', { u: 1, kg: 2 }, [...pair('net', 'Ethernet', 'ethercon', NET), ...dmxOuts(4), t1()]),
  dev('luminex-lumi12', 'Luminex', 'LumiNode 12', 'Lumière', { u: 1, kg: 4 }, [...pair('net', 'Ethernet', 'ethercon', NET), ...dmxOuts(12), t1()]),
  dev('swisson-xnd4', 'Swisson', 'XND-4', 'Lumière', { u: 1, kg: 2 }, [net('Ethernet', 'ethercon'), ...dmxOuts(4), t1()]),
  dev('swisson-xsp5', 'Swisson', 'XSP-5R (splitter)', 'Lumière', { u: 1, kg: 2 }, [port('in', 'DMX in', 'xlr5', DMX, 'in'), port('thru', 'DMX thru', 'xlr5', DMX, 'out'), ...series('out', 'DMX out', 5, 'xlr5', DMX, 'out'), t1()]),
  dev('dmxking-edmx4', 'DMXking', 'eDMX4 PRO', 'Lumière', { kg: 0.5 }, [net('Ethernet', 'rj45'), ...dmxOuts(4), port('pwr', 'Alim externe', 'usb', PWR, 'in')]),
  // Moving heads
  dev('robe-megapointe', 'Robe', 'MegaPointe', 'Lumière', { kg: 22 }, [...dmxInOut(), net('Ethernet', 'rj45'), ...t1Link()]),
  dev('robe-forte', 'Robe', 'FORTE', 'Lumière', { kg: 38 }, [...dmxInOut(), net('Ethernet', 'rj45'), ...t1Link()]),
  dev('robe-esprite', 'Robe', 'ESPRITE', 'Lumière', { kg: 28 }, [...dmxInOut(), net('Ethernet', 'rj45'), ...t1Link()]),
  dev('robe-spiider', 'Robe', 'Spiider', 'Lumière', { kg: 16 }, [...dmxInOut(), net('Ethernet', 'rj45'), ...t1Link()]),
  dev('robe-led-beam350', 'Robe', 'LEDBeam 350', 'Lumière', { kg: 7 }, [...dmxInOut(), ...t1Link()]),
  dev('martin-aura-xb', 'Martin', 'MAC Aura XB', 'Lumière', { kg: 6 }, [...dmxInOut(), ...t1Link()]),
  dev('martin-viper', 'Martin', 'MAC Viper Profile', 'Lumière', { kg: 38 }, [...dmxInOut(), ...t1Link()]),
  dev('martin-mac-ultra', 'Martin', 'MAC Ultra Performance', 'Lumière', { kg: 43 }, [...dmxInOut(), net('Ethernet', 'ethercon'), ...t1Link()]),
  dev('cp-sharpy', 'Claypaky', 'Sharpy', 'Lumière', { kg: 18 }, [...dmxInOut(), ...t1Link()]),
  dev('cp-mythos2', 'Claypaky', 'Mythos 2', 'Lumière', { kg: 21 }, [...dmxInOut(), ...t1Link()]),
  dev('ayrton-diablo', 'Ayrton', 'Diablo', 'Lumière', { kg: 23 }, [...dmxInOut(), net('Ethernet', 'ethercon'), ...t1Link()]),
  dev('ayrton-perseo', 'Ayrton', 'Perseo Profile (IP65)', 'Lumière', { kg: 36 }, [...dmxInOut(), net('Ethernet', 'ethercon'), ...t1Link()]),
  dev('chauvet-r2wash', 'Chauvet Professional', 'Rogue R2 Wash', 'Lumière', { kg: 13 }, [...dmxInOut(), ...t1Link()]),
  dev('elation-proteus-max', 'Elation', 'Proteus Maximus (IP65)', 'Lumière', { kg: 47 }, [...dmxInOut(), net('Ethernet', 'ethercon'), ...t1Link()]),
  // Static fixtures & effects
  dev('etc-s4-led3', 'ETC', 'Source Four LED Series 3', 'Lumière', { kg: 8 }, [...dmxInOut(), ...t1Link()]),
  dev('martin-atomic3000', 'Martin', 'Atomic 3000 LED', 'Lumière', { kg: 6 }, [...dmxInOut(), ...t1Link()]),
  dev('chauvet-strike4', 'Chauvet Professional', 'STRIKE 4 (blinder)', 'Lumière', { kg: 7 }, [...dmxInOut(), ...t1Link()]),
  dev('astera-ax1', 'Astera', 'AX1 PixelTube (sans fil)', 'Lumière', { kg: 1 }, [port('pwr', 'Charge', 'powercon-true1', PWR, 'in')]),
  dev('glp-x4bar20', 'GLP', 'impression X4 Bar 20', 'Lumière', { kg: 12 }, [...dmxInOut(), net('Ethernet', 'rj45'), ...t1Link()]),
  dev('mdg-theone', 'MDG', 'theONE (machine à brouillard)', 'Lumière', { kg: 38 }, [...dmxInOut(), t1()]),
  dev('look-unique21', 'Look Solutions', 'Unique 2.1 (hazer)', 'Lumière', { kg: 12 }, [...dmxInOut(), iec()]),
  dev('antari-hz500', 'Antari', 'HZ-500 (hazer)', 'Lumière', { kg: 13 }, [...dmxInOut('xlr3'), iec()]),
  dev('rj-gradateur', 'Robert Juliat', 'Digitour 6 (gradateur)', 'Lumière', { u: 3, kg: 14 }, [...dmxInOut(), port('pwr', 'Alim tri', 'p17-32a', PWR, 'in'), port('soca', 'Sortie Socapex', 'socapex', PWR, 'out')]),
]

const VIDEO: DeviceTemplate[] = [
  // Switchers
  dev('bmd-atem-mini-pro', 'Blackmagic Design', 'ATEM Mini Pro', 'Vidéo', { kg: 1 }, [...series('in', 'HDMI in', 4, 'hdmi', V, 'in'), port('out', 'HDMI out', 'hdmi', V, 'out'), port('usb', 'USB webcam', 'usb', V, 'out'), net('Ethernet', 'rj45'), port('pwr', 'Alim 12 V', 'usb', PWR, 'in')]),
  dev('bmd-tvs-hd8', 'Blackmagic Design', 'ATEM Television Studio HD8', 'Vidéo', { u: 1, kg: 4 }, [...series('in', 'SDI in', 8, 'sdi', V, 'in'), port('pgm', 'Programme SDI', 'sdi', V, 'out'), ...series('aux', 'Aux SDI', 2, 'sdi', V, 'out'), port('mv', 'Multiview HDMI', 'hdmi', V, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('bmd-1me-hd', 'Blackmagic Design', 'ATEM 1 M/E Constellation HD', 'Vidéo', { u: 1, kg: 5 }, [...series('in', 'SDI in', 10, 'sdi', V, 'in'), ...series('aux', 'Aux SDI', 6, 'sdi', V, 'out'), port('mv', 'Multiview HDMI', 'hdmi', V, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('bmd-videohub-12', 'Blackmagic Design', 'Smart Videohub 12×12', 'Vidéo', { u: 1, kg: 3 }, [...series('in', 'SDI in', 12, 'sdi', V, 'in'), ...series('out', 'SDI out', 12, 'sdi', V, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('bmd-hyperdeck', 'Blackmagic Design', 'HyperDeck Studio HD Plus', 'Vidéo', { u: 1, kg: 2 }, [port('in', 'SDI in', 'sdi', V, 'in'), port('out', 'SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('bmd-bidir', 'Blackmagic Design', 'Micro Converter BiDirectional SDI/HDMI', 'Vidéo', { kg: 0.2 }, [port('sdiIn', 'SDI in', 'sdi', V, 'in'), port('sdiOut', 'SDI out', 'sdi', V, 'out'), port('hdmiIn', 'HDMI in', 'hdmi', V, 'in'), port('hdmiOut', 'HDMI out', 'hdmi', V, 'out'), port('pwr', 'Alim USB', 'usb', PWR, 'in')]),
  dev('decimator-md-hx', 'Decimator', 'MD-HX (convertisseur)', 'Vidéo', { kg: 0.3 }, [port('sdiIn', 'SDI in', 'sdi', V, 'in'), ...series('sdiOut', 'SDI out', 2, 'sdi', V, 'out'), port('hdmiIn', 'HDMI in', 'hdmi', V, 'in'), port('hdmiOut', 'HDMI out', 'hdmi', V, 'out'), port('pwr', 'Alim 12 V', 'usb', PWR, 'in')]),
  dev('analogway-pulse4k', 'Analog Way', 'Pulse 4K (scaler)', 'Vidéo', { u: 2, kg: 8 }, [...series('in', 'HDMI in', 4, 'hdmi', V, 'in'), ...series('sdi', 'SDI in', 2, 'sdi', V, 'in'), ...series('out', 'Sortie', 2, 'hdmi', V, 'out'), net('Ethernet', 'rj45'), iec()]),
  // Cameras
  dev('pana-ue150', 'Panasonic', 'AW-UE150 (PTZ)', 'Vidéo', { kg: 5 }, [port('sdi', '12G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE++)', 'rj45'), port('pwr', 'Alim 12 V', 'usb', PWR, 'in')]),
  dev('sony-fx6', 'Sony', 'FX6', 'Vidéo', { kg: 2 }, [port('sdi', '12G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), ...series('in', 'Audio in', 2, 'xlr3', A, 'in')]),
  dev('bmd-studio4k', 'Blackmagic Design', 'Studio Camera 4K Plus', 'Vidéo', { kg: 2 }, [port('hdmi', 'HDMI out', 'hdmi', V, 'out'), port('pwr', 'Alim 12 V', 'usb', PWR, 'in')]),
  // Displays & LED
  dev('barco-udx4k32', 'Barco', 'UDX-4K32 (vidéoprojecteur)', 'Vidéo', { kg: 98 }, [port('sdi', '12G-SDI in', 'sdi', V, 'in'), port('hdmi', 'HDMI in', 'hdmi', V, 'in'), port('hdbt', 'HDBaseT in', 'rj45', V, 'in'), net('LAN', 'rj45'), port('pwr', 'Secteur', 'p17-16a', PWR, 'in')]),
  dev('pana-rz120', 'Panasonic', 'PT-RZ120 (vidéoprojecteur)', 'Vidéo', { kg: 23 }, [port('sdi', 'SDI in', 'sdi', V, 'in'), port('hdmi', 'HDMI in', 'hdmi', V, 'in'), port('hdbt', 'DIGITAL LINK in', 'rj45', V, 'in'), net('LAN', 'rj45'), iec()]),
  dev('epson-eb-pu2010', 'Epson', 'EB-PU2010 (vidéoprojecteur)', 'Vidéo', { kg: 23 }, [port('sdi', 'SDI in', 'sdi', V, 'in'), port('hdmi', 'HDMI in', 'hdmi', V, 'in'), port('hdbt', 'HDBaseT in', 'rj45', V, 'in'), net('LAN', 'rj45'), iec()]),
  dev('novastar-vx1000', 'NovaStar', 'VX1000 (processeur LED)', 'Vidéo', { u: 2, kg: 6 }, [...series('hdmi', 'HDMI in', 2, 'hdmi', V, 'in'), port('sdi', 'SDI in', 'sdi', V, 'in'), ...series('led', 'Sortie LED', 10, 'ethercon', V, 'out'), net('Contrôle', 'rj45'), iec()]),
  dev('brompton-sx40', 'Brompton', 'Tessera SX40 (processeur LED)', 'Vidéo', { u: 1, kg: 5 }, [port('sdi', '12G-SDI in', 'sdi', V, 'in'), port('hdmi', 'HDMI in', 'hdmi', V, 'in'), ...series('led', 'Sortie LED', 4, 'ethercon', V, 'out'), net('Contrôle', 'rj45'), iec()]),
  dev('led-tile', 'Générique', 'Dalle LED 500×500', 'Vidéo', { kg: 8 }, [port('in', 'Data in', 'ethercon', V, 'in'), port('out', 'Data out', 'ethercon', V, 'out'), ...t1Link()]),
  dev('hdbt-tx', 'Générique', 'Émetteur HDBaseT', 'Vidéo', { kg: 0.4 }, [port('in', 'HDMI in', 'hdmi', V, 'in'), port('out', 'HDBaseT out', 'rj45', V, 'out'), port('pwr', 'Alim 12 V', 'usb', PWR, 'in')]),
  dev('hdbt-rx', 'Générique', 'Récepteur HDBaseT', 'Vidéo', { kg: 0.4 }, [port('in', 'HDBaseT in', 'rj45', V, 'in'), port('out', 'HDMI out', 'hdmi', V, 'out')]),
  dev('media-server', 'Générique', 'Serveur média (Resolume / Millumin)', 'Vidéo', { u: 2, kg: 12 }, [...series('out', 'Sortie', 4, 'hdmi', V, 'out'), net('Ethernet', 'rj45'), port('ltc', 'LTC in', 'xlr3', A, 'in'), iec()]),
]

const RESEAU: DeviceTemplate[] = [
  dev('luminex-gc10', 'Luminex', 'GigaCore 10', 'Réseau', { u: 1, kg: 2 }, [...series('p', 'Port', 8, 'ethercon', NET, 'io'), ...series('sfp', 'Fibre SFP', 2, 'opticalcon', NET, 'io'), t1()]),
  dev('luminex-gc16xt', 'Luminex', 'GigaCore 16Xt', 'Réseau', { u: 1, kg: 4 }, [...series('p', 'Port', 12, 'ethercon', NET, 'io'), ...series('sfp', 'Fibre SFP', 4, 'opticalcon', NET, 'io'), t1()]),
  dev('netgear-m4250', 'Netgear', 'M4250-10G2F-PoE+', 'Réseau', { u: 1, kg: 3 }, [...series('p', 'Port', 8, 'rj45', NET, 'io'), ...series('sfp', 'Fibre SFP', 2, 'opticalcon', NET, 'io'), iec()]),
  dev('cisco-sg350-10', 'Cisco', 'SG350-10', 'Réseau', { u: 1, kg: 2 }, [...series('p', 'Port', 10, 'rj45', NET, 'io'), iec()]),
  dev('wifi-ap', 'Générique', 'Point d’accès Wi-Fi (tablettes)', 'Réseau', { kg: 0.5 }, [net('Ethernet (PoE)', 'rj45')]),
]

const ENERGIE: DeviceTemplate[] = [
  dev('distro-63', 'Générique', 'Armoire 63A tri', 'Énergie', { kg: 35 }, [port('in', 'Arrivée P17 63A', 'p17-63a', PWR, 'in'), ...series('p32', 'P17 32A', 2, 'p17-32a', PWR, 'out'), ...series('p16', 'P17 16A', 6, 'p17-16a', PWR, 'out')]),
  dev('distro-16-6', 'Générique', 'Boîtier P17 16A → 6 powerCON', 'Énergie', { kg: 4 }, [port('in', 'Entrée P17 16A', 'p17-16a', PWR, 'in'), ...series('out', 'Sortie', 6, 'powercon-true1', PWR, 'out')]),
  dev('ups-1500', 'APC', 'Smart-UPS 1500 (onduleur)', 'Énergie', { u: 2, kg: 28 }, [port('in', 'Entrée', 'iec', PWR, 'in'), ...series('out', 'Sortie', 6, 'iec', PWR, 'out')]),
]

export const CATALOG: DeviceTemplate[] = [...SON, ...LUMIERE, ...VIDEO, ...RESEAU, ...ENERGIE]
