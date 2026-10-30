import type { DeviceTemplate } from '../../types'
import { A, AES, AVB, LINK, PWR, RF, CTRL, aesOut, antIn, antOut, cascade, ctl, dante, dc, dev, family, iec, link, madi, midi, opt, phones, port, run, stereoOuts, usbAudio, wclk } from '../catalogKit'
import { DLIVE_CARDS, HY_CARDS, MY_CARDS } from './cards'

/* Stage I/O, personal monitoring, multicores, wired mics, DI boxes and wireless (outside the brand files). */

const mic = (n: number, label = 'Mic', start = 1, c: 'xlr3' | 'xlr-combo' = 'xlr3') => run('in', label, n, c, A, 'in', start)
const out = (n: number, label = 'Out', start = 1, id = 'out') => run(id, label, n, 'xlr3', A, 'out', start)
const pwr2 = () => [port('pwr', 'Secteur', 'iec', PWR, 'in'), port('pwr2', 'Secteur (redondant)', 'iec', PWR, 'in')]
const xlrOut = (phantom = false) => [port('out', phantom ? 'Sortie (48 V)' : 'Sortie', 'xlr3', A, 'out')]
const micSheet = (kg: number, d: string, type: string, pattern: string, phantom: boolean) => ({
  kg,
  d,
  x: [['Audio', 'Type', type], ['Audio', 'Directivité', pattern], ['Alimentation', 'Fantôme', phantom ? '48 V requis' : 'non (dynamique)']] as [string, string, string][],
})

const STAGEBOX: DeviceTemplate[] = family('Stageboxes & moteurs', [
  dev('ah-ab168', 'Allen & Heath', 'AB168', 'Son', { u: 3, kg: 6, v: '100-240 V', d: 'Stagebox 16 entrées / 8 sorties pour SQ, Qu et dLive (SLink / dSNAKE), sur un seul câble Cat5.' }, [...mic(16), ...out(8), ...link('slink', 'SLink / dSNAKE'), ...link('exp', 'Expansion'), iec()]),
  dev('ah-ar2412', 'Allen & Heath', 'AR2412 (stagebox)', 'Son', { u: 5, kg: 10, v: '100-240 V', d: 'Stagebox dSNAKE 24 entrées / 12 sorties pour Qu, SQ et GLD, extensible par AR84.' }, [...mic(24), ...out(12), ...link('dsnake', 'dSNAKE'), ...link('exp', 'Expansion (AR84)'), iec()]),
  dev('ah-ar84', 'Allen & Heath', 'AR84 (expander)', 'Son', { u: 2, kg: 4, v: '100-240 V', d: 'Extension 8 entrées / 4 sorties d’une AR2412, ou stagebox dSNAKE autonome.' }, [...mic(8), ...out(4), ...link('dsnake', 'dSNAKE / Expansion'), iec()]),
  dev('ah-cdm32', 'Allen & Heath', 'dLive CDM32 (MixRack)', 'Son', { u: 6, kg: 20, v: '100-240 V', d: 'MixRack dLive série C : le moteur XCVI (128 voies, 64 bus) avec 32 entrées et 16 sorties locales et trois ports d’extension.', x: [['Audio', 'Canaux d’entrée', '128'], ['Audio', 'Bus de mixage', '64'], ['Audio', 'Fréquence d’échantillonnage', '96', 'kHz']], opt: DLIVE_CARDS }, [
    ...mic(32), ...out(16), port('aesOut1', 'AES out 1', 'xlr3', AES, 'out'), ...link('gigaace', 'gigaACE (surface)'), ...link('dx', 'DX', 2), ctl('Réseau'), iec(),
  ]),
  dev('ah-dm32', 'Allen & Heath', 'dLive DM32 (MixRack)', 'Son', { u: 6, kg: 22, v: '100-240 V', d: 'MixRack dLive série DM : moteur XCVI, 32 entrées / 16 sorties, alimentation redondante et cinq ports d’extension.', x: [['Audio', 'Canaux d’entrée', '128'], ['Audio', 'Bus de mixage', '64'], ['Audio', 'Fréquence d’échantillonnage', '96', 'kHz']], opt: DLIVE_CARDS }, [
    ...mic(32), ...out(16), ...run('aesIn', 'AES in', 1, 'xlr3', AES, 'in'), ...run('aesOut', 'AES out', 3, 'xlr3', AES, 'out'), ...link('gigaace', 'gigaACE', 2), ...link('dx', 'DX', 2), ctl('Réseau'), ...pwr2(),
  ]),
  dev('ah-dm64', 'Allen & Heath', 'dLive DM64 (MixRack)', 'Son', { u: 10, kg: 30, v: '100-240 V', d: 'MixRack dLive modulaire 64 entrées / 32 sorties, alimentation redondante, cinq ports d’extension.', x: [['Audio', 'Canaux d’entrée', '128'], ['Audio', 'Bus de mixage', '64'], ['Audio', 'Fréquence d’échantillonnage', '96', 'kHz']], opt: DLIVE_CARDS }, [
    ...mic(64), ...out(32), ...run('aesOut', 'AES out', 3, 'xlr3', AES, 'out'), ...link('gigaace', 'gigaACE', 2), ...link('dx', 'DX', 2), ctl('Réseau'), ...pwr2(),
  ]),
  dev('ah-dt168', 'Allen & Heath', 'DT168 (stagebox Dante)', 'Son', { u: 3, kg: 6, v: '100-240 V', d: 'Stagebox Dante 16 entrées / 8 sorties, ports primaire et secondaire.' }, [...mic(16), ...out(8), ...dante(), iec()]),
  dev('ah-dx012', 'Allen & Heath', 'DX012 (12 sorties)', 'Son', { u: 1, kg: 3, v: '100-240 V', d: 'Expander DX 12 sorties XLR pour dLive et Avantis.' }, [...out(12), ...link('dx', 'DX'), iec()]),
  dev('ah-dx164w', 'Allen & Heath', 'DX164-W (stagebox murale)', 'Son', { kg: 3, d: 'Boîtier mural DX 16 entrées / 4 sorties, alimenté par le câble DX.' }, [...mic(16), ...out(4), port('dx', 'DX (alimenté par le câble)', 'ethercon', LINK, 'io')]),
  dev('ah-dx168', 'Allen & Heath', 'DX168', 'Son', { u: 3, kg: 6, v: '100-240 V', d: 'Expander DX 16 entrées / 8 sorties à 96 kHz, chaînable (DX link A/B).' }, [...mic(16), ...out(8), ...link('dx', 'DX', 2), iec()]),
  dev('ah-dx32', 'Allen & Heath', 'DX32 (expander modulaire)', 'Son', { u: 4, kg: 8, v: '100-240 V', d: 'Expander DX modulaire 4 emplacements de 8 voies (entrées, sorties ou AES), alimentation redondante.' }, [...mic(16), ...out(16), ...link('dx', 'DX', 2), ...pwr2()]),
  dev('ah-gx4816', 'Allen & Heath', 'GX4816', 'Son', { u: 4, kg: 12, v: '100-240 V', d: 'Expander gigaACE 48 entrées / 16 sorties, alimentation redondante.' }, [...mic(48), ...out(16), ...link('gigaace', 'gigaACE', 2), ...link('dx', 'DX'), ...pwr2()]),
  dev('avid-e6l', 'Avid', 'E6L-144 (moteur)', 'Son', { u: 4, kg: 20, v: '100-240 V', d: 'Moteur de traitement VENUE S6L (144 voies), relié à la surface et aux racks Stage en AVB.', x: [['Audio', 'Canaux d’entrée', '144'], ['Audio', 'Fréquence d’échantillonnage', '96', 'kHz']], opt: [opt('avb192', 'Carte AVB-192 supplémentaire', run('avbx', 'AVB (carte)', 2, 'ethercon', AVB, 'io'))] }, [
    ...run('avb', 'AVB', 2, 'ethercon', AVB, 'io'), ...run('stage', 'Stage (AVB)', 2, 'ethercon', AVB, 'io'), ctl('ECx', 'ethercon'), ...pwr2(),
  ]),
  dev('avid-stage16', 'Avid', 'Stage 16 (stagebox AVB)', 'Son', { u: 2, kg: 4, v: '100-240 V', d: 'Petit rack d’I/O AVB : 16 entrées micro, 8 sorties ligne et 8 sorties AES.' }, [...mic(16), ...out(8), ...run('aesOut', 'AES out', 4, 'xlr3', AES, 'out'), ...run('avb', 'AVB', 2, 'ethercon', AVB, 'io'), iec()]),
  dev('avid-stage64', 'Avid', 'Stage 64 (stagebox)', 'Son', { u: 8, kg: 25, v: '100-240 V', d: 'Rack de scène modulaire S6L (cartes de 8 voies), réseau AVB redondé.' }, [...mic(48), ...out(16), ...run('avb', 'AVB', 2, 'ethercon', AVB, 'io'), ...pwr2()]),
  dev('beh-s16', 'Behringer', 'S16', 'Son', { u: 3, kg: 6, v: '100-240 V', d: 'Stagebox AES50 16 entrées / 8 sorties pour X32 et Wing, avec sorties ADAT.' }, [...mic(16), ...out(8), ...link('aes50', 'AES50', 2), ...run('adat', 'ADAT out', 2, 'toslink', AES, 'out'), ...midi(), iec()]),
  dev('beh-s32', 'Behringer', 'S32', 'Son', { u: 3, kg: 9, v: '100-240 V', d: 'Stagebox AES50 32 entrées / 16 sorties pour X32 et Wing.' }, [...mic(32), ...out(16), ...link('aes50', 'AES50', 2), ...run('adat', 'ADAT out', 4, 'toslink', AES, 'out'), ...midi(), iec()]),
  dev('beh-sd16', 'Behringer', 'SD16 (stagebox)', 'Son', { u: 3, kg: 6, v: '100-240 V', d: 'Stagebox AES50 16 entrées / 8 sorties avec Ultranet et StageConnect.' }, [...mic(16), ...out(8), ...link('aes50', 'AES50', 2), port('ultranet', 'Ultranet', 'rj45', LINK, 'out'), port('stagec', 'StageConnect', 'xlr3', LINK, 'io'), iec()]),
  dev('beh-sd8', 'Behringer', 'SD8 (stagebox)', 'Son', { u: 2, kg: 3, v: '100-240 V', d: 'Petite stagebox AES50 8 entrées / 8 sorties.' }, [...mic(8), ...out(8), ...link('aes50', 'AES50', 2), iec()]),
  dev('digico-d2-rack', 'DiGiCo', 'D2-Rack', 'Son', { u: 6, kg: 20, v: '100-240 V', d: 'Rack de scène DiGiCo 96 kHz modulaire (cartes de 8 voies), MADI redondé.' }, [...mic(48), ...out(16), ...madi('sdi', 'A'), ...madi('sdi', 'B'), ...wclk(), ...pwr2()]),
  dev('digico-sd-mini', 'DiGiCo', 'SD-MiNi Rack', 'Son', { u: 3, kg: 10, v: '100-240 V', d: 'Petit rack de scène DiGiCo 32 entrées / 8 sorties en MADI.' }, [...mic(32), ...out(8), ...madi('sdi', 'A'), ...madi('sdi', 'B'), iec()]),
  dev('digico-sd-rack', 'DiGiCo', 'SD-Rack', 'Son', { u: 9, kg: 30, v: '100-240 V', d: 'Rack de scène DiGiCo SD modulaire, jusqu’à 56 entrées / 56 sorties, MADI et Optocore.' }, [...mic(56), ...out(56), ...madi('sdi', 'A'), ...madi('sdi', 'B'), ...link('fibre', 'Optocore', 2, 'opticalcon'), ...wclk(), ...pwr2()]),
  dev('midas-dl151', 'Midas', 'DL151 (24 entrées)', 'Son', { u: 3, kg: 8, v: '100-240 V', d: 'Stagebox AES50 24 entrées micro Midas, pour PRO et M32.' }, [...mic(24), ...link('aes50', 'AES50', 2), ...pwr2()]),
  dev('midas-dl152', 'Midas', 'DL152 (24 sorties)', 'Son', { u: 3, kg: 8, v: '100-240 V', d: 'Boîtier AES50 24 sorties ligne, pour PRO et M32.' }, [...out(24), ...link('aes50', 'AES50', 2), ...pwr2()]),
  dev('midas-dl153', 'Midas', 'DL153 (8 in / 16 out)', 'Son', { u: 3, kg: 7, v: '100-240 V', d: 'Boîtier AES50 8 entrées / 16 sorties, pour PRO et M32.' }, [...mic(8), ...out(16), ...link('aes50', 'AES50', 2), ...pwr2()]),
  dev('midas-dl16', 'Midas', 'DL16', 'Son', { u: 3, kg: 6, v: '100-240 V', d: 'Stagebox AES50 16 entrées / 8 sorties avec Ultranet et sorties ADAT, pour M32 et X32.' }, [...mic(16), ...out(8), ...link('aes50', 'AES50', 2), port('ultranet', 'Ultranet', 'rj45', LINK, 'out'), ...run('adat', 'ADAT out', 2, 'toslink', AES, 'out'), ...midi(), iec()]),
  dev('midas-dl32', 'Midas', 'DL32', 'Son', { u: 3, kg: 9, v: '100-240 V', d: 'Stagebox AES50 32 entrées / 16 sorties avec sorties ADAT, pour M32 et X32.' }, [...mic(32), ...out(16), ...link('aes50', 'AES50', 2), ...run('adat', 'ADAT out', 4, 'toslink', AES, 'out'), ...midi(), iec()]),
  dev('midas-m32c', 'Midas', 'M32C (rack DSP)', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Moteur M32 sans préamplis en 1U : se pilote à distance et prend son I/O sur des stageboxes AES50.', x: [['Audio', 'Canaux d’entrée', '40'], ['Audio', 'Bus de mixage', '25']] }, [
    ...link('aes50', 'AES50', 2), port('ultranet', 'Ultranet', 'rj45', LINK, 'out'), ...aesOut(1), ...midi(), ctl('Remote'), usbAudio('USB audio (carte DN32-USB)'), iec(),
  ]),
  dev('presonus-nsb-16-8', 'PreSonus', 'NSB 16.8 (stagebox AVB)', 'Son', { u: 3, kg: 6, v: '100-240 V', d: 'Stagebox AVB 16 entrées / 8 sorties pour StudioLive Series III.' }, [...mic(16), ...out(8), port('avb', 'AVB', 'ethercon', AVB, 'io'), iec()]),
  dev('ssl-ml3232', 'Solid State Logic', 'ML 32:32 (stagebox Dante)', 'Son', { u: 3, kg: 8, v: '100-240 V', d: 'Stagebox Dante 32 entrées micro / 32 sorties ligne, alimentation redondante.' }, [...mic(32), ...out(32), ...dante(), ...wclk(), ...pwr2()]),
  dev('sc-mini-stagebox32', 'Soundcraft', 'Mini Stagebox 32', 'Son', { kg: 8, v: '100-240 V', d: 'Stagebox 32 entrées / 8 sorties pour Si et Vi, reliée en MADI (Cat5 ou fibre).' }, [...mic(32), ...out(8), ...aesOut(4), port('cat5', 'MADI CAT5 (Vi / Si)', 'ethercon', AES, 'io'), port('madiOpt', 'MADI optique', 'opticalcon', AES, 'io'), iec()]),
  dev('yam-dsp-rx', 'Yamaha', 'DSP-RX (moteur RIVAGE)', 'Son', { u: 3, kg: 16, v: '100-240 V', d: 'Moteur DSP des RIVAGE PM3 / PM5, cartes HY pour TWINLANe et Dante.', opt: HY_CARDS }, [...link('twin', 'TWINLANe', 2, 'opticalcon'), ...dante(), ...wclk(), ctl('Réseau', 'ethercon'), ...pwr2()]),
  dev('yam-rio1608', 'Yamaha', 'Rio1608-D2', 'Son', { u: 3, kg: 8, v: '100-240 V', d: 'Rack d’I/O Dante 16 entrées / 8 sorties pour CL, QL, DM7 et RIVAGE.' }, [...mic(16), ...out(8), ...dante(), iec()]),
  dev('yam-rio1608-d3', 'Yamaha', 'Rio1608-D3', 'Son', { u: 3, kg: 8, v: '100-240 V', d: 'Rack d’I/O Dante 16 entrées / 8 sorties, nouvelle génération.' }, [...mic(16), ...out(8), ...dante(), iec()]),
  dev('yam-rio3224', 'Yamaha', 'Rio3224-D2', 'Son', { u: 4, kg: 11, v: '100-240 V', d: 'Rack d’I/O Dante 32 entrées / 16 sorties + AES, alimentation redondante.' }, [...mic(32), ...out(16), ...aesOut(2), ...dante(), ...pwr2()]),
  dev('yam-rio3224-d3', 'Yamaha', 'Rio3224-D3', 'Son', { u: 4, kg: 11, v: '100-240 V', d: 'Rack d’I/O Dante 32 entrées / 16 sorties + AES, nouvelle génération.' }, [...mic(32), ...out(16), ...aesOut(2), ...dante(), ...pwr2()]),
  dev('yam-rpio222', 'Yamaha', 'RPio222 (stagebox RIVAGE)', 'Son', { u: 6, kg: 25, v: '100-240 V', d: 'Rack d’I/O RIVAGE à cartes RY (8 voies chacune), réseau TWINLANe.' }, [...mic(32), ...out(16), ...link('twin', 'TWINLANe', 2, 'opticalcon'), ...pwr2()]),
  dev('yam-rpio622', 'Yamaha', 'RPio622 (stagebox RIVAGE)', 'Son', { u: 10, kg: 40, v: '100-240 V', d: 'Grand rack d’I/O RIVAGE à cartes RY, réseau TWINLANe.' }, [...mic(48), ...out(24), ...link('twin', 'TWINLANe', 2, 'opticalcon'), ...pwr2()]),
  dev('yam-rsio64', 'Yamaha', 'RSio64-D (interface Dante)', 'Son', { u: 2, kg: 6, v: '100-240 V', d: 'Pont Dante vers quatre cartes MY (MADI, AES, analogique, Waves).', opt: MY_CARDS }, [...dante(), ...wclk(), ctl('Réseau'), iec()]),
  dev('yam-tio1608', 'Yamaha', 'Tio1608-D', 'Son', { u: 3, kg: 7, v: '100-240 V', d: 'Rack d’I/O Dante 16 entrées / 8 sorties pour TF (carte NY64-D).' }, [...mic(16), ...out(8), ...dante(), iec()]),
  dev('yam-tio1608-d2', 'Yamaha', 'Tio1608-D2', 'Son', { u: 3, kg: 7, v: '100-240 V', d: 'Rack d’I/O Dante 16 entrées / 8 sorties pour TF et DM3, nouvelle génération.' }, [...mic(16), ...out(8), ...dante(), iec()]),
])

const MONITORING: DeviceTemplate[] = family('Monitoring personnel', [
  dev('ah-me1', 'Allen & Heath', 'ME-1 (mixeur personnel)', 'Son', { kg: 1, d: 'Mixeur de retour personnel 40 sources pour musiciens, alimenté par le hub ME-U ou un bloc DC.' }, [
    port('in', 'ME in (alimenté par le hub)', 'ethercon', LINK, 'in'), port('thru', 'ME link', 'ethercon', LINK, 'out'), ...stereoOuts(1, 'Line out'), dc('Alim DC (option)'), phones(), phones('minijack', 'phonesMini', 'Casque mini-jack'),
  ]),
  dev('ah-me-u', 'Allen & Heath', 'ME-U (hub PoE)', 'Son', { u: 1, kg: 2, v: '100-240 V', d: 'Hub 10 ports qui distribue le flux ME et alimente les ME-1 par le câble.' }, [port('in', 'ME in', 'ethercon', LINK, 'in'), ...run('out', 'ME out (PoE)', 10, 'ethercon', LINK, 'out'), iec()]),
  dev('beh-p16d', 'Behringer', 'P16-D (distributeur Ultranet)', 'Son', { u: 1, kg: 2, v: '100-240 V', d: 'Distributeur Ultranet 8 sorties qui alimente les mixeurs P16-M par le câble.' }, [port('in', 'Ultranet in', 'rj45', LINK, 'in'), port('thru', 'Ultranet thru', 'rj45', LINK, 'out'), ...run('out', 'Ultranet out (alimenté)', 8, 'rj45', LINK, 'out'), iec()]),
  dev('beh-p16m', 'Behringer', 'P16-M (mixeur personnel)', 'Son', { kg: 2, d: 'Mixeur de retour personnel 16 voies Ultranet, alimenté par le P16-D ou un bloc DC.' }, [
    port('in', 'Ultranet in (alimenté par le P16-D)', 'rj45', LINK, 'in'), port('thru', 'Ultranet thru', 'rj45', LINK, 'out'), ...stereoOuts(1, 'Line out'), port('midi', 'MIDI in', 'midi', CTRL, 'in'), dc('Alim DC (option)'), phones(),
  ]),
])

const MULTICORE: DeviceTemplate[] = family('Multipaire', [
  dev('rmp54-fanout-12-4', 'Klotz', 'Éclaté RMP 54p → 12 XLR M / 4 XLR F', 'Son', { kg: 2, d: 'Éclaté passif d’un multipaire 16 paires RMP 54 points : 12 départs et 4 retours.' }, [port('rmp', 'RMP 54p', 'rmp54', A, 'io'), ...out(12, 'XLR M'), ...mic(4, 'XLR F')]),
  dev('rmp54-box', 'Générique', 'Boîte de scène RMP 54p (16 entrées)', 'Son', { kg: 4, d: 'Boîte de scène passive 16 entrées XLR sur embase multipaire RMP 54 points.' }, [...mic(16), port('rmp', 'RMP 54p', 'rmp54', A, 'out')]),
  dev('rmp54-splitter', 'Générique', 'Splitter micro 16 voies RMP 54p (2 départs)', 'Son', { u: 3, kg: 8, d: 'Splitter passif 16 voies : un départ direct et un départ isolé par transformateur, sur RMP 54 points.' }, [port('in', 'RMP 54p in', 'rmp54', A, 'in'), port('outA', 'RMP 54p direct', 'rmp54', A, 'out'), port('outB', 'RMP 54p isolé', 'rmp54', A, 'out')]),
  dev('rmp54-fanout-in', 'Générique', 'Éclaté RMP 54p → 16 XLR femelles (plateau)', 'Son', { kg: 2, d: 'Éclaté passif côté plateau : 16 XLR femelles vers une fiche RMP 54 points.' }, [...mic(16, 'XLR'), port('rmp', 'RMP 54p', 'rmp54', A, 'out')]),
  dev('harting-box-24', 'Générique', 'Boîte de scène multipaire Harting 24 voies', 'Son', { kg: 6, d: 'Boîte de scène passive 24 entrées XLR sur embase Harting.' }, [...mic(24), port('mp', 'Harting 24 voies', 'harting', A, 'out')]),
  dev('harting-fanout-24', 'Générique', 'Éclaté Harting 24 voies → 24 XLR mâles (console)', 'Son', { kg: 3, d: 'Éclaté passif côté régie : fiche Harting vers 24 XLR mâles.' }, [port('mp', 'Harting 24 voies', 'harting', A, 'in'), ...out(24, 'XLR')]),
  dev('rmp54-fanout-out', 'Générique', 'Éclaté RMP 54p → 16 XLR mâles (console)', 'Son', { kg: 2, d: 'Éclaté passif côté régie : fiche RMP 54 points vers 16 XLR mâles.' }, [port('rmp', 'RMP 54p', 'rmp54', A, 'in'), ...out(16, 'XLR')]),
])

const MICS: DeviceTemplate[] = family('Micros filaires', [
  dev('at-ae6100', 'Audio-Technica', 'AE6100', 'Son', micSheet(0.3, 'Micro chant dynamique hypercardioïde, pour la scène.', 'Dynamique', 'Hypercardioïde', false), xlrOut()),
  dev('at-at4050', 'Audio-Technica', 'AT4050', 'Son', micSheet(0.5, 'Micro statique grande membrane à trois directivités, pour voix, instruments et prise d’ambiance.', 'Statique grande membrane', 'Cardioïde, omni, figure en 8', true), xlrOut(true)),
  dev('at-atm350', 'Audio-Technica', 'ATM350 (pince)', 'Son', micSheet(0.1, 'Micro statique miniature à pince pour cuivres, cordes et percussions.', 'Statique miniature', 'Cardioïde', true), xlrOut(true)),
  dev('at-atm650', 'Audio-Technica', 'ATM650', 'Son', micSheet(0.3, 'Micro instrument dynamique hypercardioïde (caisse claire, ampli guitare).', 'Dynamique', 'Hypercardioïde', false), xlrOut()),
  dev('dpa-2011', 'DPA', '2011 (cardioïde)', 'Son', micSheet(0.1, 'Micro statique cardioïde à double membrane pour instruments (batterie, cuivres, amplis).', 'Statique', 'Cardioïde', true), xlrOut(true)),
  dev('dpa-4099', 'DPA', '4099 (instrument)', 'Son', micSheet(0.05, 'Micro instrument miniature supercardioïde à fixer sur l’instrument (cordes, cuivres, piano).', 'Statique miniature', 'Supercardioïde', true), xlrOut(true)),
  dev('dpa-4018vl', 'DPA', 'd:facto 4018VL (chant)', 'Son', micSheet(0.3, 'Micro chant statique supercardioïde de scène.', 'Statique', 'Supercardioïde', true), xlrOut(true)),
  dev('neumann-km184', 'Neumann', 'KM 184', 'Son', micSheet(0.1, 'Micro statique petite membrane cardioïde (overheads, guitare acoustique, cordes).', 'Statique petite membrane', 'Cardioïde', true), xlrOut(true)),
  dev('neumann-km185', 'Neumann', 'KM 185', 'Son', micSheet(0.1, 'Micro statique petite membrane hypercardioïde, plus directif que le KM 184.', 'Statique petite membrane', 'Hypercardioïde', true), xlrOut(true)),
  dev('neumann-kms105', 'Neumann', 'KMS 105', 'Son', micSheet(0.3, 'Micro chant statique supercardioïde de scène.', 'Statique', 'Supercardioïde', true), xlrOut(true)),
  dev('neumann-tlm103', 'Neumann', 'TLM 103', 'Son', micSheet(0.5, 'Micro statique grande membrane cardioïde, voix et instruments.', 'Statique grande membrane', 'Cardioïde', true), xlrOut(true)),
  dev('neumann-u87', 'Neumann', 'U 87 Ai', 'Son', micSheet(0.5, 'Micro statique grande membrane de référence, trois directivités.', 'Statique grande membrane', 'Cardioïde, omni, figure en 8', true), xlrOut(true)),
])

const di = (id: string, brand: string, model: string, kg: number, d: string, active: boolean, ports: ReturnType<typeof port>[]) =>
  dev(id, brand, model, 'Son', { kg, d, x: [['Audio', 'Type', active ? 'Active' : 'Passive (transformateur)'], ['Alimentation', 'Alimentation', active ? 'Fantôme 48 V' : 'aucune']] }, ports)
const diMono = () => [port('in', 'Entrée', 'jack', A, 'in'), port('thru', 'Thru', 'jack', A, 'out'), port('out', 'Sortie XLR', 'xlr3', A, 'out')]

const DIS: DeviceTemplate[] = family('DI', [
  di('bss-ar133', 'BSS', 'AR133 (DI active)', 0.9, 'Boîte de direct active pour instruments et sources ligne.', true, diMono()),
  di('radial-j48', 'Radial', 'J48 (DI active)', 0.8, 'Boîte de direct active pour basse, claviers et guitares acoustiques.', true, diMono()),
  di('radial-j48-st', 'Radial', 'J48 Stereo (DI active)', 1.2, 'Boîte de direct active stéréo (claviers, ordinateurs).', true, [...run('in', 'Entrée', 2, 'jack', A, 'in'), ...run('thru', 'Thru', 2, 'jack', A, 'out'), ...run('out', 'Sortie XLR', 2, 'xlr3', A, 'out')]),
  di('radial-jdi', 'Radial', 'JDI (DI passive)', 0.8, 'Boîte de direct passive à transformateur Jensen, pour basse et claviers.', false, diMono()),
  di('radial-proav2', 'Radial', 'ProAV2 (DI stéréo multimédia)', 1, 'Boîte de direct passive stéréo pour sources multimédia (jack, RCA, mini-jack).', false, [...run('in', 'Entrée', 2, 'jack', A, 'in'), ...run('rca', 'Entrée RCA', 2, 'rca', A, 'in'), port('mini', 'Entrée mini-jack', 'minijack', A, 'in'), ...run('out', 'Sortie XLR', 2, 'xlr3', A, 'out')]),
  di('radial-prod2', 'Radial', 'ProD2 (DI stéréo)', 1, 'Boîte de direct passive stéréo pour claviers.', false, [...run('in', 'Entrée', 2, 'jack', A, 'in'), ...run('thru', 'Thru', 2, 'jack', A, 'out'), ...run('out', 'Sortie XLR', 2, 'xlr3', A, 'out')]),
  di('radial-prodi', 'Radial', 'ProDI (DI passive)', 0.7, 'Boîte de direct passive pour instruments.', false, diMono()),
  dev('radial-usbpro', 'Radial', 'USB-Pro (DI USB)', 'Son', { kg: 0.7, d: 'Interface audio USB stéréo en boîte de direct, pour ordinateur de lecture.', x: [['Alimentation', 'Alimentation', 'par l’USB']] }, [port('usb', 'USB (ordinateur, alimentation)', 'usb', AES, 'in'), ...run('out', 'Sortie XLR', 2, 'xlr3', A, 'out'), port('hp', 'Casque', 'minijack', A, 'out')]),
])

const HF_RX: DeviceTemplate[] = family('HF — récepteurs', [
  dev('at-atw-r3210', 'Audio-Technica', 'ATW-R3210 (récepteur 3000)', 'Son', { u: 1, kg: 1.5, v: '12 V DC (bloc fourni)', d: 'Récepteur HF diversité série 3000 (UHF).' }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), dc('Alim 12 V DC')]),
  dev('at-atw-r3210n', 'Audio-Technica', 'ATW-R3210N (récepteur 3000 network)', 'Son', { u: 1, kg: 1.5, v: '12 V DC (bloc fourni)', d: 'Récepteur HF série 3000 avec port réseau pour le suivi à distance.' }, [...antIn(), port('out', 'Sortie XLR', 'xlr3', A, 'out'), port('outJ', 'Sortie jack', 'jack', A, 'out'), ctl('Ethernet'), dc('Alim 12 V DC')]),
  dev('at-atw-r5220', 'Audio-Technica', 'ATW-R5220 (récepteur double 5000)', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Récepteur HF double série 5000, sorties analogiques et Dante.' }, [...antIn(), ...cascade(), ...run('out', 'Sortie XLR', 2, 'xlr3', A, 'out'), ...dante(), ctl('Ethernet'), iec()]),
  dev('lectro-dsqd', 'Lectrosonics', 'DSQD (récepteur 4 voies)', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Récepteur numérique 4 voies large bande, sorties analogiques, AES et Dante.' }, [...antIn(), ...run('out', 'Sortie XLR', 4, 'xlr3', A, 'out'), ...dante(), iec()]),
  dev('lectro-venue2', 'Lectrosonics', 'Venue 2 (récepteur 6 voies)', 'Son', { u: 1, kg: 4, v: '100-240 V', d: 'Récepteur modulaire 6 voies pour émetteurs analogiques et numériques Lectrosonics.' }, [...antIn(), ...run('out', 'Sortie XLR', 6, 'xlr3', A, 'out'), ctl('Ethernet'), iec()]),
  dev('wisy-mrk960', 'Wisycom', 'MRK960 (récepteur double)', 'Son', { u: 1, kg: 3, v: '100-240 V', d: 'Récepteur double large bande Wisycom, sorties analogiques et AES.' }, [...antIn(), ...run('out', 'Sortie XLR', 2, 'xlr3', A, 'out'), ...aesOut(1), ctl('Ethernet'), iec()]),
  dev('wisy-mrk980', 'Wisycom', 'MRK980 (récepteur double large bande)', 'Son', { u: 1, kg: 3, v: '100-240 V', d: 'Récepteur double large bande Wisycom avec Dante.' }, [...antIn(), ...cascade(), ...run('out', 'Sortie XLR', 2, 'xlr3', A, 'out'), ...aesOut(1), ...dante(), iec()]),
])

const HF_TX: DeviceTemplate[] = family('HF — émetteurs & micros HF', [
  dev('at-atw-t3201', 'Audio-Technica', 'ATW-T3201 (émetteur ceinture)', 'Son', { kg: 0.1, d: 'Émetteur ceinture série 3000 (piles AA).' }, [port('mic', 'Entrée micro', 'mini-xlr', A, 'in')]),
  dev('at-atw-t3202', 'Audio-Technica', 'ATW-T3202 (émetteur main)', 'Son', { kg: 0.3, d: 'Micro émetteur main série 3000 (piles AA).' }, []),
  dev('dpa-4061', 'DPA', '4061 (cravate)', 'Son', { kg: 0.01, d: 'Micro cravate omnidirectionnel miniature, à brancher sur un émetteur par adaptateur MicroDot.' }, [port('out', 'Sortie (MicroDot)', 'microdot', A, 'out')]),
  dev('dpa-4088', 'DPA', '4088 (serre-tête)', 'Son', { kg: 0.02, d: 'Micro serre-tête directionnel pour théâtre et conférence.' }, [port('out', 'Sortie (MicroDot)', 'microdot', A, 'out')]),
  dev('dpa-6060', 'DPA', '6060 (cravate)', 'Son', { kg: 0.01, d: 'Micro cravate omnidirectionnel subminiature (3 mm).' }, [port('out', 'Sortie (MicroDot)', 'microdot', A, 'out')]),
  dev('dpa-6066', 'DPA', '6066 (serre-tête)', 'Son', { kg: 0.01, d: 'Micro serre-tête omnidirectionnel subminiature.' }, [port('out', 'Sortie (MicroDot)', 'microdot', A, 'out')]),
  dev('lectro-hhd', 'Lectrosonics', 'HHa (émetteur main)', 'Son', { kg: 0.3, d: 'Micro émetteur main numérique Lectrosonics, capsules interchangeables.' }, []),
  dev('lectro-ssm', 'Lectrosonics', 'SSM (émetteur ceinture miniature)', 'Son', { kg: 0.05, d: 'Émetteur ceinture miniature Lectrosonics pour théâtre.' }, [port('mic', 'Entrée micro (TA5F)', 'mini-xlr', A, 'in')]),
  dev('wisy-mth410', 'Wisycom', 'MTH410 (émetteur main)', 'Son', { kg: 0.3, d: 'Micro émetteur main large bande Wisycom.' }, []),
  dev('wisy-mtp60', 'Wisycom', 'MTP60 (émetteur ceinture)', 'Son', { kg: 0.1, d: 'Émetteur ceinture large bande Wisycom.' }, [port('mic', 'Entrée micro (TA5F)', 'mini-xlr', A, 'in')]),
])

const IEM: DeviceTemplate[] = family('Ears (in-ear)', [
  dev('at-m3t', 'Audio-Technica', 'M3 (émetteur ear)', 'Son', { u: 1, kg: 2, v: '12 V DC (bloc fourni)', d: 'Émetteur de retours ear stéréo.' }, [antOut(), ...run('in', 'Entrée', 2, 'xlr-combo', A, 'in'), dc('Alim 12 V DC'), phones()]),
  dev('at-m3r', 'Audio-Technica', 'M3R (récepteur ear ceinture)', 'Son', { kg: 0.2, d: 'Récepteur ear ceinture (piles AA).' }, [port('hp', 'Écouteurs', 'minijack', A, 'out')]),
  dev('wisy-mpr50', 'Wisycom', 'MPR50-IEM (récepteur ear ceinture)', 'Son', { kg: 0.2, d: 'Récepteur ear ceinture large bande Wisycom.' }, [port('hp', 'Écouteurs', 'minijack', A, 'out')]),
  dev('wisy-mtk982', 'Wisycom', 'MTK982 (émetteur ear double)', 'Son', { u: 1, kg: 3, v: '100-240 V', d: 'Émetteur ear double large bande Wisycom.' }, [antOut(), ...run('in', 'Entrée', 4, 'xlr-combo', A, 'in'), ctl('Ethernet'), iec(), phones()]),
])

const ANTENNAS: DeviceTemplate[] = family('HF — antennes & distribution', [
  dev('at-atw-a49', 'Audio-Technica', 'ATW-A49 (antenne directive)', 'Son', { kg: 0.5, d: 'Antenne directive UHF (log-périodique) pour récepteurs HF.' }, [port('out', 'Connecteur', 'bnc', RF, 'io')]),
  dev('at-atw-da49', 'Audio-Technica', 'ATW-DA49 (distributeur d’antennes 1→4)', 'Son', { u: 1, kg: 3, v: '100-240 V', d: 'Distributeur d’antennes 4 récepteurs, qui alimente aussi les récepteurs.' }, [...antIn(), ...run('outA', 'Sortie A', 4, 'bnc', RF, 'out'), ...run('outB', 'Sortie B', 4, 'bnc', RF, 'out'), ...cascade(), iec()]),
  dev('rfvenue-combine4', 'RF Venue', 'COMBINE4 (combineur ear 4→1)', 'Son', { u: 1, kg: 2, v: '12 V DC (bloc fourni)', d: 'Combineur actif de 4 émetteurs ear sur une antenne.' }, [...run('in', 'Entrée émetteur', 4, 'bnc', RF, 'in'), port('ant', 'Sortie antenne', 'bnc', RF, 'out'), dc()]),
  dev('rfvenue-cp-beam', 'RF Venue', 'CP Beam (antenne hélicoïdale)', 'Son', { kg: 0.8, d: 'Antenne hélicoïdale à polarisation circulaire.' }, [port('in', 'Connecteur', 'bnc', RF, 'io')]),
  dev('rfvenue-distro4', 'RF Venue', 'DISTRO4 (distributeur d’antennes)', 'Son', { u: 1, kg: 2, v: '100-240 V', d: 'Distributeur d’antennes 4 récepteurs, cascade et alimentation des récepteurs.' }, [...antIn(), ...run('outA', 'Sortie A', 4, 'bnc', RF, 'out'), ...run('outB', 'Sortie B', 4, 'bnc', RF, 'out'), ...cascade(), iec()]),
  dev('rfvenue-fin', 'RF Venue', 'Diversity Fin (antenne double)', 'Son', { kg: 1, d: 'Antenne diversité double en un seul boîtier.' }, [port('outA', 'Sortie A', 'bnc', RF, 'out'), port('outB', 'Sortie B', 'bnc', RF, 'out')]),
  dev('rf-ab-switch', 'Générique', 'Commutateur d’antennes A/B (HF)', 'Son', { kg: 0.5, d: 'Commutateur de deux antennes vers une entrée.' }, [...run('in', 'Antenne', 2, 'bnc', RF, 'in'), port('out', 'Sortie', 'bnc', RF, 'out'), dc()]),
  dev('rf-coax-n', 'Générique', 'Câble coaxial antenne N / BNC (rallonge)', 'Son', { kg: 1, d: 'Rallonge coaxiale faible perte pour déporter une antenne.' }, [port('a', 'Côté antenne', 'ntype', RF, 'io'), port('b', 'Côté rack', 'bnc', RF, 'io')]),
])

export const STAGE: DeviceTemplate[] = [...STAGEBOX, ...MONITORING, ...MULTICORE, ...MICS, ...DIS, ...HF_RX, ...HF_TX, ...IEM, ...ANTENNAS]
