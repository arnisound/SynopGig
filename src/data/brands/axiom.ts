import type { DeviceTemplate, Port } from '../../types'
import { HP, ins, t1Link, pc32, lineIn, hpIn, dev, port, series, family } from '../catalogKit'

/* Axiom Pro Audio: indicative connectors, check the manufacturer's data sheet. */

const X = 'Axiom Pro Audio'

/** PRONET (CANBUS over RJ45) in + out. */
const pronet = (): Port[] => [
  port('canIn', 'PRONET in', 'rj45', 'control', 'in'),
  port('canOut', 'PRONET out', 'rj45', 'control', 'out'),
]

/** Active CORE-processed cabinet: XLR + link, PRONET, powerCON TRUE1 in + link. */
const active = (): Port[] => [...lineIn(), ...pronet(), ...t1Link()]

/** Active sub driving passive columns from its internal amp. */
const subColumn = (n: number): Port[] => [...lineIn(), ...series('hp', 'Sortie colonne', n, 'speakon', HP, 'out'), ...pronet(), ...t1Link()]

/** QC DSP amplifier: XLR inputs, Speakon outputs, CANBUS. */
const qc = (ch: number): Port[] => [...ins(ch, 'Entrée'), ...series('hp', 'Sortie HP', ch, 'speakon', HP, 'out'), ...pronet(), pc32()]

export const AXIOM: DeviceTemplate[] = [
  ...family('Amplis', [
    dev('axiom-qc24', X, 'QC2.4 (ampli DSP 2 canaux)', 'Son', { u: 2, kg: 18.5 }, qc(2)),
    dev('axiom-qc44', X, 'QC4.4 (ampli DSP 4 canaux)', 'Son', { u: 2, kg: 19 }, qc(4)),
  ]),
  ...family('Line arrays & colonnes', [
    dev('axiom-ax1012a', X, 'AX1012A (courbure constante active 12")', 'Son', { kg: 33 }, active()),
    dev('axiom-ax1012p', X, 'AX1012P (courbure constante passive 12")', 'Son', { kg: 30 }, hpIn()),
    dev('axiom-ax2010a', X, 'AX2010A (line array actif 2 × 10")', 'Son', { kg: 35 }, active()),
    dev('axiom-ax2010p', X, 'AX2010P (line array passif 2 × 10")', 'Son', { kg: 32 }, hpIn()),
    dev('axiom-ax2065a', X, 'AX2065A (line array compact actif 2 × 6,5")', 'Son', { kg: 18 }, active()),
    dev('axiom-ax2065p', X, 'AX2065P (line array compact passif 2 × 6,5")', 'Son', { kg: 16 }, hpIn()),
    dev('axiom-ax800a', X, 'AX800A (line array compact actif 2 × 8")', 'Son', { kg: 20 }, active()),
    dev('axiom-ax12c', X, 'AX12C (colonne passive 12 × 3,5")', 'Son', { kg: 13 }, hpIn()),
    dev('axiom-ax6c', X, 'AX6C (colonne passive 6 × 3,5")', 'Son', { kg: 7 }, hpIn()),
    dev('axiom-ax12lf', X, 'AX12LF (colonne grave passive 12 × 3,5")', 'Son', { kg: 13.2 }, hpIn()),
    dev('axiom-ax8cl', X, 'AX8CL (colonne passive 8 × 2,5")', 'Son', { kg: 5 }, hpIn()),
    dev('axiom-ax16cl', X, 'AX16CL (colonne passive 16 × 2,5")', 'Son', { kg: 8 }, hpIn()),
  ]),
  ...family('Enceintes', [
    dev('axiom-ed60p', X, 'ED60P (passive 6")', 'Son', { kg: 6 }, hpIn()),
    dev('axiom-ed80p', X, 'ED80P (passive 8" + 1")', 'Son', { kg: 10 }, hpIn()),
    dev('axiom-ed80a', X, 'ED80A (active 8" + 1")', 'Son', { kg: 12 }, active()),
    dev('axiom-ed120p', X, 'ED120P (passive 12" + 1")', 'Son', { kg: 17 }, hpIn()),
    dev('axiom-ed120a', X, 'ED120A (active 12" + 1")', 'Son', { kg: 20 }, active()),
    dev('axiom-ed150p', X, 'ED150P (passive 15" + 1,4")', 'Son', { kg: 25 }, hpIn()),
    dev('axiom-ed150a', X, 'ED150A (active 15" + 1,4")', 'Son', { kg: 28 }, active()),
    dev('axiom-ed12p', X, 'ED12P (passive 12")', 'Son', { kg: 18 }, hpIn()),
    dev('axiom-ed15p', X, 'ED15P (passive 15")', 'Son', { kg: 24 }, hpIn()),
    dev('axiom-ed210p', X, 'ED210P (passive 2 × 10")', 'Son', { kg: 22 }, hpIn()),
    dev('axiom-ed23p', X, 'ED23P (passive compacte)', 'Son', { kg: 10 }, hpIn()),
    dev('axiom-ed25p', X, 'ED25P (passive compacte)', 'Son', { kg: 12 }, hpIn()),
    dev('axiom-ed65p', X, 'ED65P (passive 6,5")', 'Son', { kg: 8 }, hpIn()),
  ]),
  ...family('Retours', [
    dev('axiom-cxl12a', X, 'CXL12A (retour coaxial actif 12")', 'Son', { kg: 15 }, active()),
    dev('axiom-cx14a', X, 'CX14A (retour coaxial actif 14")', 'Son', { kg: 17 }, active()),
    dev('axiom-cx15a', X, 'CX15A (retour coaxial actif 15")', 'Son', { kg: 19 }, active()),
  ]),
  ...family('Subs', [
    dev('axiom-sw18a', X, 'SW18A (sub actif 18")', 'Son', { kg: 60 }, active()),
    dev('axiom-sw118a', X, 'SW118A (sub actif compact 18")', 'Son', { kg: 50 }, active()),
    dev('axiom-sw210p', X, 'SW210P (sub passif extra-plat 2 × 10")', 'Son', { kg: 30 }, hpIn()),
    dev('axiom-sw212a', X, 'SW212A (sub actif 2 × 12", alimente les colonnes AX8CL/AX16CL)', 'Son', { kg: 45 }, subColumn(2)),
    dev('axiom-sw215a', X, 'SW215A (sub actif 2 × 15" passe-bande)', 'Son', { kg: 80 }, active()),
    dev('axiom-sw215p', X, 'SW215P (sub passif 2 × 15" passe-bande)', 'Son', { kg: 75 }, hpIn()),
    dev('axiom-sw2100a', X, 'SW2100A (sub actif 21", alimente les colonnes AX12C/AX6C)', 'Son', { kg: 65 }, subColumn(2)),
    dev('axiom-sw218a', X, 'SW218A (sub actif 2 × 18")', 'Son', { kg: 105 }, active()),
    dev('axiom-sw218p', X, 'SW218P (sub passif 2 × 18")', 'Son', { kg: 100 }, hpIn()),
    dev('axiom-sw218xa', X, 'SW218XA (sub actif 2 × 18" ligne de transmission)', 'Son', { kg: 110 }, active()),
    dev('axiom-sw218xp', X, 'SW218XP (sub passif 2 × 18" ligne de transmission)', 'Son', { kg: 105 }, hpIn()),
    dev('axiom-sw36xfa', X, 'SW36XFA (sub actif accrochable 2 × 18")', 'Son', { kg: 95 }, active()),
    dev('axiom-sw36xfp', X, 'SW36XFP (sub passif accrochable 2 × 18")', 'Son', { kg: 90 }, hpIn()),
    dev('axiom-sw1800a', X, 'SW1800A (sub actif 2 × 18")', 'Son', { kg: 95 }, active()),
  ]),
]
