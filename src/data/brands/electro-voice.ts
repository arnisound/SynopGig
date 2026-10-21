import type { DeviceTemplate } from '../../types'
import { A, HP, PWR, ins, outs, net, iec, pc32, antIn, antOut, dc, hpIn, dev, port, series, family } from '../catalogKit'

/* Electro-Voice: indicative connectors, check the manufacturer's data sheet. */

const B = 'Electro-Voice'
const mic = (id: string, model: string, kg: number, phantom = false) =>
  dev(id, B, model, 'Son', { kg }, [port('out', phantom ? 'Sortie (48 V)' : 'Sortie', 'xlr3', A, 'out')])
/** Powered speaker: combo input, XLR link, mains. */
const active = (id: string, model: string, kg: number, mains: 'pc' | 'iec' = 'iec') =>
  dev(id, B, model, 'Son', { kg }, [
    port('in', 'Entrée (combo)', 'xlr-combo', A, 'in'),
    port('thru', 'Link', 'xlr3', A, 'out'),
    mains === 'pc' ? pc32() : iec(),
  ])
/** Powered speaker with powerCON mains link. */
const activePc = (id: string, model: string, kg: number) =>
  dev(id, B, model, 'Son', { kg }, [
    port('in', 'Entrée (combo)', 'xlr-combo', A, 'in'),
    port('thru', 'Link', 'xlr3', A, 'out'),
    pc32(),
    port('pwr-out', 'Recopie secteur', 'powercon', PWR, 'out'),
  ])
/** Powered sub: 2 inputs, 2 high-pass/thru outputs, powerCON mains + link. */
const activeSub = (id: string, model: string, kg: number, mains: 'pc' | 'iec' = 'pc') =>
  dev(id, B, model, 'Son', { kg }, [
    ...ins(2, 'Entrée (combo)', 'xlr-combo'),
    ...outs(2, 'Sortie / Link'),
    ...(mains === 'pc' ? [pc32(), port('pwr-out', 'Recopie secteur', 'powercon', PWR, 'out')] : [iec()]),
  ])
const passive = (id: string, model: string, kg: number) => dev(id, B, model, 'Son', { kg }, hpIn())
const amp = (id: string, model: string, u: number, kg: number, ch: number, mains: 'pc' | 'iec' = 'iec') =>
  dev(id, B, model, 'Son', { u, kg }, [
    ...ins(ch, 'Entrée'),
    ...series('out', 'Sortie HP', ch, 'speakon', HP, 'out'),
    mains === 'pc' ? pc32() : iec(),
  ])

export const ELECTRO_VOICE: DeviceTemplate[] = [
  ...family('Micros filaires', [
    mic('ev-re20', 'RE20 (dynamique broadcast / grosse caisse)', 0.74),
    mic('ev-re320', 'RE320 (dynamique, grosse caisse / instruments)', 0.68),
    mic('ev-re27nd', 'RE27N/D (dynamique broadcast)', 0.74),
    mic('ev-re16', 'RE16 (dynamique supercardioïde, legacy)', 0.4),
    mic('ev-re200', 'RE200 (statique studio)', 0.4, true),
    mic('ev-re410', 'RE410 (statique chant)', 0.4, true),
    mic('ev-re510', 'RE510 (statique chant)', 0.4, true),
    mic('ev-re520', 'RE520 (statique chant supercardioïde)', 0.4, true),
    mic('ev-635a', '635A (dynamique omni reportage)', 0.2),
    mic('ev-nd44', 'ND44 (dynamique instrument)', 0.2),
    mic('ev-nd46', 'ND46 (dynamique instrument supercardioïde)', 0.25),
    mic('ev-nd66', 'ND66 (statique instrument)', 0.15, true),
    mic('ev-nd76', 'ND76 (dynamique chant)', 0.3),
    mic('ev-nd76s', 'ND76S (dynamique chant, interrupteur)', 0.3),
    mic('ev-nd86', 'ND86 (dynamique chant supercardioïde)', 0.3),
    mic('ev-nd96', 'ND96 (dynamique chant supercardioïde)', 0.3),
    mic('ev-nd468', 'N/D468 (dynamique instrument, legacy)', 0.3),
    mic('ev-nd767a', 'N/D767a (dynamique chant, legacy)', 0.3),
    mic('ev-nd868', 'N/D868 (dynamique grosse caisse, legacy)', 0.5),
    mic('ev-pl80a', 'PL80a (dynamique chant)', 0.3),
    mic('ev-pl33', 'PL33 (dynamique grosse caisse)', 0.4),
  ]),
  ...family('HF — récepteurs', [
    dev('ev-re3-rx', B, 'RE3-RX (récepteur HF demi-rack)', 'Son', { u: 1, kg: 1 }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), dc()]),
    dev('ev-r300-rx', B, 'R300 (récepteur HF, legacy)', 'Son', { kg: 0.8 }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), dc()]),
  ]),
  ...family('HF — émetteurs & micros HF', [
    dev('ev-re3-hht', B, 'RE3-HHT (émetteur main, tête ND76/ND86/ND96)', 'Son', { kg: 0.3 }, [antOut()]),
    dev('ev-re3-bpt', B, 'RE3-BPT (émetteur ceinture)', 'Son', { kg: 0.1 }, [antOut(), port('mic', 'Entrée micro (TA4F)', 'xlr4', A, 'in')]),
    dev('ev-r300-ht', B, 'R300 HT (émetteur main, legacy)', 'Son', { kg: 0.3 }, [antOut()]),
    dev('ev-r300-bp', B, 'R300 BP (émetteur ceinture, legacy)', 'Son', { kg: 0.1 }, [antOut(), port('mic', 'Entrée micro (TA4F)', 'xlr4', A, 'in')]),
  ]),
  ...family('Amplis', [
    amp('ev-cps2-4', 'CPS2.4 (ampli 2 × 1200 W)', 2, 12, 2),
    amp('ev-cps4-10', 'CPS4.10 (ampli 4 × 2500 W)', 2, 15, 4),
    amp('ev-cp1800s', 'CP1800S (ampli 2 canaux, legacy)', 2, 18, 2),
    amp('ev-cp2200', 'CP2200 (ampli 2 canaux, legacy)', 2, 18, 2),
    amp('ev-cp3000s', 'CP3000S (ampli 2 canaux, legacy)', 2, 20, 2),
    amp('ev-cp4000s', 'CP4000S (ampli 2 canaux, legacy)', 2, 22, 2),
    amp('ev-q44', 'Q44 (ampli 2 canaux, legacy)', 2, 14, 2),
    amp('ev-q66', 'Q66 (ampli 2 canaux, legacy)', 2, 15, 2),
    amp('ev-q99', 'Q99 (ampli 2 canaux, legacy)', 2, 16, 2),
    amp('ev-q1212', 'Q1212 (ampli 2 canaux, legacy)', 2, 17, 2),
    dev('ev-tg7', B, 'Tour Grade TG7 (ampli 2 × 3500 W)', 'Son', { u: 2, kg: 18 }, [
      ...ins(2, 'Entrée'), ...series('link', 'Link', 2, 'xlr3', A, 'out'),
      ...series('out', 'Sortie HP', 2, 'speakon', HP, 'out'), port('outB', 'Sortie HP bridge', 'speakon', HP, 'out'), iec(),
    ]),
    amp('ev-p3000rl', 'Precision P3000RL (ampli 2 canaux, legacy)', 2, 20, 2),
  ]),
  ...family('Processeurs', [
    dev('ev-dx38', B, 'Dx38 (processeur 3 in / 8 out)', 'Son', { u: 1, kg: 4 }, [...ins(3, 'Entrée'), ...outs(8, 'Sortie'), iec()]),
    dev('ev-dx46', B, 'Dx46 (processeur 4 in / 6 out)', 'Son', { u: 1, kg: 4 }, [...ins(4, 'Entrée'), ...outs(6, 'Sortie'), iec()]),
    dev('ev-dc-one', B, 'Dc-One (processeur 2 in / 6 out)', 'Son', { u: 1, kg: 3 }, [...ins(2, 'Entrée'), ...outs(6, 'Sortie'), iec()]),
    dev('ev-n8000', B, 'NetMax N8000 (matrice DSP, legacy)', 'Son', { u: 2, kg: 9 }, [...ins(8, 'Entrée'), ...outs(8, 'Sortie'), net('Ethernet', 'rj45'), iec()]),
  ]),
  ...family('Line arrays & colonnes', [
    passive('ev-x1-212-90', 'X1-212/90 (line array 2 × 12″, 90°)', 49),
    passive('ev-x1-212-120', 'X1-212/120 (line array 2 × 12″, 120°)', 49),
    passive('ev-x2-212-90', 'X2-212/90 (line array 2 × 12″, 90°)', 57),
    passive('ev-x2-212-120', 'X2-212/120 (line array 2 × 12″, 120°)', 57),
    passive('ev-xld281', 'XLD281 (line array X-Line Advance 2 × 8″, legacy)', 25),
    passive('ev-xld291', 'XLD291 (line array X-Line Advance 2 × 8″, 120°, legacy)', 25),
    passive('ev-xle181', 'XLE181 (line array compact 8″, legacy)', 14),
    passive('ev-xle191', 'XLE191 (line array compact 8″, 120°, legacy)', 14),
    passive('ev-xlc127dvx', 'XLC127DVX (line array X-Line Compact, legacy)', 39),
    dev('ev-evolve-30m', B, 'Evolve 30M (colonne active + table 8 voies)', 'Son', { kg: 24 }, [
      ...ins(4, 'Entrée micro/ligne (combo)', 'xlr-combo'), ...series('inJ', 'Entrée jack', 2, 'jack', A, 'in'),
      port('mix', 'Sortie mix', 'xlr3', A, 'out'), iec(),
    ]),
    dev('ev-evolve-50', B, 'Evolve 50 (colonne active)', 'Son', { kg: 29 }, [
      ...ins(2, 'Entrée (combo)', 'xlr-combo'), port('aux', 'Entrée aux', 'minijack', A, 'in'),
      port('mix', 'Sortie mix', 'xlr3', A, 'out'), iec(),
    ]),
    dev('ev-evolve-50m', B, 'Evolve 50M (colonne active + table 8 voies)', 'Son', { kg: 30 }, [
      ...ins(4, 'Entrée micro/ligne (combo)', 'xlr-combo'), ...series('inJ', 'Entrée jack', 2, 'jack', A, 'in'),
      port('mix', 'Sortie mix', 'xlr3', A, 'out'), iec(),
    ]),
  ]),
  ...family('Enceintes', [
    activePc('ev-etx-10p', 'ETX-10P (active 10″, 2000 W)', 21),
    activePc('ev-etx-12p', 'ETX-12P (active 12″, 2000 W)', 27),
    activePc('ev-etx-15p', 'ETX-15P (active 15″, 2000 W)', 31),
    activePc('ev-etx-35p', 'ETX-35P (active 3 voies 15″, 2000 W)', 46),
    passive('ev-ekx-12', 'EKX-12 (passive 12″)', 18),
    passive('ev-ekx-15', 'EKX-15 (passive 15″)', 21),
    active('ev-ekx-12p', 'EKX-12P (active 12″, 1500 W)', 20),
    active('ev-ekx-15p', 'EKX-15P (active 15″, 1500 W)', 23),
    passive('ev-elx200-10', 'ELX200-10 (passive 10″)', 13),
    passive('ev-elx200-12', 'ELX200-12 (passive 12″)', 15),
    passive('ev-elx200-15', 'ELX200-15 (passive 15″)', 18),
    active('ev-elx200-10p', 'ELX200-10P (active 10″, 1200 W)', 15),
    active('ev-elx200-12p', 'ELX200-12P (active 12″, 1200 W)', 17),
    active('ev-elx200-15p', 'ELX200-15P (active 15″, 1200 W)', 20),
    dev('ev-everse-8', B, 'EVERSE 8 (active sur batterie 8″, mixeur 4 voies)', 'Son', { kg: 13 }, [
      ...ins(2, 'Entrée (combo)', 'xlr-combo'), port('aux', 'Entrée aux', 'minijack', A, 'in'),
      port('mix', 'Sortie mix', 'xlr3', A, 'out'), iec(),
    ]),
    dev('ev-everse-12', B, 'EVERSE 12 (active sur batterie 12″, mixeur 4 voies)', 'Son', { kg: 18 }, [
      ...ins(2, 'Entrée (combo)', 'xlr-combo'), port('aux', 'Entrée aux', 'minijack', A, 'in'),
      port('mix', 'Sortie mix', 'xlr3', A, 'out'), iec(),
    ]),
    dev('ev-zlx-8p-g2', B, 'ZLX-8P-G2 (active 8″, 1000 W)', 'Son', { kg: 11 }, [...ins(2, 'Entrée (combo)', 'xlr-combo'), port('thru', 'Link', 'xlr3', A, 'out'), iec()]),
    dev('ev-zlx-12p-g2', B, 'ZLX-12P-G2 (active 12″, 1000 W)', 'Son', { kg: 16 }, [...ins(2, 'Entrée (combo)', 'xlr-combo'), port('thru', 'Link', 'xlr3', A, 'out'), iec()]),
    dev('ev-zlx-15p-g2', B, 'ZLX-15P-G2 (active 15″, 1000 W)', 'Son', { kg: 18 }, [...ins(2, 'Entrée (combo)', 'xlr-combo'), port('thru', 'Link', 'xlr3', A, 'out'), iec()]),
    dev('ev-zlx-12p', B, 'ZLX-12P (active 12″, 1000 W, 1re génération)', 'Son', { kg: 16 }, [...ins(2, 'Entrée (combo)', 'xlr-combo'), port('thru', 'Link', 'xlr3', A, 'out'), iec()]),
    dev('ev-zlx-15p', B, 'ZLX-15P (active 15″, 1000 W, 1re génération)', 'Son', { kg: 18 }, [...ins(2, 'Entrée (combo)', 'xlr-combo'), port('thru', 'Link', 'xlr3', A, 'out'), iec()]),
    passive('ev-zlx-12', 'ZLX-12 (passive 12″)', 14),
    passive('ev-zlx-15', 'ZLX-15 (passive 15″)', 16),
    passive('ev-zx1-90', 'ZX1-90 (passive compacte 8″)', 8),
    passive('ev-zx3-90', 'ZX3-90 (passive 12″)', 20),
    passive('ev-zx5-90', 'ZX5-90 (passive 15″)', 26),
    active('ev-zxa1-90', 'ZXA1-90 (active compacte 8″)', 10),
    passive('ev-sx300', 'SX300 (passive 12″, legacy)', 14),
    passive('ev-tx1122', 'Tour X TX1122 (passive 12″)', 22),
    passive('ev-tx1152', 'Tour X TX1152 (passive 15″)', 26),
    passive('ev-qrx-112-75', 'QRx 112/75 (passive 12″, legacy)', 29),
    passive('ev-qrx-115-75', 'QRx 115/75 (passive 15″, legacy)', 34),
  ]),
  ...family('Subs', [
    passive('ev-x12-128', 'X12-128 (sub X1, 2 × 12″)', 50),
    passive('ev-x2-218', 'X2-218 (sub X2, 2 × 18″)', 108),
    passive('ev-xlc118', 'XLC118 (sub X-Line Compact 18″, legacy)', 50),
    passive('ev-xlc215', 'XLC215 (sub X-Line Compact 2 × 15″, legacy)', 75),
    activeSub('ev-etx-15sp', 'ETX-15SP (sub actif 15″, 1800 W)', 43),
    activeSub('ev-etx-18sp', 'ETX-18SP (sub actif 18″, 1800 W)', 50),
    passive('ev-ekx-15s', 'EKX-15S (sub passif 15″)', 33),
    passive('ev-ekx-18s', 'EKX-18S (sub passif 18″)', 40),
    activeSub('ev-ekx-15sp', 'EKX-15SP (sub actif 15″, 1300 W)', 38, 'iec'),
    activeSub('ev-ekx-18sp', 'EKX-18SP (sub actif 18″, 1300 W)', 45, 'iec'),
    passive('ev-elx200-18s', 'ELX200-18S (sub passif 18″)', 35),
    activeSub('ev-elx200-12sp', 'ELX200-12SP (sub actif 12″, 1200 W)', 30, 'iec'),
    activeSub('ev-elx200-18sp', 'ELX200-18SP (sub actif 18″, 1200 W)', 42, 'iec'),
    passive('ev-zx1-sub', 'ZX1-Sub (sub passif 12″)', 22),
    activeSub('ev-zxa1-sub', 'ZXA1-Sub (sub actif 12″)', 25, 'iec'),
    passive('ev-tx1181', 'Tour X TX1181 (sub passif 18″)', 45),
    passive('ev-tx2181', 'Tour X TX2181 (sub passif 2 × 18″)', 70),
    passive('ev-qrx-218s', 'QRx 218S (sub passif 2 × 18″, legacy)', 75),
  ]),
  ...family('Retours', [
    dev('ev-pxm-12mp', B, 'PXM-12MP (retour actif coaxial 12″)', 'Son', { kg: 17 }, [...ins(2, 'Entrée (combo)', 'xlr-combo'), port('thru', 'Link', 'xlr3', A, 'out'), iec()]),
    passive('ev-tx1122fm', 'Tour X TX1122FM (retour passif 12″)', 22),
    passive('ev-tx1152fm', 'Tour X TX1152FM (retour passif 15″)', 27),
    dev('ev-xw12a', B, 'XW12A (retour bi-amp 12″, legacy)', 'Son', { kg: 30 }, hpIn('speakon8')),
  ]),
]
