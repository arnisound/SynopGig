import type { DeviceTemplate } from '../../types'
import { A, AES, HP, LINK, ins, outs, dante, iec, opt, pc32, hpIn, dev, port, series, family } from '../catalogKit'

/* NEXO: indicative connectors, check the manufacturer's data sheet. */

/** NXAMP: 4 XLR inputs, 4 NL4 + 1 NL8 outputs; a network card goes in its slot. */
const nxamp = () => [
  ...ins(4, 'Entrée'),
  ...series('hp', 'Sortie HP', 4, 'speakon', HP, 'out'),
  port('hp8', 'Sortie NL8 (4 canaux)', 'speakon8', HP, 'out'),
  pc32(),
]

/** DTDAMP: 4 XLR inputs, 2 NL4 outputs (2 canaux chacun). */
const dtdamp = () => [
  ...ins(4, 'Entrée'),
  port('hp12', 'Sortie HP 1-2', 'speakon', HP, 'out'),
  port('hp34', 'Sortie HP 3-4', 'speakon', HP, 'out'),
  iec(),
]

/** Analog TDcontroller: 2 XLR in, 2 full-range out + sub out. */
const tdController = () => [...ins(2, 'Entrée'), ...outs(2, 'Sortie'), port('sub', 'Sortie sub', 'xlr3', A, 'out'), iec()]

/** Cards of the NXAMP / NX242 slot. */
const NX_CARDS = [
  opt('nxdt104', 'Carte NXDT104 (Dante)', dante()),
  opt('nxes104', 'Carte NXES104 (EtherSound)', [port('esIn', 'EtherSound in', 'ethercon', LINK, 'in'), port('esOut', 'EtherSound out', 'ethercon', LINK, 'out')]),
  opt('nxae104', 'Carte NXAE104 (AES/EBU)', [port('aesIn', 'Entrée AES 1-2', 'xlr3', AES, 'in'), port('aesIn2', 'Entrée AES 3-4', 'xlr3', AES, 'in')]),
]
const NX_CARDS_MK2 = [opt('nxdt104mk2', 'Carte NXDT104mk2 (Dante)', dante()), NX_CARDS[2]]

export const NEXO: DeviceTemplate[] = [
  ...family('Amplis', [
    dev('nexo-nxamp4x1', 'NEXO', 'NXAMP4x1 (contrôleur amplifié 4 × 1300 W)', 'Son', { u: 2, kg: 19, opt: NX_CARDS }, nxamp()),
    dev('nexo-nxamp4x2', 'NEXO', 'NXAMP4x2 (contrôleur amplifié 4 × 2000 W)', 'Son', { u: 4, kg: 30, opt: NX_CARDS }, nxamp()),
    dev('nexo-nxamp4x4', 'NEXO', 'NXAMP4x4 (contrôleur amplifié 4 × 4000 W)', 'Son', { u: 4, kg: 33, opt: NX_CARDS }, nxamp()),
    dev('nexo-nxamp4x1mk2', 'NEXO', 'NXAMP4x1mk2 (contrôleur amplifié 4 × 1300 W)', 'Son', { u: 2, kg: 18, opt: NX_CARDS_MK2 }, nxamp()),
    dev('nexo-nxamp4x2mk2', 'NEXO', 'NXAMP4x2mk2 (contrôleur amplifié 4 × 2000 W)', 'Son', { u: 4, kg: 29, opt: NX_CARDS_MK2 }, nxamp()),
    dev('nexo-nxamp4x4mk2', 'NEXO', 'NXAMP4x4mk2 (contrôleur amplifié 4 × 4500 W)', 'Son', { u: 4, kg: 31, opt: NX_CARDS_MK2 }, nxamp()),
    dev('nexo-dtdamp4x07', 'NEXO', 'DTDAMP4x0.7 (ampli contrôleur 4 × 700 W)', 'Son', { u: 1, kg: 6 }, dtdamp()),
    dev('nexo-dtdamp4x13', 'NEXO', 'DTDAMP4x1.3 (ampli contrôleur 4 × 1300 W)', 'Son', { u: 1, kg: 6 }, dtdamp()),
  ]),
  ...family('Processeurs', [
    dev('nexo-dtd', 'NEXO', 'DTD Controller (contrôleur numérique)', 'Son', { u: 1, kg: 2 }, [...ins(2, 'Entrée'), ...outs(2, 'Sortie'), port('sub', 'Sortie sub', 'xlr3', A, 'out'), iec()]),
    dev('nexo-nx242', 'NEXO', 'NX242 (TDcontroller numérique, legacy)', 'Son', { u: 1, kg: 5, opt: NX_CARDS }, [...ins(2, 'Entrée'), port('aes', 'Entrée AES/EBU', 'xlr3', AES, 'in'), ...outs(4, 'Sortie'), iec()]),
    dev('nexo-ps8td', 'NEXO', 'PS8 TDcontroller (analogique, legacy)', 'Son', { u: 1, kg: 3 }, tdController()),
    dev('nexo-ps10td', 'NEXO', 'PS10 TDcontroller (analogique, legacy)', 'Son', { u: 1, kg: 3 }, tdController()),
    dev('nexo-ps15td', 'NEXO', 'PS15 TDcontroller (analogique, legacy)', 'Son', { u: 1, kg: 3 }, tdController()),
  ]),
  ...family('Line arrays & colonnes', [
    dev('nexo-stm-m46', 'NEXO', 'STM M46 (module principal)', 'Son', { kg: 84 }, hpIn('speakon8')),
    dev('nexo-stm-m28', 'NEXO', 'STM M28 (module omni)', 'Son', { kg: 52 }, hpIn('speakon8')),
    dev('nexo-stm-b112', 'NEXO', 'STM B112 (module grave)', 'Son', { kg: 85 }, hpIn('speakon8')),
    dev('nexo-geo-m1012', 'NEXO', 'GEO M1012 (GEO M10, 12°)', 'Son', { kg: 25 }, hpIn()),
    dev('nexo-geo-m1025', 'NEXO', 'GEO M1025 (GEO M10, 25°)', 'Son', { kg: 25 }, hpIn()),
    dev('nexo-geo-m12', 'NEXO', 'GEO M12 (module line array)', 'Son', { kg: 39 }, hpIn()),
    dev('nexo-geo-m620', 'NEXO', 'GEO M620 (GEO M6, 20°)', 'Son', { kg: 13 }, hpIn()),
    dev('nexo-geo-m610', 'NEXO', 'GEO M610 (GEO M6, 10°)', 'Son', { kg: 13 }, hpIn()),
    dev('nexo-geo-s1210', 'NEXO', 'GEO S1210 (GEO S12, 10°)', 'Son', { kg: 24 }, hpIn()),
    dev('nexo-geo-s1230', 'NEXO', 'GEO S1230 (GEO S12, 30°)', 'Son', { kg: 25 }, hpIn()),
    dev('nexo-geo-s805', 'NEXO', 'GEO S805 (GEO S8, 5°, legacy)', 'Son', { kg: 19 }, hpIn()),
    dev('nexo-geo-s830', 'NEXO', 'GEO S830 (GEO S8, 30°, legacy)', 'Son', { kg: 19 }, hpIn()),
    dev('nexo-geo-t4805', 'NEXO', 'GEO T4805 (GEO T, 0,5°-5°, legacy)', 'Son', { kg: 59 }, hpIn('speakon8')),
    dev('nexo-geo-t2815', 'NEXO', 'GEO T2815 (GEO T, 1,5°-15°, legacy)', 'Son', { kg: 59 }, hpIn('speakon8')),
    dev('nexo-geo-d10', 'NEXO', 'GEO D10 (GEO D, legacy)', 'Son', { kg: 57 }, hpIn('speakon8')),
    dev('nexo-alpha-m3', 'NEXO', 'Alpha M3 (médium-aigu, legacy)', 'Son', { kg: 72 }, hpIn('speakon8')),
    dev('nexo-alpha-b115', 'NEXO', 'Alpha B1-15 (grave, legacy)', 'Son', { kg: 65 }, hpIn('speakon8')),
    dev('nexo-id84', 'NEXO', 'ID84 (colonne)', 'Son', { kg: 12 }, hpIn()),
  ]),
  ...family('Enceintes', [
    dev('nexo-p8', 'NEXO', 'P8 (point source 8")', 'Son', { kg: 15 }, hpIn()),
    dev('nexo-p10', 'NEXO', 'P10 (point source 10")', 'Son', { kg: 17 }, hpIn()),
    dev('nexo-p12', 'NEXO', 'P12 (point source 12")', 'Son', { kg: 21 }, hpIn()),
    dev('nexo-p15', 'NEXO', 'P15 (point source 15")', 'Son', { kg: 30 }, hpIn()),
    dev('nexo-p18', 'NEXO', 'P18 (point source 18")', 'Son', { kg: 38 }, hpIn()),
    dev('nexo-ps8', 'NEXO', 'PS8 (2 voies 8")', 'Son', { kg: 11 }, hpIn()),
    dev('nexo-ps10r2', 'NEXO', 'PS10 R2 (2 voies 10")', 'Son', { kg: 15 }, hpIn()),
    dev('nexo-ps15r2', 'NEXO', 'PS15 R2 (2 voies 15")', 'Son', { kg: 26 }, hpIn()),
    dev('nexo-id14', 'NEXO', 'ID14 (ultra-compacte)', 'Son', { kg: 2.4 }, hpIn()),
    dev('nexo-id24', 'NEXO', 'ID24 (compacte 2 × 4")', 'Son', { kg: 6 }, hpIn()),
    dev('nexo-eps6', 'NEXO', 'ePS6 (2 voies 6,5")', 'Son', { kg: 7 }, hpIn()),
    dev('nexo-eps8', 'NEXO', 'ePS8 (2 voies 8")', 'Son', { kg: 10 }, hpIn()),
    dev('nexo-eps10', 'NEXO', 'ePS10 (2 voies 10")', 'Son', { kg: 13 }, hpIn()),
  ]),
  ...family('Subs', [
    dev('nexo-stm-s118', 'NEXO', 'STM S118 (sub 18")', 'Son', { kg: 95 }, hpIn('speakon8')),
    dev('nexo-msub15', 'NEXO', 'MSUB15 (sub 15", GEO M10)', 'Son', { kg: 45 }, hpIn()),
    dev('nexo-msub18', 'NEXO', 'MSUB18 (sub 18", GEO M12)', 'Son', { kg: 80 }, hpIn()),
    dev('nexo-cd12', 'NEXO', 'CD12 (sub cardioïde 2 × 12")', 'Son', { kg: 73 }, hpIn()),
    dev('nexo-cd18', 'NEXO', 'CD18 (sub cardioïde 18")', 'Son', { kg: 88 }, hpIn('speakon8')),
    dev('nexo-alpha-s2', 'NEXO', 'Alpha S2 (sub 2 × 18", legacy)', 'Son', { kg: 95 }, hpIn('speakon8')),
    dev('nexo-rs15', 'NEXO', 'RS15 (Ray Sub 15")', 'Son', { kg: 60 }, hpIn()),
    dev('nexo-rs18', 'NEXO', 'RS18 (Ray Sub 18")', 'Son', { kg: 93 }, hpIn()),
    dev('nexo-l15', 'NEXO', 'L15 (sub 15", série P)', 'Son', { kg: 45 }, hpIn()),
    dev('nexo-l18', 'NEXO', 'L18 (sub 18", série P)', 'Son', { kg: 60 }, hpIn()),
    dev('nexo-l20', 'NEXO', 'L20 (sub 20", série P)', 'Son', { kg: 77 }, hpIn()),
    dev('nexo-ls18', 'NEXO', 'LS18 (sub 18")', 'Son', { kg: 64 }, hpIn()),
    dev('nexo-ls600', 'NEXO', 'LS600 (sub 12", legacy)', 'Son', { kg: 39 }, hpIn()),
    dev('nexo-ls1200', 'NEXO', 'LS1200 (sub 18", legacy)', 'Son', { kg: 70 }, hpIn()),
    dev('nexo-ids108', 'NEXO', 'ID S108 (sub 8", série ID)', 'Son', { kg: 15 }, hpIn()),
    dev('nexo-ids110', 'NEXO', 'ID S110 (sub 10", série ID)', 'Son', { kg: 23 }, hpIn()),
    dev('nexo-els400', 'NEXO', 'eLS400 (sub 12", série ePS)', 'Son', { kg: 25 }, hpIn()),
  ]),
  ...family('Retours', [
    dev('nexo-45n12', 'NEXO', '45N-12 (retour haute puissance, legacy)', 'Son', { kg: 32 }, hpIn()),
  ]),
]
