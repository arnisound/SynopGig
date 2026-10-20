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
const RF: SignalType = 'rf'

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
// Wireless: diversity antenna inputs, cascade outputs, transmitter antenna.
const antIn = () => [port('antA', 'Antenne A', 'bnc', RF, 'in'), port('antB', 'Antenne B', 'bnc', RF, 'in')]
const cascade = () => [port('cascA', 'Cascade A', 'bnc', RF, 'out'), port('cascB', 'Cascade B', 'bnc', RF, 'out')]
const antOut = () => port('ant', 'Antenne', 'bnc', RF, 'out')
const dc = (label = 'Alim DC') => port('pwr', label, 'dc', PWR, 'in')
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
  dev('shure-ulxd4d', 'Shure', 'ULXD4D', 'Son', { u: 1, kg: 3 }, [...antIn(), ...outs(2, 'Sortie XLR'), ...pair('net', 'Ethernet', 'rj45', NET), iec()]),
  dev('shure-ulxd4q', 'Shure', 'ULXD4Q', 'Son', { u: 1, kg: 4 }, [...antIn(), ...outs(4, 'Sortie XLR'), ...dante(), iec()]),
  dev('shure-ad4q', 'Shure', 'Axient Digital AD4Q', 'Son', { u: 1, kg: 5 }, [...antIn(), ...outs(4, 'Sortie XLR'), ...dante(), iec()]),
  dev('shure-p10t', 'Shure', 'PSM1000 P10T', 'Son', { u: 1, kg: 4 }, [antOut(), ...ins(2, 'Entrée', 'xlr3'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('shure-p3t', 'Shure', 'PSM300 P3T', 'Son', { u: 1, kg: 2 }, [antOut(), ...ins(2, 'Entrée', 'xlr3'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), port('pwr', 'Alim externe', 'dc', PWR, 'in')]),
  dev('senn-ewdx-em4', 'Sennheiser', 'EW-DX EM 4 Dante', 'Son', { u: 1, kg: 4 }, [...antIn(), ...outs(4, 'Sortie XLR'), ...dante(), iec()]),
  dev('senn-em300g4', 'Sennheiser', 'EM 300-500 G4', 'Son', { u: 1, kg: 1.5 }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), net('Ethernet', 'rj45'), port('pwr', 'Alim externe', 'dc', PWR, 'in')]),
  dev('senn-sr2050', 'Sennheiser', 'SR 2050 IEM', 'Son', { u: 1, kg: 4 }, [antOut(), ...ins(2, 'Entrée', 'xlr3'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), net('Ethernet', 'rj45'), iec()]),
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
  dev('dmxking-edmx4', 'DMXking', 'eDMX4 PRO', 'Lumière', { kg: 0.5 }, [net('Ethernet', 'rj45'), ...dmxOuts(4), port('pwr', 'Alim externe', 'dc', PWR, 'in')]),
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
  dev('bmd-atem-mini-pro', 'Blackmagic Design', 'ATEM Mini Pro', 'Vidéo', { kg: 1 }, [...series('in', 'HDMI in', 4, 'hdmi', V, 'in'), port('out', 'HDMI out', 'hdmi', V, 'out'), port('usb', 'USB webcam', 'usb', V, 'out'), net('Ethernet', 'rj45'), port('pwr', 'Alim 12 V', 'dc', PWR, 'in')]),
  dev('bmd-tvs-hd8', 'Blackmagic Design', 'ATEM Television Studio HD8', 'Vidéo', { u: 1, kg: 4 }, [...series('in', 'SDI in', 8, 'sdi', V, 'in'), port('pgm', 'Programme SDI', 'sdi', V, 'out'), ...series('aux', 'Aux SDI', 2, 'sdi', V, 'out'), port('mv', 'Multiview HDMI', 'hdmi', V, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('bmd-1me-hd', 'Blackmagic Design', 'ATEM 1 M/E Constellation HD', 'Vidéo', { u: 1, kg: 5 }, [...series('in', 'SDI in', 10, 'sdi', V, 'in'), ...series('aux', 'Aux SDI', 6, 'sdi', V, 'out'), port('mv', 'Multiview HDMI', 'hdmi', V, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('bmd-videohub-12', 'Blackmagic Design', 'Smart Videohub 12×12', 'Vidéo', { u: 1, kg: 3 }, [...series('in', 'SDI in', 12, 'sdi', V, 'in'), ...series('out', 'SDI out', 12, 'sdi', V, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('bmd-hyperdeck', 'Blackmagic Design', 'HyperDeck Studio HD Plus', 'Vidéo', { u: 1, kg: 2 }, [port('in', 'SDI in', 'sdi', V, 'in'), port('out', 'SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('bmd-bidir', 'Blackmagic Design', 'Micro Converter BiDirectional SDI/HDMI', 'Vidéo', { kg: 0.2 }, [port('sdiIn', 'SDI in', 'sdi', V, 'in'), port('sdiOut', 'SDI out', 'sdi', V, 'out'), port('hdmiIn', 'HDMI in', 'hdmi', V, 'in'), port('hdmiOut', 'HDMI out', 'hdmi', V, 'out'), port('pwr', 'Alim USB', 'usb', PWR, 'in')]),
  dev('decimator-md-hx', 'Decimator', 'MD-HX (convertisseur)', 'Vidéo', { kg: 0.3 }, [port('sdiIn', 'SDI in', 'sdi', V, 'in'), ...series('sdiOut', 'SDI out', 2, 'sdi', V, 'out'), port('hdmiIn', 'HDMI in', 'hdmi', V, 'in'), port('hdmiOut', 'HDMI out', 'hdmi', V, 'out'), port('pwr', 'Alim 12 V', 'dc', PWR, 'in')]),
  dev('analogway-pulse4k', 'Analog Way', 'Pulse 4K (scaler)', 'Vidéo', { u: 2, kg: 8 }, [...series('in', 'HDMI in', 4, 'hdmi', V, 'in'), ...series('sdi', 'SDI in', 2, 'sdi', V, 'in'), ...series('out', 'Sortie', 2, 'hdmi', V, 'out'), net('Ethernet', 'rj45'), iec()]),
  // Cameras
  dev('pana-ue150', 'Panasonic', 'AW-UE150 (PTZ)', 'Vidéo', { kg: 5 }, [port('sdi', '12G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE++)', 'rj45'), port('pwr', 'Alim 12 V', 'dc', PWR, 'in')]),
  dev('sony-fx6', 'Sony', 'FX6', 'Vidéo', { kg: 2 }, [port('sdi', '12G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), ...series('in', 'Audio in', 2, 'xlr3', A, 'in')]),
  dev('bmd-studio4k', 'Blackmagic Design', 'Studio Camera 4K Plus', 'Vidéo', { kg: 2 }, [port('hdmi', 'HDMI out', 'hdmi', V, 'out'), port('pwr', 'Alim 12 V', 'dc', PWR, 'in')]),
  // Displays & LED
  dev('barco-udx4k32', 'Barco', 'UDX-4K32 (vidéoprojecteur)', 'Vidéo', { kg: 98 }, [port('sdi', '12G-SDI in', 'sdi', V, 'in'), port('hdmi', 'HDMI in', 'hdmi', V, 'in'), port('hdbt', 'HDBaseT in', 'rj45', V, 'in'), net('LAN', 'rj45'), port('pwr', 'Secteur', 'p17-16a', PWR, 'in')]),
  dev('pana-rz120', 'Panasonic', 'PT-RZ120 (vidéoprojecteur)', 'Vidéo', { kg: 23 }, [port('sdi', 'SDI in', 'sdi', V, 'in'), port('hdmi', 'HDMI in', 'hdmi', V, 'in'), port('hdbt', 'DIGITAL LINK in', 'rj45', V, 'in'), net('LAN', 'rj45'), iec()]),
  dev('epson-eb-pu2010', 'Epson', 'EB-PU2010 (vidéoprojecteur)', 'Vidéo', { kg: 23 }, [port('sdi', 'SDI in', 'sdi', V, 'in'), port('hdmi', 'HDMI in', 'hdmi', V, 'in'), port('hdbt', 'HDBaseT in', 'rj45', V, 'in'), net('LAN', 'rj45'), iec()]),
  dev('novastar-vx1000', 'NovaStar', 'VX1000 (processeur LED)', 'Vidéo', { u: 2, kg: 6 }, [...series('hdmi', 'HDMI in', 2, 'hdmi', V, 'in'), port('sdi', 'SDI in', 'sdi', V, 'in'), ...series('led', 'Sortie LED', 10, 'ethercon', V, 'out'), net('Contrôle', 'rj45'), iec()]),
  dev('brompton-sx40', 'Brompton', 'Tessera SX40 (processeur LED)', 'Vidéo', { u: 1, kg: 5 }, [port('sdi', '12G-SDI in', 'sdi', V, 'in'), port('hdmi', 'HDMI in', 'hdmi', V, 'in'), ...series('led', 'Sortie LED', 4, 'ethercon', V, 'out'), net('Contrôle', 'rj45'), iec()]),
  dev('led-tile', 'Générique', 'Dalle LED 500×500', 'Vidéo', { kg: 8 }, [port('in', 'Data in', 'ethercon', V, 'in'), port('out', 'Data out', 'ethercon', V, 'out'), ...t1Link()]),
  dev('hdbt-tx', 'Générique', 'Émetteur HDBaseT', 'Vidéo', { kg: 0.4 }, [port('in', 'HDMI in', 'hdmi', V, 'in'), port('out', 'HDBaseT out', 'rj45', V, 'out'), port('pwr', 'Alim 12 V', 'dc', PWR, 'in')]),
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

// ---------------------------------------------------------------------------
// Extended catalogue

const CONSOLES: DeviceTemplate[] = [
  // Yamaha
  dev('yam-pm5', 'Yamaha', 'RIVAGE PM5 (surface)', 'Son', { kg: 68 }, [...ins(8), ...outs(8), ...pair('twin', 'TWINLANe', 'opticalcon', AES), ...dante(), net('Réseau', 'ethercon'), iec()]),
  dev('yam-dsp-rx', 'Yamaha', 'DSP-RX (moteur RIVAGE)', 'Son', { u: 3, kg: 16 }, [...pair('twin', 'TWINLANe', 'opticalcon', AES), ...dante(), net('Réseau', 'ethercon'), iec()]),
  dev('yam-rpio622', 'Yamaha', 'RPio622 (stagebox RIVAGE)', 'Son', { u: 10, kg: 40 }, [...ins(48), ...outs(24), ...pair('twin', 'TWINLANe', 'opticalcon', AES), iec()]),
  dev('yam-cl3', 'Yamaha', 'CL3', 'Son', { kg: 30 }, [...ins(8, 'Omni in'), ...outs(8, 'Omni out'), port('aes', 'AES out', 'xlr3', AES, 'out'), ...dante(), net('Réseau', 'rj45'), iec()]),
  dev('yam-cl1', 'Yamaha', 'CL1', 'Son', { kg: 20 }, [...ins(8, 'Omni in'), ...outs(8, 'Omni out'), port('aes', 'AES out', 'xlr3', AES, 'out'), ...dante(), net('Réseau', 'rj45'), iec()]),
  dev('yam-ql5', 'Yamaha', 'QL5', 'Son', { kg: 30 }, [...ins(32), ...outs(16), ...dante(), net('Réseau', 'rj45'), iec()]),
  dev('yam-tf1', 'Yamaha', 'TF1', 'Son', { kg: 13 }, [...ins(16), ...outs(8, 'Omni out'), net('Réseau', 'rj45'), iec()]),
  dev('yam-tf3', 'Yamaha', 'TF3', 'Son', { kg: 17 }, [...ins(24), ...outs(16, 'Omni out'), net('Réseau', 'rj45'), iec()]),
  dev('yam-dm3', 'Yamaha', 'DM3', 'Son', { kg: 7 }, [...ins(16), ...outs(8), ...dante(), net('Réseau', 'rj45'), iec()]),
  dev('yam-mg16xu', 'Yamaha', 'MG16XU (analogique)', 'Son', { kg: 6 }, [...ins(10), ...series('st', 'Stéréo in', 4, 'jack', A, 'in'), ...series('main', 'Main out', 2, 'xlr3', A, 'out'), ...series('aux', 'Aux out', 4, 'jack', A, 'out'), dc('Alim externe')]),
  // Allen & Heath
  dev('ah-sq6', 'Allen & Heath', 'SQ-6', 'Son', { kg: 16 }, [...ins(24), ...outs(14), port('slink', 'SLink', 'ethercon', AES, 'io'), net('Réseau', 'rj45'), iec()]),
  dev('ah-cq20b', 'Allen & Heath', 'CQ-20B', 'Son', { kg: 3 }, [...ins(16), ...outs(6), net('Réseau', 'rj45'), dc('Alim externe')]),
  dev('ah-qu16', 'Allen & Heath', 'Qu-16', 'Son', { kg: 12 }, [...ins(16), ...outs(12), port('dsnake', 'dSNAKE', 'ethercon', AES, 'io'), net('Réseau', 'rj45'), iec()]),
  dev('ah-dm32', 'Allen & Heath', 'dLive DM32 (MixRack)', 'Son', { u: 6, kg: 22 }, [...ins(32), ...outs(16), ...pair('gigaace', 'gigaACE', 'ethercon', AES), net('Réseau', 'rj45'), iec()]),
  dev('ah-zed22fx', 'Allen & Heath', 'ZED-22FX (analogique)', 'Son', { kg: 8 }, [...ins(16), ...series('main', 'Main out', 2, 'xlr3', A, 'out'), ...series('aux', 'Aux out', 4, 'jack', A, 'out'), iec()]),
  // Midas / Behringer
  dev('midas-hd96', 'Midas', 'HD96-24', 'Son', { kg: 50 }, [...ins(8), ...outs(8), ...pair('aes50', 'AES50', 'ethercon', AES), port('madi', 'MADI (fibre)', 'opticalcon', AES, 'io'), net('Réseau', 'rj45'), iec()]),
  dev('midas-pro2', 'Midas', 'PRO2', 'Son', { kg: 46 }, [...ins(8), ...outs(8), ...pair('aes50', 'AES50', 'ethercon', AES), net('Réseau', 'rj45'), iec()]),
  dev('midas-m32c', 'Midas', 'M32C (rack DSP)', 'Son', { u: 1, kg: 4 }, [...pair('aes50', 'AES50', 'ethercon', AES), port('ultranet', 'Ultranet', 'rj45', AES, 'out'), net('Remote', 'rj45'), iec()]),
  dev('midas-mr18', 'Midas', 'MR18 (rack)', 'Son', { u: 3, kg: 4 }, [...ins(16), ...outs(6), port('ultranet', 'Ultranet', 'rj45', AES, 'out'), net('Réseau', 'rj45'), iec()]),
  dev('beh-x32-compact', 'Behringer', 'X32 Compact', 'Son', { kg: 15 }, [...ins(16), ...outs(8), ...pair('aes50', 'AES50', 'ethercon', AES), port('ultranet', 'Ultranet', 'rj45', AES, 'out'), net('Remote', 'rj45'), iec()]),
  dev('beh-x32-rack', 'Behringer', 'X32 Rack', 'Son', { u: 3, kg: 6 }, [...ins(16), ...outs(8), ...pair('aes50', 'AES50', 'ethercon', AES), port('ultranet', 'Ultranet', 'rj45', AES, 'out'), net('Remote', 'rj45'), iec()]),
  dev('beh-xr18', 'Behringer', 'XR18 (rack)', 'Son', { kg: 2 }, [...ins(16), ...outs(6), port('ultranet', 'Ultranet', 'rj45', AES, 'out'), net('Réseau', 'rj45'), iec()]),
  dev('beh-wing-rack', 'Behringer', 'Wing Rack', 'Son', { u: 4, kg: 8 }, [...ins(24), ...outs(8), ...pair('aes50', 'AES50', 'ethercon', AES), port('aes50C', 'AES50 C', 'ethercon', AES, 'io'), net('Réseau', 'rj45'), iec()]),
  // DiGiCo
  dev('digico-s21', 'DiGiCo', 'S21', 'Son', { kg: 22 }, [...ins(24), ...outs(12), port('aesIn', 'AES in', 'xlr3', AES, 'in'), port('aesOut', 'AES out', 'xlr3', AES, 'out'), net('Réseau', 'ethercon'), iec()]),
  dev('digico-sd9', 'DiGiCo', 'SD9', 'Son', { kg: 25 }, [...ins(8), ...outs(8), port('madiIn', 'MADI in', 'sdi', AES, 'in'), port('madiOut', 'MADI out', 'sdi', AES, 'out'), net('Réseau', 'ethercon'), iec()]),
  dev('digico-sd10', 'DiGiCo', 'SD10', 'Son', { kg: 47 }, [...ins(8), ...outs(8), port('madiInA', 'MADI in A', 'sdi', AES, 'in'), port('madiOutA', 'MADI out A', 'sdi', AES, 'out'), ...pair('fibre', 'Optocore', 'opticalcon', AES), net('Réseau', 'ethercon'), iec()]),
  dev('digico-q225', 'DiGiCo', 'Quantum 225', 'Son', { kg: 25 }, [...ins(8), ...outs(8), port('madiIn', 'MADI in', 'sdi', AES, 'in'), port('madiOut', 'MADI out', 'sdi', AES, 'out'), net('Réseau', 'ethercon'), iec()]),
  // Others
  dev('sc-vi1000', 'Soundcraft', 'Vi1000', 'Son', { kg: 27 }, [...ins(16), ...outs(16), port('madiIn', 'MADI in', 'sdi', AES, 'in'), port('madiOut', 'MADI out', 'sdi', AES, 'out'), net('Réseau', 'rj45'), iec()]),
  dev('sc-si-impact', 'Soundcraft', 'Si Impact', 'Son', { kg: 18 }, [...ins(32), ...outs(16), net('Réseau', 'rj45'), iec()]),
  dev('sc-ui24r', 'Soundcraft', 'Ui24R (rack)', 'Son', { u: 3, kg: 5 }, [...ins(20), ...outs(10), net('Réseau', 'rj45'), iec()]),
  dev('presonus-32sx', 'PreSonus', 'StudioLive 32SX', 'Son', { kg: 13 }, [...ins(32), ...outs(14), net('AVB', 'ethercon'), iec()]),
  dev('presonus-32r', 'PreSonus', 'StudioLive 32R (rack)', 'Son', { u: 3, kg: 7 }, [...ins(32), ...outs(16), net('AVB', 'ethercon'), iec()]),
  dev('avid-s6l-24c', 'Avid', 'VENUE S6L-24C (surface)', 'Son', { kg: 44 }, [...ins(8), ...outs(8), ...pair('avb', 'AVB', 'ethercon', AES), net('ECx', 'ethercon'), iec()]),
  dev('avid-e6l', 'Avid', 'E6L-144 (moteur)', 'Son', { u: 4, kg: 20 }, [...pair('avb', 'AVB', 'ethercon', AES), ...pair('stage', 'Stage', 'ethercon', AES), iec()]),
  dev('avid-stage64', 'Avid', 'Stage 64 (stagebox)', 'Son', { u: 8, kg: 25 }, [...ins(48), ...outs(16), ...pair('avb', 'AVB', 'ethercon', AES), iec()]),
  dev('ssl-l200', 'Solid State Logic', 'Live L200 Plus', 'Son', { kg: 40 }, [...ins(8), ...outs(8), port('madi', 'MADI (fibre)', 'opticalcon', AES, 'io'), ...dante(), net('Réseau', 'rj45'), iec()]),
  dev('ssl-l350', 'Solid State Logic', 'Live L350 Plus', 'Son', { kg: 60 }, [...ins(8), ...outs(8), port('madi', 'MADI (fibre)', 'opticalcon', AES, 'io'), ...dante(), net('Réseau', 'rj45'), iec()]),
]

const DIFFUSION: DeviceTemplate[] = [
  // Fohhn
  dev('fohhn-lfi220', 'Fohhn', 'Linea Focus LFI-220 (colonne orientable active)', 'Son', { kg: 22 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Thru', 'xlr3', A, 'out'), net('Dante / Fohhn-Net', 'ethercon'), ...t1Link()]),
  dev('fohhn-lfi450', 'Fohhn', 'Linea Focus LFI-450 (colonne orientable active)', 'Son', { kg: 40 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Thru', 'xlr3', A, 'out'), net('Dante / Fohhn-Net', 'ethercon'), ...t1Link()]),
  dev('fohhn-lx10', 'Fohhn', 'Linea LX-10', 'Son', { kg: 5 }, hpIn()),
  dev('fohhn-lx61', 'Fohhn', 'Linea LX-61', 'Son', { kg: 12 }, hpIn()),
  dev('fohhn-lx150', 'Fohhn', 'Linea LX-150 (colonne)', 'Son', { kg: 18 }, hpIn()),
  dev('fohhn-lx220', 'Fohhn', 'Linea LX-220 (colonne)', 'Son', { kg: 25 }, hpIn()),
  dev('fohhn-xs10', 'Fohhn', 'XS-10 (sub)', 'Son', { kg: 30 }, hpIn()),
  dev('fohhn-xs20', 'Fohhn', 'XS-20 (sub)', 'Son', { kg: 35 }, hpIn()),
  dev('fohhn-xs22', 'Fohhn', 'XS-22 (sub actif)', 'Son', { kg: 40 }, [...series('in', 'Entrée', 2, 'xlr3', A, 'in'), ...series('thru', 'Thru', 2, 'xlr3', A, 'out'), ...series('hp', 'Sortie satellite', 2, 'speakon', HP, 'out'), iec()]),
  dev('fohhn-xs30', 'Fohhn', 'XS-30 (sub)', 'Son', { kg: 50 }, hpIn()),
  dev('fohhn-d41200', 'Fohhn', 'D-4.1200 (ampli DSP)', 'Son', { u: 2, kg: 12 }, [...ins(4), ...series('hp', 'Sortie HP', 4, 'speakon', HP, 'out'), net('Fohhn-Net', 'rj45'), pc32()]),
  dev('fohhn-di42000', 'Fohhn', 'DI-4.2000 (ampli Dante)', 'Son', { u: 2, kg: 13 }, [...ins(4), ...dante(), ...series('hp', 'Sortie HP', 4, 'speakon', HP, 'out'), pc32()]),
  // Axiom Pro Audio (Proel)
  dev('axiom-ax2010a', 'Axiom Pro Audio', 'AX2010A (line array actif)', 'Son', { kg: 35 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Link', 'xlr3', A, 'out'), ...t1Link()]),
  dev('axiom-ax2010p', 'Axiom Pro Audio', 'AX2010P (line array passif)', 'Son', { kg: 32 }, hpIn()),
  dev('axiom-ax1012a', 'Axiom Pro Audio', 'AX1012A (courbure constante active)', 'Son', { kg: 33 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Link', 'xlr3', A, 'out'), ...t1Link()]),
  dev('axiom-ax1012p', 'Axiom Pro Audio', 'AX1012P (courbure constante passive)', 'Son', { kg: 30 }, hpIn()),
  dev('axiom-ax800a', 'Axiom Pro Audio', 'AX800A (line array compact actif)', 'Son', { kg: 20 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Link', 'xlr3', A, 'out'), ...t1Link()]),
  dev('axiom-ax2065a', 'Axiom Pro Audio', 'AX2065A (line array compact actif)', 'Son', { kg: 18 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Link', 'xlr3', A, 'out'), ...t1Link()]),
  dev('axiom-ax2065p', 'Axiom Pro Audio', 'AX2065P (line array compact passif)', 'Son', { kg: 16 }, hpIn()),
  dev('axiom-sw1800a', 'Axiom Pro Audio', 'SW1800A (sub actif 2×18")', 'Son', { kg: 95 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Link', 'xlr3', A, 'out'), ...t1Link()]),
  dev('axiom-sw18a', 'Axiom Pro Audio', 'SW18A (sub actif 18")', 'Son', { kg: 60 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Link', 'xlr3', A, 'out'), ...t1Link()]),
  dev('axiom-sw218xa', 'Axiom Pro Audio', 'SW218XA (sub actif 2×18")', 'Son', { kg: 110 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Link', 'xlr3', A, 'out'), ...t1Link()]),
  dev('axiom-ed12p', 'Axiom Pro Audio', 'ED12P (passive)', 'Son', { kg: 18 }, hpIn()),
  dev('axiom-ed15p', 'Axiom Pro Audio', 'ED15P (passive)', 'Son', { kg: 24 }, hpIn()),
  dev('axiom-ed210p', 'Axiom Pro Audio', 'ED210P (passive)', 'Son', { kg: 22 }, hpIn()),
  // Yamaha
  dev('yam-dzr12', 'Yamaha', 'DZR12 (amplifiée)', 'Son', { kg: 23 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Thru', 'xlr3', A, 'out'), iec()]),
  dev('yam-dzr315', 'Yamaha', 'DZR315 (amplifiée 3 voies)', 'Son', { kg: 33 }, [port('in', 'Entrée', 'xlr3', A, 'in'), port('thru', 'Thru', 'xlr3', A, 'out'), iec()]),
  dev('yam-dxs18', 'Yamaha', 'DXS18XLF (sub amplifié)', 'Son', { kg: 49 }, [...series('in', 'Entrée', 2, 'xlr3', A, 'in'), ...series('thru', 'Thru', 2, 'xlr3', A, 'out'), iec()]),
  dev('yam-czr12', 'Yamaha', 'CZR12 (passive)', 'Son', { kg: 19 }, hpIn()),
  dev('yam-px10', 'Yamaha', 'PX10 (ampli)', 'Son', { u: 2, kg: 9 }, [...ins(2), ...series('hp', 'Sortie HP', 2, 'speakon', HP, 'out'), iec()]),
  dev('yam-xmv4280', 'Yamaha', 'XMV4280-D (ampli Dante)', 'Son', { u: 1, kg: 6 }, [...dante(), ...series('hp', 'Sortie HP', 4, 'speakon', HP, 'out'), iec()]),
  dev('yam-mrx7d', 'Yamaha', 'MRX7-D (processeur)', 'Son', { u: 1, kg: 4 }, [...ins(8), ...outs(8), ...dante(), net('Réseau', 'rj45'), iec()]),
]

const HF: DeviceTemplate[] = [
  // Receivers
  dev('shure-blx4r', 'Shure', 'BLX4R (récepteur)', 'Son', { u: 1, kg: 1 }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), dc()]),
  dev('shure-slxd4', 'Shure', 'SLXD4 (récepteur)', 'Son', { u: 1, kg: 1 }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), dc()]),
  dev('shure-slxd4d', 'Shure', 'SLXD4D (récepteur double)', 'Son', { u: 1, kg: 3 }, [...antIn(), ...outs(2, 'Sortie XLR'), net('Ethernet', 'rj45'), iec()]),
  dev('shure-qlxd4', 'Shure', 'QLXD4 (récepteur)', 'Son', { u: 1, kg: 1.5 }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), net('Ethernet', 'rj45'), dc()]),
  dev('shure-ad4d', 'Shure', 'Axient Digital AD4D (récepteur double)', 'Son', { u: 1, kg: 4 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), ...dante(), iec()]),
  dev('senn-ewd-em', 'Sennheiser', 'EW-D EM (récepteur)', 'Son', { kg: 0.6 }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), dc()]),
  dev('senn-ewdx-em2', 'Sennheiser', 'EW-DX EM 2 (récepteur double)', 'Son', { u: 1, kg: 3 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), net('Ethernet', 'rj45'), iec()]),
  dev('senn-em6000', 'Sennheiser', 'EM 6000 Dante (récepteur double)', 'Son', { u: 1, kg: 5 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), port('aes', 'AES3 out', 'xlr3', AES, 'out'), ...dante(), iec()]),
  dev('senn-em3732', 'Sennheiser', 'EM 3732-II (récepteur double)', 'Son', { u: 1, kg: 4 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), net('Ethernet', 'rj45'), iec()]),
  dev('at-atw-r3210', 'Audio-Technica', 'ATW-R3210 (récepteur 3000)', 'Son', { u: 1, kg: 1.5 }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), net('Ethernet', 'rj45'), dc()]),
  dev('at-atw-r5220', 'Audio-Technica', 'ATW-R5220 (récepteur double 5000)', 'Son', { u: 1, kg: 4 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), ...dante(), iec()]),
  dev('wisy-mrk960', 'Wisycom', 'MRK960 (récepteur double)', 'Son', { u: 1, kg: 3 }, [...antIn(), ...outs(2, 'Sortie XLR'), port('aes', 'AES out', 'xlr3', AES, 'out'), net('Ethernet', 'rj45'), iec()]),
  dev('lectro-dsqd', 'Lectrosonics', 'DSQD (récepteur 4 voies)', 'Son', { u: 1, kg: 4 }, [...antIn(), ...outs(4, 'Sortie XLR'), ...dante(), iec()]),
  // Handhelds and bodypacks (no cable, listed for inventory and cases)
  dev('shure-slxd2-b58', 'Shure', 'SLXD2/B58 (émetteur main)', 'Son', { kg: 0.3 }, []),
  dev('shure-qlxd2-b87', 'Shure', 'QLXD2/B87A (émetteur main)', 'Son', { kg: 0.3 }, []),
  dev('shure-ad2-ksm9', 'Shure', 'AD2/KSM9 (émetteur main)', 'Son', { kg: 0.4 }, []),
  dev('shure-ad1', 'Shure', 'AD1 (émetteur ceinture)', 'Son', { kg: 0.1 }, [port('mic', 'Entrée micro', 'minijack', A, 'in')]),
  dev('senn-skm6000', 'Sennheiser', 'SKM 6000 (émetteur main)', 'Son', { kg: 0.4 }, []),
  dev('senn-sk6000', 'Sennheiser', 'SK 6000 (émetteur ceinture)', 'Son', { kg: 0.1 }, [port('mic', 'Entrée micro', 'minijack', A, 'in')]),
  dev('senn-ewdx-skm', 'Sennheiser', 'EW-DX SKM (émetteur main)', 'Son', { kg: 0.3 }, []),
  dev('senn-ewdx-sk', 'Sennheiser', 'EW-DX SK (émetteur ceinture)', 'Son', { kg: 0.1 }, [port('mic', 'Entrée micro', 'minijack', A, 'in')]),
  dev('at-atw-t3202', 'Audio-Technica', 'ATW-T3202 (émetteur main)', 'Son', { kg: 0.3 }, []),
  dev('dpa-4088', 'DPA', '4088 (serre-tête)', 'Son', { kg: 0.02 }, [port('out', 'Sortie (MicroDot)', 'minijack', A, 'out')]),
  dev('dpa-4061', 'DPA', '4061 (cravate)', 'Son', { kg: 0.01 }, [port('out', 'Sortie (MicroDot)', 'minijack', A, 'out')]),
  // In-ear monitoring
  dev('shure-p9t', 'Shure', 'PSM900 P9T (émetteur ear)', 'Son', { u: 1, kg: 3 }, [antOut(), ...ins(2, 'Entrée'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), iec()]),
  dev('senn-sr-iem-g4', 'Sennheiser', 'SR IEM G4 (émetteur ear)', 'Son', { u: 1, kg: 2 }, [antOut(), ...ins(2, 'Entrée'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), dc()]),
  dev('wisy-mtk982', 'Wisycom', 'MTK982 (émetteur ear double)', 'Son', { u: 1, kg: 3 }, [antOut(), ...ins(4, 'Entrée'), net('Ethernet', 'rj45'), iec()]),
  dev('at-m3t', 'Audio-Technica', 'M3 (émetteur ear)', 'Son', { u: 1, kg: 2 }, [antOut(), ...ins(2, 'Entrée'), dc()]),
  dev('shure-p10r', 'Shure', 'P10R+ (récepteur ear ceinture)', 'Son', { kg: 0.2 }, [port('hp', 'Écouteurs', 'minijack', A, 'out')]),
  dev('shure-p9ra', 'Shure', 'P9RA+ (récepteur ear ceinture)', 'Son', { kg: 0.2 }, [port('hp', 'Écouteurs', 'minijack', A, 'out')]),
  dev('senn-ek-iem-g4', 'Sennheiser', 'EK IEM G4 (récepteur ear ceinture)', 'Son', { kg: 0.2 }, [port('hp', 'Écouteurs', 'minijack', A, 'out')]),
  // Antenna distribution, combiners, boosters
  dev('shure-ua844', 'Shure', 'UA844+SWB (distributeur d’antennes 1→5)', 'Son', { u: 1, kg: 3 }, [...antIn(), ...series('outA', 'Sortie A', 5, 'bnc', RF, 'out'), ...series('outB', 'Sortie B', 5, 'bnc', RF, 'out'), ...cascade(), iec()]),
  dev('shure-ua845', 'Shure', 'UA845UWB (distributeur d’antennes 1→5)', 'Son', { u: 1, kg: 3 }, [...antIn(), ...series('outA', 'Sortie A', 5, 'bnc', RF, 'out'), ...series('outB', 'Sortie B', 5, 'bnc', RF, 'out'), ...cascade(), net('Ethernet', 'rj45'), iec()]),
  dev('senn-asa214', 'Sennheiser', 'ASA 214 (splitter d’antennes 1→4)', 'Son', { u: 1, kg: 3 }, [...antIn(), ...series('outA', 'Sortie A', 4, 'bnc', RF, 'out'), ...series('outB', 'Sortie B', 4, 'bnc', RF, 'out'), iec()]),
  dev('senn-asa1', 'Sennheiser', 'ASA 1 (splitter d’antennes actif)', 'Son', { kg: 1 }, [...antIn(), ...series('outA', 'Sortie A', 4, 'bnc', RF, 'out'), ...series('outB', 'Sortie B', 4, 'bnc', RF, 'out'), dc()]),
  dev('wisy-mpr', 'Wisycom', 'MPR50-IEM (distributeur d’antennes)', 'Son', { u: 1, kg: 3 }, [...antIn(), ...series('outA', 'Sortie A', 8, 'bnc', RF, 'out'), ...series('outB', 'Sortie B', 8, 'bnc', RF, 'out'), iec()]),
  dev('shure-pa821', 'Shure', 'PA821B (combineur ear 8→1)', 'Son', { u: 1, kg: 4 }, [...series('in', 'Entrée émetteur', 8, 'bnc', RF, 'in'), port('ant', 'Sortie antenne', 'bnc', RF, 'out'), iec()]),
  dev('senn-ac3200', 'Sennheiser', 'AC 3200-II (combineur ear 8→1)', 'Son', { u: 1, kg: 4 }, [...series('in', 'Entrée émetteur', 8, 'bnc', RF, 'in'), port('ant', 'Sortie antenne', 'bnc', RF, 'out'), iec()]),
  dev('senn-ac41', 'Sennheiser', 'AC 41 (combineur ear 4→1)', 'Son', { u: 1, kg: 2 }, [...series('in', 'Entrée émetteur', 4, 'bnc', RF, 'in'), port('ant', 'Sortie antenne', 'bnc', RF, 'out'), dc()]),
  dev('shure-ua221', 'Shure', 'UA221 (splitter / combineur passif)', 'Son', { kg: 0.2 }, [port('in', 'Commun', 'bnc', RF, 'in'), ...series('out', 'Sortie', 2, 'bnc', RF, 'out')]),
  dev('rf-ab-switch', 'Générique', 'Commutateur d’antennes A/B (HF)', 'Son', { kg: 0.5 }, [...series('in', 'Antenne', 2, 'bnc', RF, 'in'), port('out', 'Sortie', 'bnc', RF, 'out'), dc()]),
  dev('shure-ua834', 'Shure', 'UA834 (amplificateur d’antenne en ligne)', 'Son', { kg: 0.2 }, [port('in', 'Entrée antenne', 'bnc', RF, 'in'), port('out', 'Sortie', 'bnc', RF, 'out')]),
  dev('senn-ab4', 'Sennheiser', 'AB 4 (booster d’antenne)', 'Son', { kg: 0.2 }, [port('in', 'Entrée antenne', 'bnc', RF, 'in'), port('out', 'Sortie', 'bnc', RF, 'out')]),
  dev('wisy-lnfa', 'Wisycom', 'LNFA (amplificateur fibre d’antenne)', 'Son', { kg: 0.5 }, [port('in', 'Entrée antenne', 'bnc', RF, 'in'), port('fibre', 'Sortie fibre', 'opticalcon', RF, 'out'), dc()]),
  // Antennas
  dev('shure-ua874', 'Shure', 'UA874 (antenne directive active)', 'Son', { kg: 0.6 }, [port('out', 'Sortie', 'bnc', RF, 'out')]),
  dev('shure-ua860', 'Shure', 'UA860SWB (antenne omni passive)', 'Son', { kg: 0.3 }, [port('out', 'Connecteur', 'bnc', RF, 'io')]),
  dev('shure-ha8089', 'Shure', 'HA-8089 (antenne hélicoïdale ear)', 'Son', { kg: 1 }, [port('in', 'Connecteur', 'ntype', RF, 'io')]),
  dev('senn-a2003', 'Sennheiser', 'A 2003 UHF (antenne directive passive)', 'Son', { kg: 0.5 }, [port('out', 'Connecteur', 'bnc', RF, 'io')]),
  dev('senn-ad3700', 'Sennheiser', 'AD 3700 (antenne directive active)', 'Son', { kg: 0.6 }, [port('out', 'Sortie', 'bnc', RF, 'out')]),
  dev('senn-a1031', 'Sennheiser', 'A 1031-U (antenne omni passive)', 'Son', { kg: 0.2 }, [port('out', 'Connecteur', 'bnc', RF, 'io')]),
  dev('rfvenue-fin', 'RF Venue', 'Diversity Fin (antenne double)', 'Son', { kg: 1 }, [port('outA', 'Sortie A', 'bnc', RF, 'out'), port('outB', 'Sortie B', 'bnc', RF, 'out')]),
  dev('rfvenue-cp-beam', 'RF Venue', 'CP Beam (antenne hélicoïdale)', 'Son', { kg: 0.8 }, [port('in', 'Connecteur', 'bnc', RF, 'io')]),
]

const MULTIPAIRE: DeviceTemplate[] = [
  dev('rmp54-fanout-in', 'Générique', 'Éclaté RMP 54p → 16 XLR femelles (plateau)', 'Son', { kg: 2 }, [...ins(16, 'XLR'), port('rmp', 'RMP 54p', 'rmp54', A, 'out')]),
  dev('rmp54-fanout-out', 'Générique', 'Éclaté RMP 54p → 16 XLR mâles (console)', 'Son', { kg: 2 }, [port('rmp', 'RMP 54p', 'rmp54', A, 'in'), ...outs(16, 'XLR')]),
  dev('rmp54-fanout-12-4', 'Klotz', 'Éclaté RMP 54p → 12 XLR M / 4 XLR F', 'Son', { kg: 2 }, [port('rmp', 'RMP 54p', 'rmp54', A, 'io'), ...outs(12, 'XLR M'), ...ins(4, 'XLR F')]),
  dev('rmp54-box', 'Générique', 'Boîte de scène RMP 54p (16 entrées)', 'Son', { kg: 4 }, [...ins(16), port('rmp', 'RMP 54p', 'rmp54', A, 'out')]),
  dev('rmp54-splitter', 'Générique', 'Splitter micro 16 voies RMP 54p (2 départs)', 'Son', { u: 3, kg: 8 }, [port('in', 'RMP 54p in', 'rmp54', A, 'in'), port('outA', 'RMP 54p direct', 'rmp54', A, 'out'), port('outB', 'RMP 54p isolé', 'rmp54', A, 'out')]),
]

const VIDEO_MORE: DeviceTemplate[] = [
  // Roland switchers
  dev('roland-v1hd', 'Roland', 'V-1HD+ (mélangeur)', 'Vidéo', { kg: 2 }, [...series('in', 'HDMI in', 4, 'hdmi', V, 'in'), port('pgm', 'HDMI PGM', 'hdmi', V, 'out'), port('pvw', 'HDMI PVW / Multiview', 'hdmi', V, 'out'), ...series('ain', 'Audio in', 2, 'jack', A, 'in'), port('usb', 'USB', 'usb', V, 'out'), dc()]),
  dev('roland-v02hd', 'Roland', 'V-02HD MK II (mélangeur)', 'Vidéo', { kg: 1 }, [...series('in', 'HDMI in', 2, 'hdmi', V, 'in'), ...series('out', 'HDMI out', 2, 'hdmi', V, 'out'), port('usb', 'USB', 'usb', V, 'out'), dc()]),
  dev('roland-v8hd', 'Roland', 'V-8HD (mélangeur)', 'Vidéo', { kg: 4 }, [...series('in', 'HDMI in', 8, 'hdmi', V, 'in'), ...series('out', 'HDMI out', 3, 'hdmi', V, 'out'), ...series('ain', 'Audio in', 2, 'xlr3', A, 'in'), net('LAN', 'rj45'), iec()]),
  dev('roland-v60hd', 'Roland', 'V-60HD (mélangeur)', 'Vidéo', { kg: 5 }, [...series('sdi', 'SDI in', 4, 'sdi', V, 'in'), ...series('hdmi', 'HDMI in', 2, 'hdmi', V, 'in'), port('pgmSdi', 'SDI PGM', 'sdi', V, 'out'), port('auxSdi', 'SDI AUX', 'sdi', V, 'out'), port('pgmHdmi', 'HDMI PGM', 'hdmi', V, 'out'), port('mv', 'HDMI Multiview', 'hdmi', V, 'out'), ...series('ain', 'Audio in', 2, 'xlr3', A, 'in'), net('LAN', 'rj45'), iec()]),
  dev('roland-v160hd', 'Roland', 'V-160HD (mélangeur)', 'Vidéo', { kg: 8 }, [...series('sdi', 'SDI in', 8, 'sdi', V, 'in'), ...series('hdmi', 'HDMI in', 8, 'hdmi', V, 'in'), ...series('sdiOut', 'SDI out', 3, 'sdi', V, 'out'), ...series('hdmiOut', 'HDMI out', 3, 'hdmi', V, 'out'), ...series('ain', 'Audio in', 4, 'xlr3', A, 'in'), net('LAN', 'rj45'), iec()]),
  dev('roland-vr6hd', 'Roland', 'VR-6HD (mélangeur AV streaming)', 'Vidéo', { kg: 5 }, [...series('hdmi', 'HDMI in', 6, 'hdmi', V, 'in'), ...series('out', 'HDMI out', 3, 'hdmi', V, 'out'), ...ins(4, 'Micro'), port('usb', 'USB stream', 'usb', V, 'out'), net('LAN', 'rj45'), iec()]),
  dev('roland-vr120hd', 'Roland', 'VR-120HD (mélangeur AV)', 'Vidéo', { kg: 9 }, [...series('sdi', 'SDI in', 6, 'sdi', V, 'in'), ...series('hdmi', 'HDMI in', 6, 'hdmi', V, 'in'), ...series('sdiOut', 'SDI out', 2, 'sdi', V, 'out'), ...series('hdmiOut', 'HDMI out', 3, 'hdmi', V, 'out'), ...ins(8, 'Micro'), net('LAN', 'rj45'), iec()]),
  dev('roland-p20hd', 'Roland', 'P-20HD (enregistreur / replay)', 'Vidéo', { kg: 2 }, [...series('in', 'HDMI in', 4, 'hdmi', V, 'in'), ...series('out', 'HDMI out', 2, 'hdmi', V, 'out'), dc()]),
  // PTZ cameras
  dev('pana-ue160', 'Panasonic', 'AW-UE160 (PTZ)', 'Vidéo', { kg: 5 }, [port('sdi', '12G-SDI out', 'sdi', V, 'out'), port('sdi3g', '3G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE++)', 'rj45'), dc('Alim 12 V')]),
  dev('pana-ue100', 'Panasonic', 'AW-UE100 (PTZ)', 'Vidéo', { kg: 4 }, [port('sdi', '12G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE+)', 'rj45'), dc('Alim 12 V')]),
  dev('pana-ue40', 'Panasonic', 'AW-UE40 (PTZ)', 'Vidéo', { kg: 2 }, [port('sdi', '3G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE+)', 'rj45'), dc('Alim 12 V')]),
  dev('pana-he40s', 'Panasonic', 'AW-HE40S (PTZ)', 'Vidéo', { kg: 2 }, [port('sdi', 'SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE+)', 'rj45'), dc('Alim 12 V')]),
  dev('sony-brc-x400', 'Sony', 'BRC-X400 (PTZ)', 'Vidéo', { kg: 3 }, [port('sdi', '3G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE+)', 'rj45'), dc('Alim 12 V')]),
  dev('sony-srg-x400', 'Sony', 'SRG-X400 (PTZ)', 'Vidéo', { kg: 2 }, [port('sdi', '3G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE+)', 'rj45'), dc('Alim 12 V')]),
  dev('sony-brc-x1000', 'Sony', 'BRC-X1000 (PTZ 4K)', 'Vidéo', { kg: 4 }, [port('sdi', '3G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN', 'rj45'), dc('Alim 12 V')]),
  dev('sony-fr7', 'Sony', 'FR7 (PTZ cinéma)', 'Vidéo', { kg: 5 }, [...series('sdi', '12G-SDI out', 2, 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN', 'rj45'), dc('Alim 19,5 V')]),
  dev('canon-crn500', 'Canon', 'CR-N500 (PTZ)', 'Vidéo', { kg: 3 }, [port('sdi', '3G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE+)', 'rj45'), dc('Alim 12 V')]),
  dev('canon-crn700', 'Canon', 'CR-N700 (PTZ 4K)', 'Vidéo', { kg: 4 }, [port('sdi', '12G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE++)', 'rj45'), dc('Alim 24 V')]),
  dev('birddog-p400', 'BirdDog', 'P400 (PTZ NDI)', 'Vidéo', { kg: 2 }, [port('sdi', '12G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN NDI (PoE+)', 'rj45'), dc('Alim 12 V')]),
  dev('ptzoptics-move4k', 'PTZOptics', 'Move 4K (PTZ)', 'Vidéo', { kg: 2 }, [port('sdi', '12G-SDI out', 'sdi', V, 'out'), port('hdmi', 'HDMI out', 'hdmi', V, 'out'), net('LAN (PoE+)', 'rj45'), dc('Alim 12 V')]),
  // PTZ controllers
  dev('pana-rp150', 'Panasonic', 'AW-RP150 (pupitre PTZ)', 'Vidéo', { kg: 4 }, [net('LAN (PoE+)', 'rj45'), port('tally', 'Tally / GPIO', 'rj45', V, 'in'), dc('Alim 12 V')]),
  dev('pana-rp60', 'Panasonic', 'AW-RP60 (pupitre PTZ)', 'Vidéo', { kg: 3 }, [net('LAN (PoE+)', 'rj45'), dc('Alim 12 V')]),
  dev('sony-rm-ip500', 'Sony', 'RM-IP500 (pupitre PTZ)', 'Vidéo', { kg: 3 }, [net('LAN (PoE+)', 'rj45'), dc('Alim 12 V')]),
  dev('canon-rc-ip100', 'Canon', 'RC-IP100 (pupitre PTZ)', 'Vidéo', { kg: 3 }, [net('LAN (PoE+)', 'rj45'), dc('Alim 12 V')]),
  dev('birddog-keyboard', 'BirdDog', 'PTZ Keyboard (pupitre)', 'Vidéo', { kg: 2 }, [net('LAN (PoE)', 'rj45'), dc('Alim 12 V')]),
  dev('skaarhoj-ptz-pro', 'SKAARHOJ', 'PTZ Pro (pupitre)', 'Vidéo', { kg: 3 }, [net('LAN (PoE)', 'rj45'), dc('Alim 12 V')]),
  dev('ptzoptics-superjoy', 'PTZOptics', 'SuperJoy (joystick PTZ)', 'Vidéo', { kg: 1 }, [net('LAN (PoE)', 'rj45'), dc('Alim 12 V')]),
]

const RESEAU_MORE: DeviceTemplate[] = [
  // Agora Ghost
  dev('agora-ghost-g2', 'Agora', 'Ghost G2 (switch fibre 12 etherCON)', 'Réseau', { u: 1, kg: 4 }, [...series('p', 'Port', 12, 'ethercon', NET, 'io'), ...series('fibre', 'opticalCON DUO', 2, 'opticalcon', NET, 'io'), t1()]),
  // PoE + fibre
  dev('luminex-gc26i', 'Luminex', 'GigaCore 26i (PoE, fibre)', 'Réseau', { u: 1, kg: 5 }, [...series('p', 'Port PoE', 20, 'ethercon', NET, 'io'), ...series('sfp', 'Fibre SFP', 6, 'opticalcon', NET, 'io'), t1()]),
  dev('luminex-gc18t', 'Luminex', 'GigaCore 18t (PoE, fibre)', 'Réseau', { u: 1, kg: 4 }, [...series('p', 'Port PoE', 14, 'ethercon', NET, 'io'), ...series('sfp', 'Fibre SFP', 4, 'opticalcon', NET, 'io'), t1()]),
  dev('luminex-gc12', 'Luminex', 'GigaCore 12 (PoE, fibre)', 'Réseau', { u: 1, kg: 3 }, [...series('p', 'Port PoE', 8, 'ethercon', NET, 'io'), ...series('sfp', 'Fibre SFP', 4, 'opticalcon', NET, 'io'), t1()]),
  dev('netgear-m4250-26g4f', 'Netgear', 'M4250-26G4F-PoE+ (24 PoE + 4 SFP)', 'Réseau', { u: 1, kg: 5 }, [...series('p', 'Port PoE+', 24, 'rj45', NET, 'io'), ...series('sfp', 'Fibre SFP', 4, 'opticalcon', NET, 'io'), iec()]),
  dev('netgear-m4250-12m2xf', 'Netgear', 'M4250-12M2XF (PoE++ multigig + 2 SFP+)', 'Réseau', { u: 1, kg: 4 }, [...series('p', 'Port PoE++', 12, 'rj45', NET, 'io'), ...series('sfp', 'Fibre SFP+', 2, 'opticalcon', NET, 'io'), iec()]),
  dev('netgear-m4250-8g2xf', 'Netgear', 'M4250-8G2XF-PoE+ (8 PoE + 2 SFP+)', 'Réseau', { u: 1, kg: 2 }, [...series('p', 'Port PoE+', 8, 'rj45', NET, 'io'), ...series('sfp', 'Fibre SFP+', 2, 'opticalcon', NET, 'io'), iec()]),
  dev('yam-swr2310-10g', 'Yamaha', 'SWR2310-10G (Dante, 2 SFP+)', 'Réseau', { u: 1, kg: 2 }, [...series('p', 'Port', 8, 'rj45', NET, 'io'), ...series('sfp', 'Fibre SFP+', 2, 'opticalcon', NET, 'io'), iec()]),
  dev('yam-swr2311p-10g', 'Yamaha', 'SWR2311P-10G (Dante, PoE, 2 SFP)', 'Réseau', { u: 1, kg: 3 }, [...series('p', 'Port PoE', 8, 'rj45', NET, 'io'), ...series('sfp', 'Fibre SFP', 2, 'opticalcon', NET, 'io'), iec()]),
  dev('yam-swp1-8mmf', 'Yamaha', 'SWP1-8MMF (Dante, fibre multimode)', 'Réseau', { u: 1, kg: 2 }, [...series('p', 'Port', 6, 'ethercon', NET, 'io'), ...series('fibre', 'opticalCON', 2, 'opticalcon', NET, 'io'), iec()]),
  dev('cisco-cbs350-24fp', 'Cisco', 'CBS350-24FP-4G (24 PoE + 4 SFP)', 'Réseau', { u: 1, kg: 4 }, [...series('p', 'Port PoE+', 24, 'rj45', NET, 'io'), ...series('sfp', 'Fibre SFP', 4, 'opticalcon', NET, 'io'), iec()]),
  dev('ubnt-usw-pro-24-poe', 'Ubiquiti', 'USW-Pro-24-PoE (24 PoE + 2 SFP+)', 'Réseau', { u: 1, kg: 5 }, [...series('p', 'Port PoE', 24, 'rj45', NET, 'io'), ...series('sfp', 'Fibre SFP+', 2, 'opticalcon', NET, 'io'), iec()]),
  dev('media-converter', 'Générique', 'Convertisseur fibre / cuivre', 'Réseau', { kg: 0.3 }, [port('rj', 'Port cuivre', 'ethercon', NET, 'io'), port('fibre', 'Fibre', 'opticalcon', NET, 'io'), dc()]),
  dev('poe-injector', 'Générique', 'Injecteur PoE', 'Réseau', { kg: 0.3 }, [port('lan', 'LAN (data)', 'rj45', NET, 'io'), port('poe', 'Sortie PoE', 'rj45', NET, 'io'), iec()]),
  dev('fibre-drum', 'Générique', 'Touret fibre opticalCON (tactique)', 'Réseau', { kg: 12 }, [port('a', 'Bout A', 'opticalcon', NET, 'io'), port('b', 'Bout B', 'opticalcon', NET, 'io')]),
]

export const CATALOG: DeviceTemplate[] = [
  ...SON,
  ...CONSOLES,
  ...DIFFUSION,
  ...HF,
  ...MULTIPAIRE,
  ...LUMIERE,
  ...VIDEO,
  ...VIDEO_MORE,
  ...RESEAU,
  ...RESEAU_MORE,
  ...ENERGIE,
]
