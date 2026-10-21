import type { DeviceTemplate } from '../../types'
import { HP, NET, ins, pair, t1Link, pc32, hpIn, dev, series, family } from '../catalogKit'

/* Adamson: indicative connectors, check the manufacturer's data sheet. */

/* CS-Series self-powered enclosures: Milan AVB in/thru + TRUE1 in/link. */
const csPowered = () => [...pair('avb', 'Milan AVB', 'ethercon', NET), ...t1Link()]

export const ADAMSON: DeviceTemplate[] = [
  ...family('Amplis', [
    dev('adamson-cs-amp', 'Adamson', 'CS-Amp (ampli 8 canaux Milan AVB)', 'Son', { u: 2, kg: 14 }, [...ins(4, 'Entrée analog/AES'), ...pair('avb', 'Milan AVB', 'ethercon', NET), ...series('hp', 'Sortie NL8', 4, 'speakon8', HP, 'out'), pc32()]),
  ]),
  ...family('Line arrays & colonnes', [
    dev('adamson-e15', 'Adamson', 'E15 (line array 3 voies 2 × 15")', 'Son', { kg: 84 }, hpIn('speakon8')),
    dev('adamson-e12', 'Adamson', 'E12 (line array 3 voies 2 × 12")', 'Son', { kg: 66 }, hpIn('speakon8')),
    dev('adamson-s10', 'Adamson', 'S10 (line array 2 voies 2 × 10")', 'Son', { kg: 25 }, hpIn('speakon8')),
    dev('adamson-s7', 'Adamson', 'S7 (line array 2 voies 2 × 7")', 'Son', { kg: 17 }, hpIn('speakon8')),
    dev('adamson-cs10', 'Adamson', 'CS10 (line array amplifié 2 × 10", Milan)', 'Son', { kg: 34 }, csPowered()),
    dev('adamson-cs7', 'Adamson', 'CS7 (line array amplifié 2 × 7", Milan)', 'Son', { kg: 24 }, csPowered()),
    dev('adamson-is10', 'Adamson', 'IS10 (line array installation 2 × 10")', 'Son', { kg: 24 }, hpIn()),
    dev('adamson-is7', 'Adamson', 'IS7 (line array installation 2 × 7")', 'Son', { kg: 16 }, hpIn()),
    dev('adamson-y10', 'Adamson', 'Y10 (line array 2 × 10", ancien)', 'Son', { kg: 50 }, hpIn('speakon8')),
    dev('adamson-spektrix', 'Adamson', 'SpekTrix (line array compact, ancien)', 'Son', { kg: 25 }, hpIn()),
    dev('adamson-metrix', 'Adamson', 'Metrix (line array 2 × 8", ancien)', 'Son', { kg: 30 }, hpIn('speakon8')),
  ]),
  ...family('Enceintes', [
    dev('adamson-s7p', 'Adamson', 'S7p (point source 2 × 7")', 'Son', { kg: 16 }, hpIn('speakon8')),
    dev('adamson-cs7p', 'Adamson', 'CS7p (point source amplifiée 2 × 7", Milan)', 'Son', { kg: 22 }, csPowered()),
    dev('adamson-is7p', 'Adamson', 'IS7p (point source installation 2 × 7")', 'Son', { kg: 15 }, hpIn()),
    dev('adamson-is10p', 'Adamson', 'IS10p (point source installation 2 × 10")', 'Son', { kg: 23 }, hpIn()),
    dev('adamson-is5c', 'Adamson', 'IS5c (enceinte compacte 5")', 'Son', { kg: 6 }, hpIn()),
    dev('adamson-point8', 'Adamson', 'Point 8 (coaxiale 8")', 'Son', { kg: 18 }, hpIn()),
    dev('adamson-point12', 'Adamson', 'Point 12 (coaxiale 12")', 'Son', { kg: 26 }, hpIn()),
  ]),
  ...family('Subs', [
    dev('adamson-e219', 'Adamson', 'E219 (sub 2 × 19")', 'Son', { kg: 165 }, hpIn('speakon8')),
    dev('adamson-e119', 'Adamson', 'E119 (sub accrochable 19")', 'Son', { kg: 98 }, hpIn('speakon8')),
    dev('adamson-s119', 'Adamson', 'S119 (sub 19")', 'Son', { kg: 72 }, hpIn('speakon8')),
    dev('adamson-cs119', 'Adamson', 'CS119 (sub amplifié 19", Milan)', 'Son', { kg: 80 }, csPowered()),
    dev('adamson-is118', 'Adamson', 'IS118 (sub installation 18")', 'Son', { kg: 60 }, hpIn()),
    dev('adamson-is119', 'Adamson', 'IS119 (sub installation 19")', 'Son', { kg: 70 }, hpIn()),
    dev('adamson-is219', 'Adamson', 'IS219 (sub installation 2 × 19")', 'Son', { kg: 105 }, hpIn()),
    dev('adamson-y18', 'Adamson', 'Y18 (sub 18", ancien)', 'Son', { kg: 90 }, hpIn('speakon8')),
    dev('adamson-t21', 'Adamson', 'T21 (sub 21", ancien)', 'Son', { kg: 90 }, hpIn('speakon8')),
  ]),
  ...family('Retours', [
    dev('adamson-m15', 'Adamson', 'M15 (retour coaxial 15")', 'Son', { kg: 37 }, hpIn()),
  ]),
]
