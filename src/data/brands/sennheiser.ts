import type { DeviceTemplate, Port } from '../../types'
import { A, AES, NET, PWR, RF, ins, outs, dante, net, iec, antIn, cascade, antOut, dc, dev, port, series, family } from '../catalogKit'

/* Sennheiser: indicative connectors, check the manufacturer's data sheet. */

const S = 'Sennheiser'
const xlrOut = (label = 'Sortie') => [port('out', label, 'xlr3', A, 'out')]
const P48 = 'Sortie (48 V)'
// Wired microphone.
const mic = (id: string, model: string, kg: number, label = 'Sortie') => dev(id, S, model, 'Son', { kg }, xlrOut(label))
// Bodypack transmitter: 3-pin jack 3.5 mm (ew) or Lemo 3 pins (Digital 6000/9000).
const jackIn = (label = 'Entrée micro (jack 3,5 mm)'): Port[] => [port('mic', label, 'minijack', A, 'in')]
const lemoIn = (): Port[] => [port('mic', 'Entrée micro (Lemo 3 broches)', 'lemo3', A, 'in')]
// Lavalier / headset with its 3.5 mm jack or Lemo plug.
const lav = (id: string, model: string, kg = 0.02) =>
  dev(id, S, model, 'Son', { kg }, [port('out', 'Sortie (jack 3,5 mm ou Lemo selon version)', 'minijack', A, 'out')])
// Single receiver with XLR + jack outputs.
const singleRx = (extra: Port[]): Port[] => [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), ...extra]
// IEM bodypack receiver.
const iemRx = (id: string, model: string) => dev(id, S, model, 'Son', { kg: 0.2 }, [port('hp', 'Écouteurs (jack 3,5 mm)', 'minijack', A, 'out')])
// Headphones.
const casque = (id: string, model: string, kg: number) => dev(id, S, model, 'Son', { kg }, [port('in', 'Câble casque (jack 3,5 / 6,35 mm)', 'minijack', A, 'in')])
const wordclock = (): Port[] => [port('wcIn', 'Word clock in', 'bnc', AES, 'in'), port('wcOut', 'Word clock out', 'bnc', AES, 'out')]
const bncIo = (label = 'Connecteur antenne') => [port('ant', label, 'bnc', RF, 'io')]
const splitter = (n: number) => [...antIn(), ...series('outA', 'Sortie A', n, 'bnc', RF, 'out'), ...series('outB', 'Sortie B', n, 'bnc', RF, 'out')]
const booster = () => [port('in', 'Entrée antenne', 'bnc', RF, 'in'), port('out', 'Sortie', 'bnc', RF, 'out')]

export const SENNHEISER: DeviceTemplate[] = [
  ...family('Micros filaires', [
    mic('senn-e602', 'e602-II (dynamique grosse caisse)', 0.3),
    mic('senn-e604', 'e604 (dynamique toms / caisse claire)', 0.1),
    mic('senn-e608', 'e608 (dynamique col de cygne cuivres)', 0.1),
    mic('senn-e609', 'e609 Silver (dynamique ampli guitare)', 0.1),
    mic('senn-e614', 'e614 (statique cardio overhead)', 0.1, P48),
    mic('senn-e835', 'e835 (dynamique voix cardio)', 0.3),
    mic('senn-e835s', 'e835-S (dynamique voix, interrupteur)', 0.3),
    mic('senn-e845', 'e845 (dynamique voix supercardio)', 0.3),
    mic('senn-e845s', 'e845-S (dynamique voix, interrupteur)', 0.3),
    mic('senn-e865', 'e865 (statique voix supercardio)', 0.3, P48),
    mic('senn-e901', 'e901 (statique de surface grosse caisse)', 0.4, P48),
    mic('senn-e902', 'e902 (dynamique grosse caisse)', 0.3),
    mic('senn-e904', 'e904 (dynamique toms / caisse claire)', 0.2),
    mic('senn-e905', 'e905 (dynamique caisse claire / toms)', 0.2),
    mic('senn-e906', 'e906 (dynamique ampli guitare)', 0.2),
    mic('senn-e908b', 'e908 B (statique pince cuivres, préampli MZA 900)', 0.1, P48),
    mic('senn-e908d', 'e908 D (statique pince batterie)', 0.1, P48),
    mic('senn-e914', 'e914 (statique cardio instruments)', 0.2, P48),
    mic('senn-e935', 'e935 (dynamique voix cardio)', 0.4),
    mic('senn-e945', 'e945 (dynamique voix supercardio)', 0.4),
    mic('senn-e965', 'e965 (statique double membrane voix)', 0.4, P48),
    mic('senn-md421', 'MD 421 II (dynamique cardio)', 0.4),
    mic('senn-md421k', 'MD 421 Kompakt (dynamique cardio)', 0.3),
    mic('senn-md431', 'MD 431 II (dynamique voix supercardio)', 0.3),
    mic('senn-md435', 'MD 435 (dynamique voix cardio)', 0.4),
    mic('senn-md441', 'MD 441-U (dynamique supercardio)', 0.5),
    mic('senn-md445', 'MD 445 (dynamique voix supercardio)', 0.4),
    mic('senn-md42', 'MD 42 (dynamique reportage omni)', 0.3),
    mic('senn-md46', 'MD 46 (dynamique reportage cardio)', 0.3),
    mic('senn-mk4', 'MK 4 (statique large membrane cardio)', 0.5, P48),
    mic('senn-mke600', 'MKE 600 (canon court, 48 V ou pile)', 0.1, P48),
    mic('senn-me66', 'ME 66 / K6 (canon court)', 0.2, P48),
    mic('senn-mkh416', 'MKH 416 (canon)', 0.2, P48),
    mic('senn-mkh50', 'MKH 50 (statique supercardio)', 0.1, P48),
    mic('senn-mkh8040', 'MKH 8040 (statique cardio)', 0.1, P48),
    mic('senn-mkh8060', 'MKH 8060 (canon court)', 0.1, P48),
  ]),
  ...family('HF — récepteurs', [
    // Digital 9000 / 6000
    dev('senn-em9046', S, 'EM 9046 (Digital 9000, récepteur 8 canaux)', 'Son', { u: 3, kg: 12 }, [
      ...antIn(), ...cascade(), ...outs(8, 'Sortie XLR'), ...series('aes', 'AES3 out', 4, 'xlr3', AES, 'out'),
      port('madi', 'MADI (module option)', 'bnc', AES, 'out'), ...wordclock(), net('Contrôle', 'rj45'),
      port('pwr', 'Secteur 1', 'iec', PWR, 'in'), port('pwr2', 'Secteur 2 (redondant)', 'iec', PWR, 'in'),
    ]),
    dev('senn-em6000-a', S, 'EM 6000 (Digital 6000, récepteur double)', 'Son', { u: 1, kg: 4.5 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), port('aes', 'AES3 out', 'xlr3', AES, 'out'), ...wordclock(), net('Contrôle', 'rj45'), iec()]),
    dev('senn-em6000', S, 'EM 6000 Dante (Digital 6000, récepteur double)', 'Son', { u: 1, kg: 4.5 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), port('aes', 'AES3 out', 'xlr3', AES, 'out'), ...wordclock(), ...dante(), net('Contrôle', 'rj45'), iec()]),
    dev('senn-ek6042', S, 'EK 6042 (récepteur caméra double, slot)', 'Son', { kg: 0.3 }, [...bncIo('Antenne'), ...series('out', 'Sortie', 2, 'xlr3', A, 'out')]),
    // 3000/5000 & 2000 series
    dev('senn-em3732', S, 'EM 3732-II (récepteur double analogique)', 'Son', { u: 1, kg: 4 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), net('Ethernet', 'rj45'), iec()]),
    dev('senn-em2000', S, 'EM 2000 (série 2000, récepteur simple)', 'Son', { u: 1, kg: 3 }, [...singleRx([...cascade(), net('Ethernet', 'rj45'), iec()])]),
    dev('senn-em2050', S, 'EM 2050 (série 2000, récepteur double)', 'Son', { u: 1, kg: 3.5 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), ...series('outJ', 'Sortie jack', 2, 'jack', A, 'out'), net('Ethernet', 'rj45'), iec()]),
    // Evolution wireless Digital
    dev('senn-ewdx-em2', S, 'EW-DX EM 2 (récepteur double)', 'Son', { u: 1, kg: 3 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), ...series('outJ', 'Sortie jack', 2, 'jack', A, 'out'), net('Ethernet', 'rj45'), iec()]),
    dev('senn-ewd-em-dante', S, 'EW-DX EM 2 Dante (récepteur double)', 'Son', { u: 1, kg: 3 }, [...antIn(), ...cascade(), ...outs(2, 'Sortie XLR'), ...series('outJ', 'Sortie jack', 2, 'jack', A, 'out'), ...dante(), net('Contrôle', 'rj45'), iec()]),
    dev('senn-ewdx-em4', S, 'EW-DX EM 4 Dante (récepteur 4 canaux)', 'Son', { u: 1, kg: 4 }, [...antIn(), ...cascade(), ...outs(4, 'Sortie XLR'), ...dante(), net('Contrôle', 'rj45'), iec()]),
    dev('senn-ewd-em', S, 'EW-D EM (récepteur simple)', 'Son', { kg: 0.6 }, singleRx([dc()])),
    // evolution wireless G4 / G3
    dev('senn-em100g4', S, 'EM 100 G4 (récepteur simple)', 'Son', { kg: 1 }, singleRx([dc()])),
    dev('senn-em300g4', S, 'EM 300-500 G4 (récepteur simple)', 'Son', { u: 1, kg: 1.5 }, singleRx([net('Ethernet', 'rj45'), dc('Alim externe')])),
    dev('senn-ek100g4', S, 'EK 100 G4 (récepteur caméra portable)', 'Son', { kg: 0.2 }, [port('out', 'Sortie (jack 3,5 mm)', 'minijack', A, 'out')]),
    dev('senn-em100g3', S, 'EM 100 G3 (récepteur simple)', 'Son', { kg: 1 }, singleRx([dc()])),
    dev('senn-em300g3', S, 'EM 300 G3 (récepteur simple)', 'Son', { kg: 1 }, singleRx([dc()])),
    dev('senn-em500g3', S, 'EM 500 G3 (récepteur simple)', 'Son', { kg: 1 }, singleRx([net('Ethernet', 'rj45'), dc()])),
    // SpeechLine, AVX, XS Wireless
    dev('senn-sl-rack-dw', S, 'SpeechLine SL Rack Receiver DW (récepteur)', 'Son', { kg: 0.9 }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), net('Ethernet', 'rj45'), dc()]),
    dev('senn-sl-mcr2', S, 'SpeechLine SL MCR 2 DW (récepteur 2 canaux)', 'Son', { u: 1, kg: 2.5 }, [...outs(2, 'Sortie XLR'), port('dante', 'Dante (RJ45)', 'rj45', NET, 'io'), net('Contrôle', 'rj45'), dc()]),
    dev('senn-sl-mcr4', S, 'SpeechLine SL MCR 4 DW (récepteur 4 canaux)', 'Son', { u: 1, kg: 2.5 }, [...outs(4, 'Sortie XLR'), port('dante', 'Dante (RJ45)', 'rj45', NET, 'io'), net('Contrôle', 'rj45'), dc()]),
    dev('senn-ekp-avx', S, 'EKP AVX (récepteur plug-on XLR)', 'Son', { kg: 0.1 }, [port('out', 'Sortie XLR mâle', 'xlr3', A, 'out')]),
    dev('senn-xswd-xlr-rx', S, 'XSW-D XLR Receiver (récepteur plug-on XLR)', 'Son', { kg: 0.05 }, [port('out', 'Sortie XLR mâle', 'xlr3', A, 'out'), port('usb', 'Charge USB', 'usb', PWR, 'in')]),
    dev('senn-xswd-mj-rx', S, 'XSW-D Mini Jack Receiver (récepteur jack 3,5)', 'Son', { kg: 0.05 }, [port('out', 'Sortie jack 3,5 mm', 'minijack', A, 'out'), port('usb', 'Charge USB', 'usb', PWR, 'in')]),
    dev('senn-xswd-pedal-rx', S, 'XSW-D Pedalboard Receiver (récepteur pédalier)', 'Son', { kg: 0.3 }, [port('out', 'Sortie jack', 'jack', A, 'out'), port('tuner', 'Sortie accordeur', 'jack', A, 'out'), dc()]),
    dev('senn-em-xsw1', S, 'EM XSW 1 (récepteur XS Wireless)', 'Son', { kg: 0.4 }, singleRx([dc()])),
    dev('senn-em-xsw2', S, 'EM XSW 2 (récepteur XS Wireless)', 'Son', { kg: 0.5 }, singleRx([dc()])),
  ]),
  ...family('HF — émetteurs & micros HF', [
    // Spectera
    dev('senn-spectera-sek', S, 'Spectera SEK (bodypack bidirectionnel micro + ear)', 'Son', { kg: 0.2 }, [...lemoIn(), port('hp', 'Écouteurs (jack 3,5 mm)', 'minijack', A, 'out')]),
    // Digital 9000 / 6000
    dev('senn-sk9000', S, 'SK 9000 (émetteur ceinture Digital 9000)', 'Son', { kg: 0.2 }, lemoIn()),
    dev('senn-skm9000', S, 'SKM 9000 (émetteur main Digital 9000)', 'Son', { kg: 0.4 }, []),
    dev('senn-sk6000', S, 'SK 6000 (émetteur ceinture Digital 6000)', 'Son', { kg: 0.1 }, lemoIn()),
    dev('senn-sk6212', S, 'SK 6212 (mini émetteur ceinture Digital 6000)', 'Son', { kg: 0.1 }, lemoIn()),
    dev('senn-skm6000', S, 'SKM 6000 (émetteur main Digital 6000)', 'Son', { kg: 0.4 }, []),
    // 5000 / 2000
    dev('senn-sk5212', S, 'SK 5212-II (émetteur ceinture analogique)', 'Son', { kg: 0.1 }, lemoIn()),
    dev('senn-skm5200', S, 'SKM 5200-II (émetteur main analogique)', 'Son', { kg: 0.4 }, []),
    dev('senn-sk2000', S, 'SK 2000 (émetteur ceinture série 2000)', 'Son', { kg: 0.2 }, jackIn()),
    dev('senn-skm2000', S, 'SKM 2000 (émetteur main série 2000)', 'Son', { kg: 0.4 }, []),
    dev('senn-skp2000', S, 'SKP 2000 (émetteur plug-on XLR)', 'Son', { kg: 0.2 }, [port('mic', 'Entrée XLR femelle', 'xlr3', A, 'in')]),
    // EW-DX / EW-D
    dev('senn-ewdx-sk', S, 'EW-DX SK (émetteur ceinture)', 'Son', { kg: 0.1 }, jackIn()),
    dev('senn-ewdx-sk3', S, 'EW-DX SK 3-PIN (émetteur ceinture, Lemo)', 'Son', { kg: 0.1 }, lemoIn()),
    dev('senn-ewdx-skm', S, 'EW-DX SKM (émetteur main)', 'Son', { kg: 0.3 }, []),
    dev('senn-ewdx-skm-s', S, 'EW-DX SKM-S (émetteur main, interrupteur)', 'Son', { kg: 0.3 }, []),
    dev('senn-ewdx-ts3', S, 'EW-DX TS 3-PIN (émetteur de table, col de cygne)', 'Son', { kg: 0.6 }, [port('mic', 'Entrée col de cygne XLR-3', 'xlr3', A, 'in')]),
    dev('senn-ewdx-ts5', S, 'EW-DX TS 5-PIN (émetteur de table, col de cygne LED)', 'Son', { kg: 0.6 }, [port('mic', 'Entrée col de cygne XLR-5', 'xlr5', A, 'in')]),
    dev('senn-ewd-sk', S, 'EW-D SK (émetteur ceinture)', 'Son', { kg: 0.1 }, jackIn()),
    dev('senn-ewd-skm', S, 'EW-D SKM-S (émetteur main)', 'Son', { kg: 0.3 }, []),
    // evolution wireless G4 / G3
    dev('senn-sk100g4', S, 'SK 100 G4 (émetteur ceinture)', 'Son', { kg: 0.1 }, jackIn()),
    dev('senn-skm100g4', S, 'SKM 100 G4 (émetteur main)', 'Son', { kg: 0.3 }, []),
    dev('senn-skp100g4', S, 'SKP 100 G4 (émetteur plug-on XLR)', 'Son', { kg: 0.1 }, [port('mic', 'Entrée XLR femelle', 'xlr3', A, 'in')]),
    dev('senn-sk300g4', S, 'SK 300 G4 (émetteur ceinture)', 'Son', { kg: 0.1 }, jackIn()),
    dev('senn-skm300g4', S, 'SKM 300 G4 (émetteur main)', 'Son', { kg: 0.3 }, []),
    dev('senn-skp300g4', S, 'SKP 300 G4 (émetteur plug-on XLR)', 'Son', { kg: 0.1 }, [port('mic', 'Entrée XLR femelle', 'xlr3', A, 'in')]),
    dev('senn-sk500g4', S, 'SK 500 G4 (émetteur ceinture)', 'Son', { kg: 0.1 }, jackIn()),
    dev('senn-skm500g4', S, 'SKM 500 G4 (émetteur main)', 'Son', { kg: 0.3 }, []),
    dev('senn-skp500g4', S, 'SKP 500 G4 (émetteur plug-on XLR, 48 V)', 'Son', { kg: 0.1 }, [port('mic', 'Entrée XLR femelle', 'xlr3', A, 'in')]),
    dev('senn-sk100g3', S, 'SK 100 G3 (émetteur ceinture)', 'Son', { kg: 0.1 }, jackIn()),
    dev('senn-skm100g3', S, 'SKM 100 G3 (émetteur main)', 'Son', { kg: 0.3 }, []),
    dev('senn-sk500g3', S, 'SK 500 G3 (émetteur ceinture)', 'Son', { kg: 0.1 }, jackIn()),
    dev('senn-skm500g3', S, 'SKM 500 G3 (émetteur main)', 'Son', { kg: 0.3 }, []),
    // SpeechLine, AVX, XS Wireless
    dev('senn-sl-hh-dw', S, 'SpeechLine SL Handheld DW (émetteur main)', 'Son', { kg: 0.3 }, []),
    dev('senn-sl-bp-dw', S, 'SpeechLine SL Bodypack DW (émetteur ceinture)', 'Son', { kg: 0.1 }, jackIn()),
    dev('senn-sl-tab-dw', S, 'SpeechLine SL Tablestand 133-S DW (émetteur de table)', 'Son', { kg: 0.6 }, [port('mic', 'Entrée col de cygne XLR-3', 'xlr3', A, 'in')]),
    dev('senn-sl-bnd-dw', S, 'SpeechLine SL Boundary 114-S DW (micro de surface HF)', 'Son', { kg: 0.3 }, []),
    dev('senn-sk-avx', S, 'SK AVX (émetteur ceinture AVX)', 'Son', { kg: 0.1 }, jackIn()),
    dev('senn-skm-avx', S, 'SKM AVX (émetteur main AVX)', 'Son', { kg: 0.3 }, []),
    dev('senn-xswd-xlr-tx', S, 'XSW-D XLR Transmitter (émetteur plug-on XLR)', 'Son', { kg: 0.05 }, [port('mic', 'Entrée XLR femelle', 'xlr3', A, 'in'), port('usb', 'Charge USB', 'usb', PWR, 'in')]),
    dev('senn-xswd-mj-tx', S, 'XSW-D Mini Jack Transmitter (émetteur jack 3,5)', 'Son', { kg: 0.05 }, [port('mic', 'Entrée jack 3,5 mm', 'minijack', A, 'in'), port('usb', 'Charge USB', 'usb', PWR, 'in')]),
    dev('senn-xswd-inst-tx', S, 'XSW-D Instrument Transmitter (émetteur jack 6,35)', 'Son', { kg: 0.05 }, [port('in', 'Entrée jack instrument', 'jack', A, 'in'), port('usb', 'Charge USB', 'usb', PWR, 'in')]),
    dev('senn-sk-xsw', S, 'SK XSW (émetteur ceinture XS Wireless)', 'Son', { kg: 0.1 }, jackIn()),
    dev('senn-skm-xsw', S, 'SKM XSW (émetteur main XS Wireless 825/835)', 'Son', { kg: 0.3 }, []),
    // Lavaliers & headsets
    lav('senn-mke1', 'MKE 1 (cravate miniature)'),
    lav('senn-mke2', 'MKE 2 (cravate)'),
    lav('senn-mke2-gold', 'MKE 2 Gold (cravate)'),
    lav('senn-mke-ess', 'MKE Essential Omni (cravate)'),
    lav('senn-me2', 'ME 2-II (cravate omni)'),
    lav('senn-me4', 'ME 4 (cravate cardio)'),
    lav('senn-hsp4', 'HSP 4 (serre-tête cardio)', 0.02),
    lav('senn-hsp2', 'HSP 2 (serre-tête omni)', 0.02),
    lav('senn-hs2', 'HS 2 (micro oreille omni)', 0.01),
    lav('senn-hsp-ess', 'HSP Essential Omni (serre-tête)', 0.02),
    lav('senn-me3', 'ME 3-II (serre-tête cardio)', 0.03),
    lav('senn-sl-headmic1', 'SL Headmic 1 (micro oreille)', 0.01),
  ]),
  ...family('Ears (in-ear)', [
    dev('senn-sr2050', S, 'SR 2050 IEM (émetteur ear double)', 'Son', { u: 1, kg: 4 }, [
      port('antA', 'Antenne A', 'bnc', RF, 'out'), port('antB', 'Antenne B', 'bnc', RF, 'out'),
      ...ins(4, 'Entrée', 'xlr-combo'), ...series('loop', 'Loop', 4, 'jack', A, 'out'), net('Ethernet', 'rj45'), iec(),
    ]),
    dev('senn-sr2000', S, 'SR 2000 IEM (émetteur ear simple)', 'Son', { u: 1, kg: 3 }, [antOut(), ...ins(2, 'Entrée', 'xlr-combo'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), net('Ethernet', 'rj45'), iec()]),
    dev('senn-sr-iem-g4', S, 'SR IEM G4 (émetteur ear)', 'Son', { u: 1, kg: 2 }, [antOut(), ...ins(2, 'Entrée', 'xlr-combo'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), net('Ethernet', 'rj45'), dc()]),
    dev('senn-sr300g3', S, 'SR 300 IEM G3 (émetteur ear)', 'Son', { u: 1, kg: 2 }, [antOut(), ...ins(2, 'Entrée', 'xlr-combo'), ...series('loop', 'Loop', 2, 'jack', A, 'out'), dc()]),
    dev('senn-sr-xsw-iem', S, 'SR XSW IEM (émetteur ear XS Wireless)', 'Son', { kg: 0.8 }, [antOut(), ...ins(2, 'Entrée', 'xlr-combo'), dc()]),
    iemRx('senn-ek2000', 'EK 2000 IEM (récepteur ear ceinture)'),
    iemRx('senn-ek-iem-g4', 'EK IEM G4 (récepteur ear ceinture)'),
    iemRx('senn-ek300g3', 'EK 300 IEM G3 (récepteur ear ceinture)'),
    iemRx('senn-ek-xsw-iem', 'EK XSW IEM (récepteur ear XS Wireless)'),
    dev('senn-ie40', S, 'IE 40 PRO (écouteurs intra)', 'Son', { kg: 0.02 }, [port('in', 'Câble (jack 3,5 mm)', 'minijack', A, 'in')]),
    dev('senn-ie100', S, 'IE 100 PRO (écouteurs intra)', 'Son', { kg: 0.02 }, [port('in', 'Câble (jack 3,5 mm)', 'minijack', A, 'in')]),
    dev('senn-ie400', S, 'IE 400 PRO (écouteurs intra)', 'Son', { kg: 0.02 }, [port('in', 'Câble (jack 3,5 mm)', 'minijack', A, 'in')]),
    dev('senn-ie500', S, 'IE 500 PRO (écouteurs intra)', 'Son', { kg: 0.02 }, [port('in', 'Câble (jack 3,5 mm)', 'minijack', A, 'in')]),
  ]),
  ...family('HF — antennes & distribution', [
    dev('senn-spectera-base', S, 'Spectera Base Station (station de base WMAS)', 'Son', { u: 1, kg: 6 }, [
      ...series('dad', 'Port antenne DAD', 4, 'bnc', RF, 'io'), ...dante(), net('Contrôle', 'rj45'), ...wordclock(),
      port('pwr', 'Secteur 1', 'iec', PWR, 'in'), port('pwr2', 'Secteur 2 (redondant)', 'iec', PWR, 'in'),
    ]),
    dev('senn-spectera-dad', S, 'Spectera DAD (antenne active bidirectionnelle)', 'Son', { kg: 1 }, bncIo('Connecteur antenne (alim. par coaxial)')),
    dev('senn-asa3000', S, 'ASA 3000 (splitter d’antennes actif)', 'Son', { u: 1, kg: 4 }, [...splitter(8), iec()]),
    dev('senn-asa214', S, 'ASA 214 (splitter d’antennes 1→4)', 'Son', { u: 1, kg: 3 }, [...splitter(4), iec()]),
    dev('senn-asa1', S, 'ASA 1 (splitter d’antennes actif ew)', 'Son', { kg: 1 }, [...splitter(4), dc()]),
    dev('senn-asp212', S, 'ASP 212 (splitter d’antennes passif 1→2)', 'Son', { kg: 0.3 }, splitter(2)),
    dev('senn-ewd-asa', S, 'EW-D ASA (splitter d’antennes actif EW-D/EW-DX)', 'Son', { u: 1, kg: 1.5 }, [...splitter(4), ...series('dcOut', 'Sortie DC récepteur', 4, 'dc', PWR, 'out'), dc()]),
    dev('senn-ewd-ab', S, 'EW-D AB (booster d’antenne)', 'Son', { kg: 0.2 }, booster()),
    dev('senn-ab4', S, 'AB 4 (booster d’antenne)', 'Son', { kg: 0.2 }, booster()),
    dev('senn-ab3', S, 'AB 3 (booster d’antenne ew G3)', 'Son', { kg: 0.2 }, booster()),
    dev('senn-ab3700', S, 'AB 3700 (booster d’antenne)', 'Son', { kg: 0.2 }, booster()),
    dev('senn-ac3200', S, 'AC 3200-II (combineur ear 8→1)', 'Son', { u: 1, kg: 4 }, [...series('in', 'Entrée émetteur', 8, 'bnc', RF, 'in'), port('ant', 'Sortie antenne', 'bnc', RF, 'out'), iec()]),
    dev('senn-ac41', S, 'AC 41 (combineur ear actif 4→1)', 'Son', { kg: 1.5 }, [...series('in', 'Entrée émetteur', 4, 'bnc', RF, 'in'), port('ant', 'Sortie antenne', 'bnc', RF, 'out'), dc()]),
    dev('senn-ac3', S, 'AC 3 (combineur ear 4→1 ew G3)', 'Son', { kg: 1.5 }, [...series('in', 'Entrée émetteur', 4, 'bnc', RF, 'in'), port('ant', 'Sortie antenne', 'bnc', RF, 'out'), dc()]),
    dev('senn-ad3700', S, 'AD 3700 (antenne directive active)', 'Son', { kg: 0.6 }, [port('out', 'Sortie', 'bnc', RF, 'out')]),
    dev('senn-a5000cp', S, 'A 5000-CP (antenne polarisation circulaire passive)', 'Son', { kg: 1.3 }, bncIo()),
    dev('senn-a2003', S, 'A 2003 UHF (antenne directive passive)', 'Son', { kg: 0.5 }, bncIo()),
    dev('senn-adp-uhf', S, 'ADP UHF (antenne directive passive)', 'Son', { kg: 0.4 }, bncIo()),
    dev('senn-awm-uhf', S, 'AWM UHF II (antenne murale omni)', 'Son', { kg: 0.3 }, bncIo()),
    dev('senn-a1031', S, 'A 1031-U (antenne omni passive)', 'Son', { kg: 0.2 }, bncIo()),
  ]),
  ...family('Monitoring personnel', [
    casque('senn-hd25', 'HD 25 (casque de contrôle fermé)', 0.14),
    casque('senn-hd26', 'HD 26 PRO (casque de contrôle fermé)', 0.2),
    casque('senn-hd280', 'HD 280 PRO (casque de contrôle fermé)', 0.29),
    casque('senn-hd300', 'HD 300 PRO (casque de contrôle fermé)', 0.24),
    casque('senn-hd400', 'HD 400 PRO (casque de studio ouvert)', 0.32),
    casque('senn-hd490', 'HD 490 PRO (casque de studio ouvert)', 0.26),
    dev('senn-hmd26', S, 'HMD 26-II (micro-casque broadcast / intercom)', 'Son', { kg: 0.2 }, [port('in', 'Câble casque', 'jack', A, 'in'), port('mic', 'Sortie micro', 'xlr3', A, 'out')]),
  ]),
  ...family('Conférence & installation', [
    dev('senn-tcc2', S, 'TeamConnect Ceiling 2 (micro plafond beamforming Dante)', 'Son', { kg: 7 }, [port('net', 'Dante / PoE', 'rj45', NET, 'io')]),
    dev('senn-tccm', S, 'TeamConnect Ceiling Medium (micro plafond)', 'Son', { kg: 4 }, [port('net', 'Dante / PoE', 'rj45', NET, 'io'), port('usb', 'USB', 'usb', A, 'io')]),
    dev('senn-sl-di4', S, 'SpeechLine SL DI 4 XLR (interface Dante 4 entrées)', 'Son', { kg: 0.5 }, [...ins(4, 'Entrée XLR'), port('net', 'Dante / PoE', 'rj45', NET, 'io')]),
    dev('senn-adn-cu1', S, 'ADN CU1 (unité centrale conférence)', 'Son', { u: 2, kg: 5 }, [
      ...series('adn', 'Ligne ADN', 2, 'rj45', NET, 'io'), ...outs(2, 'Sortie XLR'), ...ins(2, 'Entrée XLR'), net('Ethernet', 'rj45'), iec(),
    ]),
    dev('senn-adn-c1', S, 'ADN C1 (pupitre président)', 'Son', { kg: 1 }, [port('in', 'ADN in', 'rj45', NET, 'in'), port('thru', 'ADN out', 'rj45', NET, 'out'), port('mic', 'Col de cygne XLR', 'xlr3', A, 'in')]),
    dev('senn-adn-d1', S, 'ADN D1 (pupitre délégué)', 'Son', { kg: 1 }, [port('in', 'ADN in', 'rj45', NET, 'in'), port('thru', 'ADN out', 'rj45', NET, 'out'), port('mic', 'Col de cygne XLR', 'xlr3', A, 'in')]),
  ]),
]
