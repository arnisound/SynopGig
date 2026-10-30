import type { DeviceTemplate, Port } from '../../types'
import { A, AES, HP, NET, CTRL, dc, ins, net, iec, t1Link, pc32, lineIn, hpIn, dev, port, series, family } from '../catalogKit'

/* Fohhn: indicative connectors, check the manufacturer's data sheet. */

const F = 'Fohhn'

/** Fohhn-Net control bus (in + out). */
const fnet = (c: 'xlr3' | 'rj45' = 'xlr3'): Port[] => [
  port('fnetIn', 'Fohhn-Net in', c, 'control', 'in'),
  port('fnetOut', 'Fohhn-Net out', c, 'control', 'out'),
]

/** Active Linea Focus / Focus Modular: XLR + link, Fohhn-Net, Dante option, powerCON TRUE1 in + link. */
const steer = (): Port[] => [...lineIn(), ...fnet(), net('Dante (option)', 'rj45'), ...t1Link()]

/** Next-generation DLI: analog + AES/EBU, Fohhn Airea, Fohhn-Net, Dante option, TRUE1. */
const dli = (): Port[] => [
  ...lineIn(),
  port('aes', 'Entrée AES/EBU', 'xlr3', AES, 'in'),
  port('airea', 'Fohhn Airea', 'rj45', NET, 'io'),
  ...fnet(),
  net('Dante (option)', 'rj45'),
  ...t1Link(),
]

/** System amplifiers: XLR inputs, Speakon outputs, Fohhn-Net RJ45. */
const amp = (ch: number, extra: Port[] = []): Port[] => [
  ...ins(ch, 'Entrée'),
  ...extra,
  ...series('hp', 'Sortie HP', ch, 'speakon', HP, 'out'),
  ...fnet('rj45'),
  pc32(),
]

/** DI amplifiers: analog XLR + AES/EBU, Dante module optional. */
const diAmp = (ch: number): Port[] =>
  amp(ch, [port('aes', 'Entrée AES/EBU', 'xlr3', AES, 'in'), net('Dante (module IN-50 option)', 'rj45')])

/** MA media amplifiers: Euroblock in/out. */
const maAmp = (danteNet: boolean): Port[] => [
  ...series('in', 'Entrée', 4, 'euroblock', A, 'in'),
  ...(danteNet ? [net('Dante', 'rj45')] : []),
  ...series('hp', 'Sortie HP', 4, 'euroblock', HP, 'out'),
  ...fnet('rj45'),
  iec(),
]

export const FOHHN: DeviceTemplate[] = [
  ...family('Amplis', [
    dev('fohhn-d2750', F, 'D-2.750 (ampli DSP 2 × 750 W)', 'Son', { u: 1, kg: 6 }, amp(2)),
    dev('fohhn-d4750', F, 'D-4.750 (ampli DSP 4 × 750 W)', 'Son', { u: 1, kg: 7 }, amp(4)),
    dev('fohhn-d21500', F, 'D-2.1500 (ampli DSP 2 × 1500 W)', 'Son', { u: 2, kg: 10 }, amp(2)),
    dev('fohhn-d41200', F, 'D-4.1200 (ampli DSP 4 × 1200 W)', 'Son', { u: 2, kg: 12 }, amp(4)),
    dev('fohhn-di22000', F, 'DI-2.2000 (ampli DSP 2 × 2000 W, Dante option)', 'Son', { u: 2, kg: 10 }, diAmp(2)),
    dev('fohhn-di24000', F, 'DI-2.4000 (ampli DSP 2 × 4000 W, Dante option)', 'Son', { u: 2, kg: 13 }, diAmp(2)),
    dev('fohhn-di41000', F, 'DI-4.1000 (ampli DSP 4 × 1000 W, Dante option)', 'Son', { u: 2, kg: 10 }, diAmp(4)),
    dev('fohhn-di42000', F, 'DI-4.2000 (ampli DSP 4 × 2000 W, Dante option)', 'Son', { u: 2, kg: 13 }, diAmp(4)),
    dev('fohhn-ma4100', F, 'MA-4.100 ANA (ampli média 4 × 100 W)', 'Son', { u: 1, kg: 3 }, maAmp(false)),
    dev('fohhn-ma4100dan', F, 'MA-4.100 DAN (ampli média 4 × 100 W, Dante)', 'Son', { u: 1, kg: 3 }, maAmp(true)),
  ]),
  ...family('Processeurs', [
    dev('fohhn-na3', F, 'NA-3 (passerelle Fohhn-Net / Ethernet)', 'Son', { kg: 0.5 }, [net('Ethernet', 'rj45'), ...fnet(), port('pwr', 'Alim DC', 'dc', 'power', 'in')]),
    dev('fohhn-na11', F, 'NA-11 (interface USB / Fohhn-Net)', 'Son', { kg: 0.2 }, [port('usb', 'USB (PC, alimentation)', 'usb', CTRL, 'io'), port('fnetRj', 'Fohhn-Net RJ45', 'rj45', 'control', 'io'), port('fnetXlr', 'Fohhn-Net XLR', 'xlr3', 'control', 'io')]),
    // ABX: small boxes around Fohhn Airea (digital audio and Fohhn-Net control on one Cat cable).
    dev('fohhn-abx1', F, 'ABX-1 (convertisseur Airea → 2 sorties analogiques, sans alim)', 'Son', { kg: 0.4 }, [port('airea', 'Entrée Airea', 'rj45', AES, 'in'), ...series('out', 'Sortie analogique', 2, 'xlr3', A, 'out')]),
    dev('fohhn-abx2', F, 'ABX-2 (convertisseur 2 entrées analogiques → AES/EBU et Airea)', 'Son', { kg: 0.4 }, [...series('in', 'Entrée analogique', 2, 'xlr3', A, 'in'), port('aes', 'Sortie AES/EBU', 'xlr3', AES, 'out'), port('fnetIn', 'Fohhn-Net in', 'xlr3', 'control', 'in'), port('airea', 'Sortie Airea', 'rj45', AES, 'out'), dc()]),
    dev('fohhn-abx3', F, 'ABX-3 (convertisseur Airea → 2 sorties analogiques, avec DSP Fohhn)', 'Son', { kg: 0.5 }, [port('airea', 'Entrée Airea', 'rj45', AES, 'in'), ...series('out', 'Sortie analogique', 2, 'xlr3', A, 'out'), port('fnetOut', 'Fohhn-Net out', 'xlr3', 'control', 'out'), dc()]),
    dev('fohhn-abx4', F, 'ABX-4 (éclaté passif Airea → AES/EBU + Fohhn-Net)', 'Son', { kg: 0.3 }, [port('airea', 'Entrée Airea', 'rj45', AES, 'in'), port('aes', 'Sortie AES/EBU', 'xlr3', AES, 'out'), port('fnetOut', 'Fohhn-Net out', 'xlr3', 'control', 'out')]),
    dev('fohhn-abx5', F, 'ABX-5 (pont Dante → Airea / AES/EBU, fin de série)', 'Son', { kg: 0.8 }, [port('pri', 'Dante primaire', 'rj45', NET, 'io'), port('sec', 'Dante secondaire', 'rj45', NET, 'io'), port('airea', 'Sortie Airea', 'rj45', AES, 'out'), ...series('aes', 'Sortie AES/EBU', 2, 'xlr3', AES, 'out'), ...fnet(), dc()]),
    dev('fohhn-abx6', F, 'ABX-6 (breakout Dante 8 canaux : 2 AES/EBU, 2 Airea, SFP)', 'Son', { kg: 1 }, [port('pri', 'Dante primaire', 'rj45', NET, 'io'), port('sec', 'Dante secondaire', 'rj45', NET, 'io'), port('sfpA', 'SFP A', 'sfp', NET, 'io'), port('sfpB', 'SFP B', 'sfp', NET, 'io'), ...series('aes', 'Sortie AES/EBU', 2, 'xlr3', AES, 'out'), ...series('airea', 'Sortie Airea', 2, 'rj45', AES, 'out'), ...fnet(), dc()]),
  ]),
  ...family('Line arrays & colonnes', [
    // Focus Venue: beam-steering concert system, modules stacked or flown straight.
    dev('fohhn-fv100', F, 'Focus Venue FV-100 (module aigu actif, beam steering, 16 × 220 W)', 'Son', {}, [...dli(), port('opto', 'Optocore (option)', 'opticalcon', AES, 'io')]),
    dev('fohhn-fv200', F, 'Focus Venue FV-200 (module bas-médium actif, 8 × 10", 4 × 1000 W)', 'Son', {}, [...dli(), port('opto', 'Optocore (option)', 'opticalcon', AES, 'io')]),
    dev('fohhn-lfi120', F, 'Linea Focus LFI-120 (colonne orientable active 8 × 4")', 'Son', { kg: 14 }, steer()),
    dev('fohhn-lfi220', F, 'Linea Focus LFI-220 (colonne orientable active 16 × 4")', 'Son', { kg: 22 }, steer()),
    dev('fohhn-lfi350', F, 'Linea Focus LFI-350 (colonne orientable active 24 × 4")', 'Son', { kg: 31 }, steer()),
    dev('fohhn-lfi450', F, 'Linea Focus LFI-450 (colonne orientable active 32 × 4")', 'Son', { kg: 40 }, steer()),
    dev('fohhn-dli130', F, 'Linea Focus DLI-130 (colonne orientable active 8 × 4")', 'Son', { kg: 15 }, dli()),
    dev('fohhn-dli230', F, 'Linea Focus DLI-230 (colonne orientable active 16 × 4")', 'Son', { kg: 24 }, dli()),
    dev('fohhn-dli230m', F, 'Linea Focus DLI-230 mobile (colonne orientable active, version tournée)', 'Son', { kg: 26 }, dli()),
    dev('fohhn-fs110', F, 'FS-110 (colonne fine active orientable)', 'Son', { kg: 9 }, steer()),
    dev('fohhn-fs150', F, 'FS-150 (colonne fine active orientable)', 'Son', { kg: 13 }, steer()),
    dev('fohhn-fm100', F, 'Focus Modular FM-100 (module aigu passif)', 'Son', { kg: 20 }, hpIn()),
    dev('fohhn-fmi100', F, 'Focus Modular FMI-100 (module aigu actif orientable)', 'Son', { kg: 24 }, steer()),
    dev('fohhn-fm110', F, 'Focus Modular FM-110 (module aigu passif)', 'Son', { kg: 22 }, hpIn()),
    dev('fohhn-fmi110', F, 'Focus Modular FMI-110 (module aigu actif orientable)', 'Son', { kg: 26 }, steer()),
    dev('fohhn-fm400', F, 'Focus Modular FM-400 (module bas-médium passif 32 × 4")', 'Son', { kg: 55 }, hpIn()),
    dev('fohhn-fmi400', F, 'Focus Modular FMI-400 (module bas-médium actif 32 × 4")', 'Son', { kg: 62 }, steer()),
    dev('fohhn-lx60', F, 'Linea LX-60 (colonne passive)', 'Son', { kg: 9 }, hpIn()),
    dev('fohhn-lx61', F, 'Linea LX-61 (colonne passive)', 'Son', { kg: 12 }, hpIn()),
    dev('fohhn-lx100', F, 'Linea LX-100 (colonne passive)', 'Son', { kg: 14 }, hpIn()),
    dev('fohhn-lx150', F, 'Linea LX-150 (colonne passive)', 'Son', { kg: 18 }, hpIn()),
    dev('fohhn-lx220', F, 'Linea LX-220 (colonne passive)', 'Son', { kg: 25 }, hpIn()),
    dev('fohhn-len60', F, 'LEN-60 (colonne passive 100 V)', 'Son', { kg: 8 }, hpIn()),
    dev('fohhn-len100', F, 'LEN-100 (colonne passive 100 V)', 'Son', { kg: 12 }, hpIn()),
  ]),
  ...family('Enceintes', [
    dev('fohhn-lx10', F, 'Linea LX-10 (enceinte coaxiale compacte)', 'Son', { kg: 5 }, hpIn()),
    dev('fohhn-xt4', F, 'XT-4 (enceinte passive 12" + 1,4")', 'Son', { kg: 20 }, hpIn()),
    dev('fohhn-xt22', F, 'XT-22 (enceinte passive compacte)', 'Son', { kg: 14 }, hpIn()),
    dev('fohhn-at05', F, 'Arc AT-05 (enceinte passive compacte installation)', 'Son', { kg: 5 }, hpIn()),
    dev('fohhn-at07', F, 'Arc AT-07 (enceinte passive 6,5" + 1")', 'Son', { kg: 8 }, hpIn()),
    dev('fohhn-at09', F, 'Arc AT-09 (enceinte passive 2 × 6,5" + 1")', 'Son', { kg: 11 }, hpIn()),
    dev('fohhn-at10', F, 'Arc AT-10 (enceinte passive 8" + 1")', 'Son', { kg: 12 }, hpIn()),
    dev('fohhn-at35', F, 'Arc AT-35 (enceinte passive 12" + 1")', 'Son', { kg: 18 }, hpIn()),
  ]),
  ...family('Retours', [
    dev('fohhn-xm4', F, 'XM-4 (retour de scène passif 12" + 1,4")', 'Son', { kg: 19 }, hpIn()),
  ]),
  ...family('Subs', [
    dev('fohhn-ps400', F, 'PS-400 (sub 1 × 18", Focus Venue)', 'Son', {}, hpIn()),
    dev('fohhn-ps450', F, 'PS-450 (sub 2 × 18", Focus Venue)', 'Son', {}, hpIn()),
    dev('fohhn-ps800', F, 'PS-800 (sub passif, Focus Venue)', 'Son', {}, hpIn()),
    dev('fohhn-ps850', F, 'PS-850 (sub passif 2 × 18", Speakon avant et arrière pour cardio)', 'Son', {}, [...hpIn(), port('inRear', 'Entrée HP arrière', 'speakon', HP, 'in'), port('linkRear', 'Link HP arrière', 'speakon', HP, 'out')]),
    dev('fohhn-xs10', F, 'XS-10 (sub passif)', 'Son', { kg: 30 }, hpIn()),
    dev('fohhn-xs20', F, 'XS-20 (sub passif)', 'Son', { kg: 35 }, hpIn()),
    dev('fohhn-xs22', F, 'XS-22 (sub actif 12")', 'Son', { kg: 25 }, [...series('in', 'Entrée', 2, 'xlr3', A, 'in'), ...series('thru', 'Thru', 2, 'xlr3', A, 'out'), ...series('hp', 'Sortie satellite', 2, 'speakon', HP, 'out'), ...fnet(), iec()]),
    dev('fohhn-xs22p', F, 'XS-22 passive (sub passif 12")', 'Son', { kg: 22 }, hpIn()),
    dev('fohhn-xs30', F, 'XS-30 (sub passif 15")', 'Son', { kg: 28 }, hpIn()),
    dev('fohhn-xs4p', F, 'XS-4 passive (sub passif 18")', 'Son', { kg: 38 }, hpIn()),
    dev('fohhn-xs4a', F, 'XS-4 active (sub actif 18")', 'Son', { kg: 42 }, [...lineIn(), ...series('hp', 'Sortie satellite', 2, 'speakon', HP, 'out'), ...fnet(), iec()]),
    dev('fohhn-as10', F, 'AS-10 (sub passif compact 2 × 6,5")', 'Son', { kg: 14 }, hpIn()),
    dev('fohhn-as10asx', F, 'AS-10 ASX (sub actif compact, Fohhn Airea)', 'Son', { kg: 16 }, [port('airea', 'Fohhn Airea', 'rj45', NET, 'io'), ...lineIn(), ...fnet(), iec()]),
  ]),
]
