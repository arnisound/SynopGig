import type { DeviceTemplate, Port } from '../../types'
import { A, AES, CTRL, HP, NET, ctl, dante, dev, family, gpio, iec, pc32, port, run, t1Link } from '../catalogKit'
import { MY_CARDS } from './cards'

/* Amplifiers, processors and loudspeakers outside the brand files. */

const xlrIn = (n: number, label = 'Entrée') => run('in', label, n, 'xlr3', A, 'in')
const link = (n: number, label = 'Link') => run('thru', label, n, 'xlr3', A, 'out')
const nl4 = (n: number, label = 'Sortie HP') => run('hp', label, n, 'speakon', HP, 'out')
const phoenixIn = (n: number) => run('in', 'Entrée', n, 'euroblock', A, 'in')
const phoenixOut = (n: number, label = 'Sortie') => run('out', label, n, 'euroblock', A, 'out')
const phoenixHp = (n: number) => run('hp', 'Sortie HP', n, 'euroblock', HP, 'out')
const comboIn = (n: number, label = 'Entrée') => run('in', label, n, 'xlr-combo', A, 'in')
const rcaPair = (label = 'Entrée RCA') => [port('rcaL', `${label} L`, 'rca', A, 'in'), port('rcaR', `${label} R`, 'rca', A, 'in')]
const ampSheet = (u: number, kg: number, d: string, power: string, extra: [string, string, string, string?][] = []) => ({
  u,
  kg,
  d,
  x: [['Audio', 'Puissance', power], ...extra] as [string, string, string, string?][],
})
/** A powered loudspeaker: what it is, its drivers and its amplifier. */
const spk = (kg: number, d: string, drivers: string, power: string, w?: number) => ({
  kg,
  d,
  ...(w ? { w } : {}),
  v: '220-240 V',
  x: [['Audio', 'Haut-parleurs', drivers], ['Audio', 'Puissance amplifiée', power, 'W']] as [string, string, string, string?][],
})
const passive = (kg: number, d: string, drivers: string, power: string, ohm: string) => ({
  kg,
  d,
  x: [['Audio', 'Haut-parleurs', drivers], ['Audio', 'Puissance admissible (RMS)', power, 'W'], ['Audio', 'Impédance', ohm, 'Ω']] as [string, string, string, string?][],
})
const powerIo = (): Port[] => t1Link()

const AMPS: DeviceTemplate[] = family('Amplis', [
  dev('lab-d120-4l', 'Lab.gruppen', 'D 120:4L', 'Son', ampSheet(2, 9, 'Ampli d’installation 4 canaux 12 000 W avec DSP Lake, entrées analogiques, AES et Dante.', '4 × 3000 W'), [...phoenixIn(4), port('aes', 'Entrée AES', 'euroblock', AES, 'in'), ...dante('rj45'), gpio(), ...phoenixHp(4), iec()]),
  dev('lab-fp10000q', 'Lab.gruppen', 'FP 10000Q', 'Son', ampSheet(2, 12, 'Ampli de tournée 4 canaux (génération FP+), réseau NomadLink pour le suivi.', '4 × 2100 W / 2 Ω'), [...xlrIn(4), ...link(4), port('nlIn', 'NomadLink in', 'rj45', CTRL, 'in'), port('nlOut', 'NomadLink out', 'rj45', CTRL, 'out'), ...nl4(4), pc32()]),
  dev('lab-plm12k44', 'Lab.gruppen', 'PLM 12K44', 'Son', ampSheet(2, 14, 'Contrôleur amplifié 4 canaux avec DSP Lake, entrées analogiques, AES3 et Dante.', '12 000 W au total'), [...run('in', 'Entrée analog / AES', 4, 'xlr3', A, 'in'), ...link(4), ...dante(), ...nl4(4), pc32()]),
  dev('lab-plm20k44', 'Lab.gruppen', 'PLM 20K44', 'Son', ampSheet(2, 15, 'Contrôleur amplifié 4 canaux 20 000 W avec DSP Lake, analogique, AES3 et Dante.', '20 000 W au total'), [...run('in', 'Entrée analog / AES', 4, 'xlr3', A, 'in'), ...link(4), ...dante(), ...nl4(4), pc32()]),
  dev('ps-quattrocanali', 'Powersoft', 'Quattrocanali 4804 DSP+D', 'Son', ampSheet(1, 7, 'Ampli d’installation 4 canaux avec DSP et Dante, sorties sur bornier.', '4 × 1200 W'), [...phoenixIn(4), ...dante('rj45'), gpio(), ...phoenixHp(4), iec()]),
  dev('ps-t604', 'Powersoft', 'T604', 'Son', ampSheet(1, 9, 'Ampli de tournée 4 canaux avec DSP.', '4 × 1500 W'), [...xlrIn(4), ...link(4), ctl('Réseau'), ...nl4(4), pc32()]),
  dev('ps-x4', 'Powersoft', 'X4', 'Son', ampSheet(1, 12, 'Plateforme d’amplification 4 canaux de tournée, entrées analogiques, AES3 et Dante.', '4 × 5200 W'), [...run('in', 'Entrée analog / AES', 4, 'xlr3', A, 'in'), ...link(4), ...dante(), ...nl4(4), pc32()]),
  dev('ps-x8', 'Powersoft', 'X8', 'Son', ampSheet(1, 13, 'Plateforme d’amplification 8 canaux de tournée, analogique, AES3 et Dante.', '8 × 2600 W'), [...run('in', 'Entrée analog / AES', 8, 'xlr3', A, 'in'), ...dante(), ...nl4(8), pc32()]),
  dev('qsc-cxq4k4', 'QSC', 'CX-Q 4K4 (ampli Q-SYS)', 'Son', ampSheet(2, 9, 'Ampli réseau 4 canaux de l’écosystème Q-SYS, piloté et alimenté en audio par Q-LAN.', '4 × 1000 W'), [port('lanA', 'Q-LAN A', 'rj45', NET, 'io'), port('lanB', 'Q-LAN B', 'rj45', NET, 'io'), gpio(), ...phoenixHp(4), iec()]),
  dev('qsc-gxd4', 'QSC', 'GXD 4', 'Son', ampSheet(2, 8, 'Ampli 2 canaux avec DSP intégré pour sonorisation.', '2 × 400 W / 8 Ω'), [...comboIn(2), ...rcaPair(), ...nl4(2), ...run('bp', 'Bornes HP', 2, 'binding-post', HP, 'out'), iec()]),
  dev('qsc-pld45', 'QSC', 'PLD4.5', 'Son', ampSheet(2, 10, 'Ampli 4 canaux à puissance partagée avec DSP, pour retours et façade.', '5000 W partagés'), [...xlrIn(4), ...link(4), ctl('Réseau'), ...nl4(4), pc32()]),
  dev('yam-pc412d', 'Yamaha', 'PC412-DI (ampli Dante)', 'Son', ampSheet(2, 14, 'Ampli 4 canaux avec DSP, entrées analogiques et Dante.', '4 × 1200 W'), [...xlrIn(4), ...dante(), ctl('Réseau'), ...nl4(4), ...phoenixHp(4).map((p) => ({ ...p, id: `e${p.id}`, label: `${p.label} (bornier)` })), pc32()]),
  dev('yam-px10', 'Yamaha', 'PX10 (ampli)', 'Son', ampSheet(2, 9, 'Ampli 2 canaux avec processeur de haut-parleurs intégré.', '2 × 1000 W / 4 Ω'), [...comboIn(2), ...link(2), ...nl4(2), ...run('bp', 'Bornes HP', 2, 'binding-post', HP, 'out'), iec()]),
  dev('yam-px8', 'Yamaha', 'PX8 (ampli)', 'Son', ampSheet(2, 9, 'Ampli 2 canaux avec processeur de haut-parleurs intégré.', '2 × 800 W / 4 Ω'), [...comboIn(2), ...link(2), ...nl4(2), ...run('bp', 'Bornes HP', 2, 'binding-post', HP, 'out'), iec()]),
  dev('yam-xmv4280', 'Yamaha', 'XMV4280-D (ampli Dante)', 'Son', ampSheet(1, 6, 'Ampli d’installation 4 canaux à entrées Dante, sorties sur bornier.', '4 × 280 W'), [...dante('rj45'), ctl('Réseau'), ...phoenixHp(4), iec()]),
])

const PROCESSORS: DeviceTemplate[] = family('Processeurs', [
  dev('lake-lm26', 'Lake', 'LM 26', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Processeur de système Lake 2 entrées / 6 sorties, analogique, AES3 et Dante.' }, [...run('in', 'Entrée analog / AES', 2, 'xlr3', A, 'in'), ...run('out', 'Sortie', 6, 'xlr3', A, 'out'), ...dante(), iec()]),
  dev('lake-lm44', 'Lake', 'LM 44', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Processeur de système Lake 4 entrées / 4 sorties, analogique, AES3 et Dante.' }, [...run('in', 'Entrée analog / AES', 4, 'xlr3', A, 'in'), ...run('out', 'Sortie', 4, 'xlr3', A, 'out'), ...dante(), iec()]),
  dev('qsc-core110f', 'QSC', 'Q-SYS Core 110f', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Processeur Q-SYS tout-en-un : 8 entrées micro/ligne, 8 sorties, 8 canaux flex, USB et réseau Q-LAN.' }, [...phoenixIn(8), ...phoenixOut(8), ...run('flex', 'Flex', 8, 'euroblock', A, 'io'), port('lanA', 'Q-LAN A', 'rj45', NET, 'io'), port('lanB', 'Q-LAN B', 'rj45', NET, 'io'), port('usb', 'USB audio', 'usb', AES, 'io'), gpio(), iec()]),
  dev('qsc-core8flex', 'QSC', 'Q-SYS Core 8 Flex', 'Son', { u: 1, kg: 3, v: '100-240 V', d: 'Petit processeur Q-SYS à 8 canaux flex (entrée ou sortie) et réseau Q-LAN.' }, [...run('flex', 'Flex', 8, 'euroblock', A, 'io'), port('lanA', 'Q-LAN A', 'rj45', NET, 'io'), port('lanB', 'Q-LAN B', 'rj45', NET, 'io'), port('usb', 'USB audio', 'usb', AES, 'io'), gpio(), iec()]),
  dev('xilica-solaro', 'Xilica', 'Solaro FR1 (processeur)', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Processeur audio Xilica 8 entrées / 8 sorties avec Dante.' }, [...phoenixIn(8), ...phoenixOut(8), ...dante('rj45'), ctl('Contrôle'), gpio(), iec()]),
  dev('xilica-solaro-qr1', 'Xilica', 'Solaro QR1 (processeur)', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Processeur Xilica tout réseau (Dante), sans I/O analogique.' }, [...dante('rj45'), ctl('Contrôle'), gpio(), iec()]),
  dev('yam-dme7', 'Yamaha', 'DME7 (processeur)', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Moteur de traitement audio Yamaha tout Dante, pour l’installation.' }, [...dante(), ctl('Contrôle'), gpio(), iec()]),
  dev('yam-mrx7d', 'Yamaha', 'MRX7-D (processeur)', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Processeur matriciel Yamaha 8 entrées micro/ligne, 2 entrées stéréo, 8 sorties, Dante et slot MY.', slots: 1, opt: MY_CARDS }, [
    ...phoenixIn(8), ...rcaPair('ST in 1'), ...phoenixOut(8), port('ydifIn', 'YDIF in', 'rj45', AES, 'in'), port('ydifOut', 'YDIF out', 'rj45', AES, 'out'), ...dante('rj45'), ctl('Réseau'), gpio(), iec(),
  ]),
])

const ARRAYS: DeviceTemplate[] = family('Line arrays & colonnes', [
  dev('qsc-kla12', 'QSC', 'KLA12 (line array amplifié)', 'Son', spk(30, 'Élément de line array amplifié 12″ pour sonorisation de taille moyenne.', '12″ + 1,75″', '1000'), [...comboIn(1), ...link(1), iec()]),
  dev('rcf-evox12', 'RCF', 'EVOX 12 (colonne amplifiée)', 'Son', spk(33, 'Système colonne amplifié (sub 12″ et colonne), pour concerts et événements.', '12″ + colonne 8 × 2″', '1400'), [...comboIn(2), ...link(1), iec()]),
  dev('rcf-hdl20a', 'RCF', 'HDL 20-A (line array amplifié)', 'Son', spk(23, 'Élément de line array amplifié 2 × 10″.', '2 × 10″ + 3″', '1400'), [...xlrIn(1), ...link(1), ...powerIo()]),
  dev('rcf-hdl30a', 'RCF', 'HDL 30-A (line array amplifié)', 'Son', spk(40, 'Élément de line array amplifié 2 × 10″ à deux moteurs.', '2 × 10″ + 2 × 3″', '2200'), [...xlrIn(1), ...link(1), ...powerIo()]),
  dev('rcf-hdl6a', 'RCF', 'HDL 6-A (line array amplifié)', 'Son', spk(18, 'Petit élément de line array amplifié 2 × 6″.', '2 × 6″ + 1,75″', '1400'), [...xlrIn(1), ...link(1), ...powerIo()]),
  dev('yam-vxl1', 'Yamaha', 'VXL1-16 (colonne)', 'Son', passive(4, 'Colonne passive fine 16 × 1,5″ pour l’installation.', '16 × 1,5″', '60', '8'), [port('in', 'Entrée HP', 'euroblock', HP, 'in'), port('link', 'Link HP', 'euroblock', HP, 'out')]),
])

const SPEAKERS: DeviceTemplate[] = family('Enceintes', [
  dev('qsc-cp12', 'QSC', 'CP12 (amplifiée)', 'Son', spk(12, 'Enceinte amplifiée compacte 12″ avec petit mélangeur intégré.', '12″ + 1,4″', '1000'), [...comboIn(2), ...rcaPair('Aux'), port('thru', 'Sortie mix', 'xlr3', A, 'out'), iec()]),
  dev('qsc-k82', 'QSC', 'K8.2 (amplifiée)', 'Son', spk(12, 'Enceinte amplifiée 8″ série K.2, mélangeur 3 entrées.', '8″ + 1,4″', '2000'), [...comboIn(2), ...rcaPair('Entrée C'), port('thru', 'Thru / Mix out', 'xlr3', A, 'out'), iec()]),
  dev('qsc-k102', 'QSC', 'K10.2 (amplifiée)', 'Son', spk(15, 'Enceinte amplifiée 10″ série K.2, mélangeur 3 entrées.', '10″ + 1,4″', '2000'), [...comboIn(2), ...rcaPair('Entrée C'), port('thru', 'Thru / Mix out', 'xlr3', A, 'out'), iec()]),
  dev('qsc-k122', 'QSC', 'K12.2 (amplifiée)', 'Son', spk(18, 'Enceinte amplifiée 12″ série K.2, mélangeur 3 entrées.', '12″ + 1,4″', '2000'), [...comboIn(2), ...rcaPair('Entrée C'), port('thru', 'Thru / Mix out', 'xlr3', A, 'out'), iec()]),
  dev('qsc-kw152', 'QSC', 'KW152 (amplifiée)', 'Son', spk(28, 'Enceinte amplifiée 15″ en bois, série KW.', '15″ + 1,75″', '1000'), [...comboIn(2), ...rcaPair(), port('thru', 'Thru', 'xlr3', A, 'out'), iec()]),
  dev('rcf-art910', 'RCF', 'ART 910-A (amplifiée)', 'Son', spk(15, 'Enceinte amplifiée 10″ série ART 9.', '10″ + 1,75″', '2100'), [...comboIn(1), ...link(1), ...powerIo()]),
  dev('rcf-art912', 'RCF', 'ART 912-A (amplifiée)', 'Son', spk(18, 'Enceinte amplifiée 12″ série ART 9.', '12″ + 1,75″', '2100'), [...comboIn(1), ...link(1), ...powerIo()]),
  dev('rcf-art932', 'RCF', 'ART 932-A (amplifiée)', 'Son', spk(20, 'Enceinte amplifiée 12″ à moteur 3″ série ART 9.', '12″ + 3″', '2100'), [...comboIn(1), ...link(1), ...powerIo()]),
  dev('rcf-nx12sma', 'RCF', 'NX 12-SMA (retour / façade amplifié)', 'Son', spk(18, 'Enceinte coaxiale amplifiée 12″, en retour de scène ou en façade.', '12″ coaxial', '1400'), [...comboIn(1), ...link(1), ...powerIo()]),
  dev('rcf-nx32a', 'RCF', 'NX 32-A (amplifiée)', 'Son', spk(22, 'Enceinte amplifiée 12″ série NX.', '12″ + 3″', '1400'), [...comboIn(1), ...link(1), ...powerIo()]),
  dev('rcf-tt25', 'RCF', 'TT+ 25-A (amplifiée)', 'Son', spk(19, 'Enceinte de tournée amplifiée 2 × 5″ (série TT+).', '2 × 5″ + 1,75″', '750'), [...xlrIn(1), ...link(1), ...powerIo()]),
  dev('yam-czr10', 'Yamaha', 'CZR10 (passive)', 'Son', passive(15, 'Enceinte passive 10″ série CZR.', '10″ + 1,4″', '700', '8'), [port('in', 'Entrée HP', 'speakon', HP, 'in'), port('link', 'Link HP', 'speakon', HP, 'out')]),
  dev('yam-czr12', 'Yamaha', 'CZR12 (passive)', 'Son', passive(19, 'Enceinte passive 12″ série CZR.', '12″ + 1,4″', '800', '8'), [port('in', 'Entrée HP', 'speakon', HP, 'in'), port('link', 'Link HP', 'speakon', HP, 'out')]),
  dev('yam-czr15', 'Yamaha', 'CZR15 (passive)', 'Son', passive(24, 'Enceinte passive 15″ série CZR.', '15″ + 1,4″', '1000', '8'), [port('in', 'Entrée HP', 'speakon', HP, 'in'), port('link', 'Link HP', 'speakon', HP, 'out')]),
  dev('yam-dxr10', 'Yamaha', 'DXR10 mkII (amplifiée)', 'Son', spk(15, 'Enceinte amplifiée 10″ série DXR mkII avec petit mélangeur.', '10″ + 1″', '1100'), [...comboIn(2), ...rcaPair('Entrée 3'), port('thru', 'Link', 'xlr3', A, 'out'), iec()]),
  dev('yam-dxr12', 'Yamaha', 'DXR12 mkII (amplifiée)', 'Son', spk(20, 'Enceinte amplifiée 12″ série DXR mkII avec petit mélangeur.', '12″ + 1″', '1100'), [...comboIn(2), ...rcaPair('Entrée 3'), port('thru', 'Link', 'xlr3', A, 'out'), iec()]),
  dev('yam-dxr15', 'Yamaha', 'DXR15 mkII (amplifiée)', 'Son', spk(24, 'Enceinte amplifiée 15″ série DXR mkII avec petit mélangeur.', '15″ + 1″', '1100'), [...comboIn(2), ...rcaPair('Entrée 3'), port('thru', 'Link', 'xlr3', A, 'out'), iec()]),
  dev('yam-dzr10', 'Yamaha', 'DZR10 (amplifiée)', 'Son', spk(18, 'Enceinte amplifiée 10″ série DZR, DSP FIR.', '10″ + 1,4″', '2000'), [...comboIn(2), ...rcaPair('Entrée 3'), ...link(2), iec()]),
  dev('yam-dzr12', 'Yamaha', 'DZR12 (amplifiée)', 'Son', spk(23, 'Enceinte amplifiée 12″ série DZR, DSP FIR.', '12″ + 1,4″', '2000'), [...comboIn(2), ...rcaPair('Entrée 3'), ...link(2), iec()]),
  dev('yam-dzr15', 'Yamaha', 'DZR15 (amplifiée)', 'Son', spk(26, 'Enceinte amplifiée 15″ série DZR, DSP FIR.', '15″ + 1,4″', '2000'), [...comboIn(2), ...rcaPair('Entrée 3'), ...link(2), iec()]),
  dev('yam-dzr315', 'Yamaha', 'DZR315 (amplifiée 3 voies)', 'Son', spk(33, 'Enceinte amplifiée 3 voies 15″ série DZR.', '15″ + 6,5″ + 1,4″', '2000'), [...comboIn(2), ...rcaPair('Entrée 3'), ...link(2), iec()]),
])

const SUBS: DeviceTemplate[] = family('Subs', [
  dev('qsc-kla181', 'QSC', 'KLA181 (sub amplifié)', 'Son', spk(47, 'Sub amplifié 18″ du système KLA, accrochable.', '18″', '1000'), [...xlrIn(2), ...link(2), iec()]),
  dev('qsc-ks118', 'QSC', 'KS118 (sub amplifié)', 'Son', spk(46, 'Sub amplifié 18″ série KS.', '18″', '3600'), [...comboIn(2), ...link(2), iec()]),
  dev('qsc-ks212c', 'QSC', 'KS212C (sub amplifié cardio)', 'Son', spk(52, 'Sub amplifié cardioïde 2 × 12″ série KS.', '2 × 12″', '3600'), [...comboIn(2), ...link(2), iec()]),
  dev('rcf-sub8006', 'RCF', 'SUB 8006-AS (sub amplifié 2×18")', 'Son', spk(98, 'Sub amplifié 2 × 18″ de tournée.', '2 × 18″', '2500'), [...xlrIn(2), ...link(2), ...powerIo()]),
  dev('rcf-sub9004', 'RCF', 'SUB 9004-AS (sub amplifié 21")', 'Son', spk(80, 'Sub amplifié 21″.', '21″', '2500'), [...xlrIn(2), ...link(2), ...powerIo()]),
  dev('rcf-sub905', 'RCF', 'SUB 905-AS II (sub amplifié)', 'Son', spk(42, 'Sub amplifié 15″.', '15″', '1000'), [...xlrIn(2), ...link(2), ...powerIo()]),
  dev('yam-dxs15', 'Yamaha', 'DXS15mkII (sub amplifié)', 'Son', spk(40, 'Sub amplifié 15″ série DXS mkII.', '15″', '950'), [...comboIn(2), ...link(2), iec()]),
  dev('yam-dxs18', 'Yamaha', 'DXS18XLF (sub amplifié)', 'Son', spk(49, 'Sub amplifié 18″ série DXS XLF.', '18″', '1600'), [...comboIn(2), ...link(2), iec()]),
  dev('yam-dxs18xlf-d', 'Yamaha', 'DXS18XLF-D (sub amplifié Dante)', 'Son', spk(49, 'Sub amplifié 18″ avec entrée Dante.', '18″', '1600'), [...comboIn(2), ...link(2), ...dante('rj45'), iec()]),
])

const WEDGES: DeviceTemplate[] = family('Retours', [
  dev('rcf-nx15sma', 'RCF', 'NX 15-SMA (retour amplifié)', 'Son', spk(23, 'Retour de scène coaxial amplifié 15″.', '15″ coaxial', '1400'), [...comboIn(1), ...link(1), ...powerIo()]),
  dev('yam-dhr12m', 'Yamaha', 'DHR12M (retour amplifié)', 'Son', spk(19, 'Retour de scène amplifié 12″.', '12″ + 1,4″', '1000'), [...comboIn(2), ...link(1), iec()]),
])

export const SOUND: DeviceTemplate[] = [...AMPS, ...PROCESSORS, ...ARRAYS, ...SPEAKERS, ...SUBS, ...WEDGES]
