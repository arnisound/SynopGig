import { applyModel, CASE_MODELS } from './cases/models'
import { LIBRARY } from './data/library'
import { createCase, createDevice, DEFAULT_BANNER, nextCableId, uid } from './project'
import type { CableEdge, DeviceNode, FlightCase, Project, StageItem, StagePlot } from './types'

/*
 * The demonstration show: a festival main stage, wired end to end so that
 * every page has something to say. Sound (Dante stagebox, wireless, ears,
 * L-Acoustics K2 system), lighting (grandMA3, Art-Net node, four DMX lines),
 * video (PTZ cameras, switcher, LED wall, projector, recorder), network
 * (two GigaCore switches over fibre) and power (125 A supply, cabinets,
 * distributions down to every device), with racks, cases and IP / DMX plans.
 */

const tpl = (id: string) => {
  const t = LIBRARY.find((x) => x.id === id)
  if (!t) throw new Error(`Modèle inconnu : ${id}`)
  return t
}

const SON = { title: 'SON', bg: '#e5484d', fg: '#ffffff' }
const LUMIERE = { title: 'LUMIÈRE', bg: '#46a758', fg: '#ffffff' }
const VIDEO = { title: 'VIDÉO', bg: '#8e4ec6', fg: '#ffffff' }
const ENERGIE = { title: 'ÉNERGIE', bg: '#ffc53d', fg: '#1c1c1f' }

export function demoProject(): Project {
  const nodes: DeviceNode[] = []
  const add = (id: string, x: number, y: number, zone: string, name: string, config: DeviceNode['data']['config'] = {}) => {
    const n = createDevice(tpl(id), { x, y }, nodes, zone)
    n.data.name = name
    n.data.config = config
    nodes.push(n)
    return n
  }
  const edges: CableEdge[] = []
  const link = (a: DeviceNode, ap: string, b: DeviceNode, bp: string, length?: number, note?: string) => {
    const pa = a.data.ports.find((x) => x.id === ap)
    const pb = b.data.ports.find((x) => x.id === bp)
    if (!pa || !pb) throw new Error(`Port inconnu : ${a.data.name}.${ap} → ${b.data.name}.${bp}`)
    edges.push({ id: `e-${uid()}`, source: a.id, sourceHandle: ap, target: b.id, targetHandle: bp, data: { cableId: nextCableId(edges, pa.signal), length, ...(note ? { note } : {}) } })
  }

  /* ---------- Sound: stage ---------- */
  const kick = add('shure-beta52', 0, 0, 'Plateau', 'Grosse caisse')
  const snare = add('shure-sm57', 0, 110, 'Plateau', 'Caisse claire')
  const tom1 = add('senn-e604', 0, 220, 'Plateau', 'Tom 1')
  const tom2 = add('senn-e604', 0, 330, 'Plateau', 'Tom basse')
  const voc = add('shure-sm58', 0, 440, 'Plateau', 'Chant lead (filaire)')
  const keys = add('radial-j48-st', 0, 560, 'Plateau', 'DI clavier')
  const antA = add('shure-ua874', 0, 820, 'Plateau', 'Antenne HF A')
  const antB = add('shure-ua874', 0, 930, 'Plateau', 'Antenne HF B')
  add('shure-ulxd2-sm58', 0, 1050, 'Plateau', 'Micro HF chant 1')
  add('shure-ulxd2-sm58', 0, 1150, 'Plateau', 'Micro HF chant 2')

  // Stage rack
  const ua844 = add('shure-ua844', 330, 820, 'Plateau', 'Distributeur antennes')
  const hf = add('shure-ulxd4d', 330, 560, 'Plateau', 'Récepteur HF chant', { ip: '192.168.1.21', notes: 'Fréquences coordonnées avec le plan HF du site. Groupe 3, canaux 1 et 2.' })
  const iem = add('senn-sr2050', 330, 1100, 'Plateau', 'Émetteur ears musiciens', { ip: '192.168.1.40', notes: 'Mix 1 : batteur, mix 2 : chant. Fréquences hors bande des micros HF.' })
  const rio = add('yam-rio3224', 700, 0, 'Plateau', 'Stagebox plateau', { ip: '192.168.1.20', notes: 'ID Rio 1, gains pilotés depuis la console FOH.' })
  const swStage = add('luminex-gc10', 1060, 0, 'Plateau', 'Switch plateau', { ip: '192.168.1.2', mode: 'Profil Dante + Art-Net + contrôle' })
  const node = add('luminex-lumi4', 1060, 420, 'Plateau', 'Node DMX plateau', { ip: '2.0.0.20', mode: 'Art-Net, univers 1 à 4' })
  const rackPwr = add('rack-power-1u', 1060, 720, 'Plateau', 'Distribution rack plateau')
  const drawer = add('rack-drawer-2u', 1060, 1000, 'Plateau', 'Tiroir accessoires')

  /* ---------- Sound: amplifiers and system ---------- */
  const la1 = add('la-la12x', 1450, 0, 'Façade', 'LA12X façade jardin', { ip: '192.168.1.50', mode: 'Preset K2_110 + KS28_60' })
  const la2 = add('la-la12x', 1450, 430, 'Façade', 'LA12X façade cour', { ip: '192.168.1.51', mode: 'Preset K2_110 + KS28_60' })
  const la3 = add('la-la12x', 1450, 860, 'Façade', 'LA12X subs', { ip: '192.168.1.52', mode: 'Preset KS28_60, cardioïde' })
  const la4 = add('la-la4x', 1450, 1290, 'Retours', 'LA4X lipfills et retours', { ip: '192.168.1.53', mode: 'X8 (lipfills), X15_MO (retours)' })
  const ampPwr = add('distro-amp-32tri', 1450, 1710, 'Façade', 'Distribution amplis')
  const k2L = add('la-k2', 1850, 0, 'Façade', 'K2 jardin (12 boîtes)')
  const subL = add('la-ks28', 1850, 860, 'Façade', 'KS28 jardin (4 boîtes)')
  const k2R = add('la-k2', 1850, 430, 'Façade', 'K2 cour (12 boîtes)')
  const subR = add('la-ks28', 1850, 990, 'Façade', 'KS28 cour (4 boîtes)')
  const fillL = add('la-x8', 1850, 1290, 'Façade', 'Lipfill jardin')
  const fillR = add('la-x8', 1850, 1400, 'Façade', 'Lipfill cour')
  const wedge1 = add('la-x15', 1850, 1510, 'Retours', 'Retour chant')
  const wedge2 = add('la-x15', 1850, 1620, 'Retours', 'Retour clavier')

  /* ---------- FOH: sound, lighting, video ---------- */
  const desk = add('yam-cl5', 2350, 0, 'Régie FOH', 'Console son FOH', { ip: '192.168.1.10', notes: 'Show file « Festival 2026 ». Horloge Dante : la console est leader.' })
  const playback = add('pc-rack-2u-dante', 2350, 620, 'Régie FOH', 'Playback et enregistrement', { ip: '192.168.1.30', notes: 'Enregistrement multipiste 32 voies via Dante Virtual Soundcard.' })
  const swFoh = add('luminex-gc16xt', 2750, 0, 'Régie FOH', 'Switch régie', { ip: '192.168.1.3', mode: 'Profil Dante + Art-Net + contrôle' })
  const ma = add('ma3-compact-xt', 2750, 520, 'Régie FOH', 'Console lumière', { ip: '2.0.0.10', notes: 'Show « Festival 2026 », Art-Net univers 1 à 4 vers le node plateau.' })
  const atem = add('bmd-atem-1me-4k', 3150, 0, 'Régie FOH', 'Mélangeur vidéo', { ip: '192.168.2.10' })
  const deck = add('bmd-hyperdeck-4k-pro', 3150, 560, 'Régie FOH', 'Enregistreur vidéo', { ip: '192.168.2.11', mode: 'ProRes 422 HQ, 1080p50' })
  const ledProc = add('novastar-vx1000', 3550, 0, 'Régie FOH', 'Processeur écran LED', { ip: '192.168.2.20', mode: '3 × 2 dalles, 1080p50' })
  const monitor = add('led-screen-55', 3550, 520, 'Régie FOH', 'Écran retour vidéo régie')
  const iecFoh = add('conv-16-iec', 3150, 900, 'Régie FOH', 'Multiprise IEC régie')
  const iecVideo = add('conv-16-iec', 3550, 1150, 'Régie FOH', 'Multiprise IEC vidéo')

  /* ---------- Video: stage ---------- */
  const camL = add('pana-ue150', 2350, 1100, 'Façade', 'Caméra PTZ jardin', { ip: '192.168.2.31' })
  const camR = add('pana-ue150', 2350, 1300, 'Façade', 'Caméra PTZ cour', { ip: '192.168.2.32' })
  const psuL = add('psu-12v', 2050, 1100, 'Façade', 'Alim caméra jardin')
  const psuR = add('psu-12v', 2050, 1300, 'Façade', 'Alim caméra cour')
  const proj = add('epson-eb-pu2220b', 3550, 820, 'Façade', 'Vidéoprojecteur écran latéral', { ip: '192.168.2.40', mode: 'Écran latéral 5 m, 20 000 lumens' })
  const tiles = Array.from({ length: 6 }, (_, i) => add('led-tile', 3950 + (i % 3) * 260, (i < 3 ? 0 : 320), 'Plateau', `Dalle LED ${i < 3 ? 'haut' : 'bas'} ${(i % 3) + 1}`))

  /* ---------- Lighting ---------- */
  const spots = Array.from({ length: 4 }, (_, i) => add('robe-megapointe', 700 + i * 300, 1650, 'Grill', `MegaPointe contre ${i + 1}`, { dmxUniverse: '1', dmxAddress: String(1 + i * 40), mode: 'Mode 1 (39 ch)' }))
  const washes = Array.from({ length: 4 }, (_, i) => add('martin-aura-xb', 700 + i * 300, 1950, 'Grill', `Aura XB face ${i + 1}`, { dmxUniverse: '2', dmxAddress: String(1 + i * 25), mode: 'Extended (25 ch)' }))
  const strobes = Array.from({ length: 2 }, (_, i) => add('chauvet-strike4', 700 + i * 300, 2250, 'Grill', `Blinder Strike 4 ${i === 0 ? 'jardin' : 'cour'}`, { dmxUniverse: '3', dmxAddress: String(1 + i * 20), mode: '20 ch' }))
  const beams = Array.from({ length: 3 }, (_, i) => add('robe-spiider', 1300 + i * 300, 2250, 'Grill', `Spiider ${['jardin', 'centre', 'cour'][i]}`, { dmxUniverse: '4', dmxAddress: String(1 + i * 60), mode: 'Mode 1 (49 ch)' }))

  /* ---------- Power ---------- */
  const supply = add('src-125-tri', 0, 2700, 'Coulisses', 'Arrivée 125A tri (TGBT du site)')
  const main = add('conv-125-63x2', 330, 2700, 'Coulisses', 'Armoire générale 125A')
  const cabAv = add('conv-63-32tri', 700, 2600, 'Coulisses', 'Armoire son et vidéo 63A')
  const cabLx = add('conv-63-32tri', 700, 2900, 'Coulisses', 'Armoire lumière 63A')
  const box16Stage = add('distro-16-6', 1060, 2550, 'Plateau', 'Boîte 16A plateau')
  const ledPwr = add('rack-power-2u', 1060, 2700, 'Plateau', 'Distribution écran LED')
  const soca = add('distro-32-socapex', 1060, 2950, 'Grill', 'Distribution grill')
  const brkA = add('soca-breakout', 1400, 2900, 'Grill', 'Éclaté Socapex A')
  const brkB = add('soca-breakout', 1400, 3100, 'Grill', 'Éclaté Socapex B')
  const box16Foh = add('distro-16-6', 1060, 3200, 'Régie FOH', 'Boîte 16A régie')
  const camStrip = add('conv-16-schuko', 1400, 3300, 'Façade', 'Multiprise caméras')

  /* ---------- Cables: sound ---------- */
  link(kick, 'out', rio, 'in1', 10)
  link(snare, 'out', rio, 'in2', 10)
  link(tom1, 'out', rio, 'in3', 10)
  link(tom2, 'out', rio, 'in4', 10)
  link(keys, 'out1', rio, 'in5', 5)
  link(keys, 'out2', rio, 'in6', 5)
  link(voc, 'out', rio, 'in7', 15)
  link(antA, 'out', ua844, 'antA', 15, 'Antennes en hauteur, côté jardin, vue dégagée sur la scène.')
  link(antB, 'out', ua844, 'antB', 15)
  link(ua844, 'outA1', hf, 'antA', 0.5)
  link(ua844, 'outB1', hf, 'antB', 0.5)
  link(hf, 'out1', rio, 'in9', 0.5)
  link(hf, 'out2', rio, 'in10', 0.5)
  // Console mixes come back through the stagebox outputs.
  link(rio, 'out1', la1, 'in1', 20)
  link(rio, 'out2', la2, 'in1', 20)
  link(rio, 'out3', la3, 'in1', 20, 'Subs jardin, envoi séparé')
  link(rio, 'out4', la3, 'in2', 20, 'Subs cour, envoi séparé')
  link(rio, 'out5', la4, 'in1', 20)
  link(rio, 'out6', la4, 'in3', 20)
  link(rio, 'out7', iem, 'in1', 0.5)
  link(rio, 'out8', iem, 'in2', 0.5)
  link(la1, 'hp8', k2L, 'in', 25)
  link(la3, 'hp1', subL, 'in', 15)
  link(la2, 'hp8', k2R, 'in', 25)
  link(la3, 'hp2', subR, 'in', 15)
  link(la4, 'hp1', fillL, 'in', 10)
  link(la4, 'hp2', fillR, 'in', 10)
  link(la4, 'hp3', wedge1, 'in', 15)
  link(la4, 'hp4', wedge2, 'in', 15)

  /* ---------- Cables: network ---------- */
  link(rio, 'pri', swStage, 'p1', 0.5)
  link(hf, 'pri', swStage, 'p2', 0.5)
  link(iem, 'ctl', swStage, 'p3', 0.5)
  link(node, 'netA', swStage, 'p4', 0.5)
  link(la1, 'netA', swStage, 'p5', 20)
  link(la2, 'netA', swStage, 'p6', 20)
  link(la3, 'netA', swStage, 'p7', 20)
  link(la4, 'netA', swStage, 'p8', 20)
  link(swStage, 'sfp1', swFoh, 'sfp1', 80, 'Fibre monomode OpticalCON DUO, liaison plateau ↔ régie.')
  link(desk, 'pri', swFoh, 'p1', 2)
  link(playback, 'pri', swFoh, 'p2', 1)
  link(ma, 'netA', swFoh, 'p3', 2)
  link(atem, 'net', swFoh, 'p4', 1)
  link(deck, 'net', swFoh, 'p5', 1)
  link(ledProc, 'net', swFoh, 'p6', 1)
  link(camL, 'net', swFoh, 'p7', 50)
  link(camR, 'net', swFoh, 'p8', 50)
  link(proj, 'net', swFoh, 'p9', 40)

  /* ---------- Cables: lighting ---------- */
  link(node, 'dmx1', spots[0], 'dmxIn', 20)
  link(node, 'dmx2', washes[0], 'dmxIn', 20)
  link(node, 'dmx3', strobes[0], 'dmxIn', 20)
  link(node, 'dmx4', beams[0], 'dmxIn', 20)
  for (const line of [spots, washes, strobes, beams]) for (let i = 1; i < line.length; i++) link(line[i - 1], 'dmxOut', line[i], 'dmxIn', 3)

  /* ---------- Cables: video ---------- */
  link(camL, 'sdi', atem, 'in1', 50)
  link(camR, 'sdi', atem, 'in2', 50)
  link(atem, 'aux1', ledProc, 'sdi', 2)
  link(atem, 'aux2', deck, 'in', 1)
  link(atem, 'aux3', proj, 'sdi', 40)
  link(atem, 'aux4', monitor, 'sdi', 3)
  link(ledProc, 'led1', tiles[0], 'in', 60, 'Ligne data haut : dalles 1 → 3')
  link(tiles[0], 'out', tiles[1], 'in', 0.5)
  link(tiles[1], 'out', tiles[2], 'in', 0.5)
  link(ledProc, 'led2', tiles[3], 'in', 60, 'Ligne data bas : dalles 1 → 3')
  link(tiles[3], 'out', tiles[4], 'in', 0.5)
  link(tiles[4], 'out', tiles[5], 'in', 0.5)

  /* ---------- Cables: power ---------- */
  link(supply, 'out', main, 'in', 5)
  link(main, 'p631', cabAv, 'in', 10)
  link(main, 'p632', cabLx, 'in', 10)
  // Sound and video cabinet
  link(cabAv, 'p321', ampPwr, 'in', 25)
  link(cabAv, 'p322', ledPwr, 'in', 25)
  link(cabAv, 'p161', box16Stage, 'in', 20)
  link(cabAv, 'p162', iecFoh, 'in', 60)
  link(cabAv, 'p163', iecVideo, 'in', 60)
  link(ampPwr, 'out1', la1, 'pwr', 1)
  link(ampPwr, 'out2', la2, 'pwr', 1)
  link(ampPwr, 'out3', la3, 'pwr', 1)
  link(ampPwr, 'out4', la4, 'pwr', 1)
  link(box16Stage, 'out1', rackPwr, 'in', 2)
  link(rackPwr, 'out1', swStage, 'pwr', 0.5)
  link(rackPwr, 'out2', node, 'pwr', 0.5)
  link(rackPwr, 'iec1', rio, 'pwr', 0.5)
  link(rackPwr, 'iec2', hf, 'pwr', 0.5)
  link(rackPwr, 'iec3', ua844, 'pwr', 0.5)
  link(rackPwr, 'iec4', iem, 'pwr', 0.5)
  link(iecFoh, 'iec1', desk, 'pwr', 2)
  link(iecFoh, 'iec2', playback, 'pwr', 1)
  link(iecVideo, 'iec1', atem, 'pwr', 1)
  link(iecVideo, 'iec2', deck, 'pwr', 1)
  link(iecVideo, 'iec3', ledProc, 'pwr', 1)
  link(iecVideo, 'iec4', monitor, 'pwr', 2)
  link(iecVideo, 'iec5', proj, 'pwr', 40)
  link(ledPwr, 'out1', tiles[0], 'pwr', 10)
  link(tiles[0], 'pwr-out', tiles[1], 'pwr', 0.5)
  link(tiles[1], 'pwr-out', tiles[2], 'pwr', 0.5)
  link(ledPwr, 'out2', tiles[3], 'pwr', 10)
  link(tiles[3], 'pwr-out', tiles[4], 'pwr', 0.5)
  link(tiles[4], 'pwr-out', tiles[5], 'pwr', 0.5)
  // Lighting cabinet
  link(cabLx, 'p321', soca, 'in', 25)
  link(cabLx, 'p161', box16Foh, 'in', 60)
  link(cabLx, 'p162', camStrip, 'in', 50)
  link(soca, 'soca1', brkA, 'in', 20)
  link(soca, 'soca2', brkB, 'in', 20)
  const chain = (from: DeviceNode, port: string, line: DeviceNode[]) => {
    link(from, port, line[0], 'pwr', 5)
    for (let i = 1; i < line.length; i++) link(line[i - 1], 'pwr-out', line[i], 'pwr', 3)
  }
  chain(brkA, 'out1', spots.slice(0, 2))
  chain(brkA, 'out2', spots.slice(2))
  chain(brkA, 'out3', washes.slice(0, 2))
  chain(brkA, 'out4', washes.slice(2))
  chain(brkB, 'out1', [strobes[0]])
  chain(brkB, 'out2', [strobes[1]])
  chain(brkB, 'out3', [beams[0]])
  chain(brkB, 'out4', [beams[1]])
  chain(brkB, 'out5', [beams[2]])
  link(box16Foh, 'out1', ma, 'pwr', 2)
  link(box16Foh, 'out2', swFoh, 'pwr', 1)
  link(camStrip, 'sch1', psuL, 'in', 2)
  link(camStrip, 'sch2', psuR, 'in', 2)
  link(psuL, 'out', camL, 'pwr', 2)
  link(psuR, 'out', camR, 'pwr', 2)

  // Phases chosen to balance the supply (see the Énergie page): each Socapex circuit, each 16 A outlet.
  const key = (n: DeviceNode, port: string) => `${n.id}:${port}`
  const phases = {
    [key(brkA, 'out1')]: 'L1', [key(brkA, 'out2')]: 'L2', [key(brkA, 'out3')]: 'L3', [key(brkA, 'out4')]: 'L3',
    [key(brkB, 'out1')]: 'L1', [key(brkB, 'out2')]: 'L2', [key(brkB, 'out3')]: 'L1', [key(brkB, 'out4')]: 'L2', [key(brkB, 'out5')]: 'L3',
    [key(cabLx, 'p161')]: 'L3', [key(cabLx, 'p162')]: 'L3',
    [key(cabAv, 'p161')]: 'L1', [key(cabAv, 'p162')]: 'L2', [key(cabAv, 'p163')]: 'L3',
    [key(ampPwr, 'out1')]: 'L1', [key(ampPwr, 'out2')]: 'L2', [key(ampPwr, 'out3')]: 'L3', [key(ampPwr, 'out4')]: 'L1',
    [key(ledPwr, 'out1')]: 'L1', [key(ledPwr, 'out2')]: 'L2',
  } as const

  /* ---------- Layout: one band per trade, each rack's devices together ---------- */
  const at: Record<string, [number, number]> = {
    // Stage: sources, then the stage rack (two columns)
    'Grosse caisse': [0, 0], 'Caisse claire': [0, 100], 'Tom 1': [0, 200], 'Tom basse': [0, 300], 'Chant lead (filaire)': [0, 400], 'DI clavier': [0, 520],
    'Antenne HF A': [0, 800], 'Antenne HF B': [0, 900], 'Micro HF chant 1': [0, 1040], 'Micro HF chant 2': [0, 1140],
    'Stagebox plateau': [330, 0], 'Récepteur HF chant': [330, 560], 'Distributeur antennes': [330, 820], 'Émetteur ears musiciens': [330, 1080],
    'Switch plateau': [650, 0], 'Node DMX plateau': [650, 420], 'Distribution rack plateau': [650, 680], 'Tiroir accessoires': [650, 980],
    // Amplifiers rack, then the speakers
    'LA12X façade jardin': [1050, 0], 'LA12X façade cour': [1050, 400], 'LA12X subs': [1050, 800], 'LA4X lipfills et retours': [1050, 1200], 'Distribution amplis': [1050, 1600],
    'K2 jardin (12 boîtes)': [1400, 0], 'K2 cour (12 boîtes)': [1400, 400], 'KS28 jardin (4 boîtes)': [1400, 800], 'KS28 cour (4 boîtes)': [1400, 900],
    'Lipfill jardin': [1400, 1200], 'Lipfill cour': [1400, 1300], 'Retour chant': [1400, 1400], 'Retour clavier': [1400, 1500],
    // FOH: desks, then the FOH rack (two columns), then video outputs
    'Console son FOH': [1800, 0], 'Console lumière': [1800, 700],
    'Switch régie': [2200, 0], 'Playback et enregistrement': [2200, 520], 'Enregistreur vidéo': [2200, 900],
    'Mélangeur vidéo': [2550, 0], 'Processeur écran LED': [2550, 520], 'Tablette régie': [2550, 1000], 'Multiprise IEC régie': [2550, 1150], 'Multiprise IEC vidéo': [2550, 1350],
    'Écran retour vidéo régie': [2950, 700], 'Vidéoprojecteur écran latéral': [2950, 900],
    'Caméra PTZ jardin': [1800, 1250], 'Caméra PTZ cour': [1800, 1450], 'Alim caméra jardin': [1800, 1650], 'Alim caméra cour': [1800, 1750],
    // Power, bottom left
    'Arrivée 125A tri (TGBT du site)': [0, 3100], 'Armoire générale 125A': [300, 3100], 'Armoire son et vidéo 63A': [620, 2980], 'Armoire lumière 63A': [620, 3300],
    'Boîte 16A plateau': [950, 2900], 'Distribution écran LED': [950, 3050], 'Distribution grill': [950, 3350], 'Éclaté Socapex A': [1280, 3280], 'Éclaté Socapex B': [1280, 3500],
    'Boîte 16A régie': [950, 3600], 'Multiprise caméras': [950, 3780],
  }
  tiles.forEach((t, i) => (at[t.data.name] = [2950 + (i % 3) * 260, i < 3 ? 0 : 320]))
  spots.forEach((n, i) => (at[n.data.name] = [330 + i * 280, 2150]))
  washes.forEach((n, i) => (at[n.data.name] = [330 + i * 280, 2400]))
  strobes.forEach((n, i) => (at[n.data.name] = [330 + i * 280, 2650]))
  beams.forEach((n, i) => (at[n.data.name] = [890 + i * 280, 2650]))
  for (const n of nodes) {
    const xy = at[n.data.name]
    if (xy) n.position = { x: xy[0], y: xy[1] }
  }

  // Patch: names, stands, phantom power and notes, kept on the stagebox sockets.
  const pin = (port: string, name: string, extra: Partial<{ stand: string; phantom: boolean; note: string }> = {}) => [`${rio.id}/${port}`, { name, ...extra }] as const
  const patch = {
    inputs: Object.fromEntries([
      pin('in1', 'Grosse caisse', { stand: 'Petit pied' }),
      pin('in2', 'Caisse claire', { stand: 'Pince' }),
      pin('in3', 'Tom 1', { stand: 'Pince' }),
      pin('in4', 'Tom basse', { stand: 'Pince' }),
      pin('in5', 'Clavier L', { phantom: true, note: 'DI active : 48 V' }),
      pin('in6', 'Clavier R', { phantom: true, note: 'DI active : 48 V' }),
      pin('in7', 'Chant lead filaire', { stand: 'Grand pied perche', note: 'Secours du HF 1' }),
      pin('in9', 'Chant HF 1'),
      pin('in10', 'Chant HF 2'),
    ]),
    outputs: Object.fromEntries([
      pin('out1', 'Façade L (K2 jardin)'),
      pin('out2', 'Façade R (K2 cour)'),
      pin('out3', 'Subs L'),
      pin('out4', 'Subs R'),
      pin('out5', 'Lipfills'),
      pin('out6', 'Retours wedges'),
      pin('out7', 'Ears batteur'),
      pin('out8', 'Ears chant'),
    ]),
  }

  // Stage plot: 12 × 8 m, drums on a riser upstage centre, keys stage left, LED wall upstage.
  const item = (kind: StageItem['kind'], label: string, x: number, y: number, w: number, h: number, nodeId?: string, rot = 0): StageItem => ({ id: `st-${uid()}`, kind, label, x, y, w, h, rot, ...(nodeId ? { nodeId } : {}) })
  const stage: StagePlot = {
    width: 12,
    depth: 8,
    items: [
      item('label', 'Écran LED 3 × 2 dalles', 3.5, 0.1, 5, 0.4),
      item('riser', 'Praticable batterie 2 × 2', 5, 0.8, 2, 2),
      item('drums', 'Batterie', 5, 0.9, 2, 1.8),
      item('device', 'Grosse caisse', 5.65, 2.85, 0.7, 0.45, kick.id),
      item('device', 'Caisse claire', 4.3, 1.6, 0.7, 0.45, snare.id),
      item('device', 'Tom 1', 4.3, 1.0, 0.7, 0.45, tom1.id),
      item('device', 'Tom basse', 7.1, 1.6, 0.7, 0.45, tom2.id),
      item('power', '220 V', 4.6, 2.9, 0.35, 0.25),
      item('keys', 'Clavier', 1.2, 3.2, 1.4, 0.5),
      item('musician', 'Claviériste', 1.6, 2.5, 0.6, 0.6),
      item('device', 'DI clavier', 1.55, 3.9, 0.7, 0.45, keys.id),
      item('wedge', 'Retour clavier', 1.55, 4.6, 0.7, 0.5, wedge2.id),
      item('power', '220 V', 0.8, 2.6, 0.35, 0.25),
      item('musician', 'Chant lead', 5.7, 5.2, 0.6, 0.6),
      item('stand', 'Pied chant', 5.82, 6.0, 0.35, 0.35),
      item('device', 'Chant lead (filaire)', 6.3, 5.9, 0.7, 0.45, voc.id),
      item('wedge', 'Retour chant', 5.65, 6.8, 0.7, 0.5, wedge1.id),
      item('musician', 'Chant 2 (HF)', 8.6, 5.0, 0.6, 0.6),
      item('device', 'Lipfill jardin', 0.2, 7.4, 0.7, 0.45, fillL.id),
      item('device', 'Lipfill cour', 11.1, 7.4, 0.7, 0.45, fillR.id),
      item('device', 'Rack plateau', 10.4, 0.9, 1.2, 0.7, rio.id),
      item('power', '220 V', 10.0, 1.8, 0.35, 0.25),
      item('label', 'Antennes HF', 9.9, 2.3, 1.8, 0.4),
    ],
  }

  /* ---------- Racks and cases ---------- */
  const cases: FlightCase[] = []
  const box = (name: string, model: string, banner: typeof SON, subtitle: string, devices: DeviceNode[], extras = '') => {
    const m = CASE_MODELS.find((x) => x.name === model)
    if (!m) throw new Error(`Modèle de case inconnu : ${model}`)
    const c = applyModel(createCase(cases), m)
    c.name = name
    c.devices = devices.map((d) => d.id)
    c.extras = extras
    c.banner = { ...DEFAULT_BANNER, ...banner, subtitle }
    cases.push(c)
    return c
  }
  const rack = (c: FlightCase, layout: [DeviceNode, number][]) => {
    c.rackLayout = Object.fromEntries(layout.map(([n, top]) => [n.id, top]))
    return c
  }
  const stageRack = box('Rack plateau', 'Rack 19" 12U sur roulettes', SON, 'RACK PLATEAU', [rio, hf, ua844, iem, swStage, node, rackPwr, drawer], 'Câble fibre OpticalCON DUO 80 m sur touret\nCâbles etherCON 1 m × 6\nTiroir : piles, gaffer, adaptateurs XLR')
  stageRack.rackU = 12
  rack(stageRack, [[rio, 1], [hf, 5], [ua844, 6], [iem, 7], [swStage, 8], [node, 9], [drawer, 10], [rackPwr, 12]])
  rack(box('Rack amplis façade', 'Rack amplis 16U sur roulettes', SON, 'AMPLIS FAÇADE', [ampPwr, la1, la2, la3, la4], 'Câbles NL8 25 m × 2\nCâbles NL4 15 m × 6'), [[ampPwr, 1], [la1, 2], [la2, 4], [la3, 6], [la4, 8]]).rackU = 10
  const fohRack = box('Rack régie', 'Rack 19" 12U sur roulettes', VIDEO, 'RACK RÉGIE', [swFoh, playback, atem, deck, ledProc, iecFoh, iecVideo], 'Câbles SDI 50 m × 3 sur touret\nCâble HDMI 3 m')
  const fohShelf = add('rack-shelf-zip-2u', 2550, 1000, 'Régie FOH', 'Tablette régie')
  fohRack.devices.push(fohShelf.id)
  rack(fohRack, [[swFoh, 1], [playback, 2], [atem, 4], [deck, 5], [ledProc, 6], [fohShelf, 8]])
  fohRack.rackU = 10
  fohRack.held = { [iecFoh.id]: fohShelf.id, [iecVideo.id]: fohShelf.id }
  box('Flight console son', 'Flight console grand format (CL5, dLive S7000)', SON, 'CONSOLE FOH', [desk], 'Lampe col de cygne\nCasque de contrôle')
  box('Flight console lumière', 'Flight console 16-24 voies', LUMIERE, 'GRANDMA3', [ma], 'Écran tactile externe\nClé USB show')
  box('Malle MegaPointe', 'Malle projecteurs (4 lyres)', LUMIERE, 'MEGAPOINTE × 4', spots, 'Colliers et élingues de sécurité × 4')
  box('Malle Aura XB', 'Malle projecteurs (4 lyres)', LUMIERE, 'AURA XB × 4', washes, 'Colliers et élingues de sécurité × 4')
  box('Malle effets', 'Malle 120 × 60 × 60 sur roulettes', LUMIERE, 'STRIKE / SPIIDER', [...strobes, ...beams])
  box('Malle câbles lumière', 'Malle à câbles 80 × 50 × 50', LUMIERE, 'CÂBLES DMX', [], 'DMX 5 pts 20 m × 4\nDMX 5 pts 3 m × 10\npowerCON TRUE1 3 m × 10\nSocapex 20 m × 2')
  box('Bac micros', 'Bac crocodile 600 × 400 × 320 (60 L)', SON, 'MICROS', [kick, snare, tom1, tom2, voc, keys], 'Pinces de batterie × 4\nCâbles XLR 10 m × 12')
  box('Valise micros HF', 'Valise micros 50 × 35 × 18 (mousse découpée)', SON, 'MICROS HF', nodes.filter((n) => n.data.name.startsWith('Micro HF')), 'Piles AA × 8 (rechargeables ou neuves)')
  box('Malle câbles son', 'Malle à câbles 80 × 50 × 50', SON, 'CÂBLES SON', [antA, antB], 'Câbles BNC 15 m × 2\nCâbles XLR 20 m × 8')
  box('Malle dalles LED', 'Malle 120 × 60 × 60 sur roulettes', VIDEO, 'DALLES LED × 6', tiles, 'Câbles data etherCON 0,5 m × 4\nCâbles etherCON 60 m × 2')
  box('Valise caméras', 'Valise HF 4 récepteurs', VIDEO, 'PTZ × 2', [camL, camR, psuL, psuR], 'Supports de caméra × 2')
  box('Flight vidéoprojecteur', 'Malle 120 × 60 × 60 sur roulettes', VIDEO, 'UDX-4K32', [proj, monitor], 'Lentille 1,5-2,0:1')
  box('Palox câbles électriques', 'Palox plastique 1200 × 800 × 760 (500 L)', ENERGIE, 'ÉLECTRICITÉ', [supply, main, cabAv, cabLx], 'P17 125A 5 m\nP17 63A 10 m × 2\nP17 32A 25 m × 3\nP17 16A 20 à 60 m × 4\nSocapex 20 m × 2')
  box('Bac distribution', 'Bac crocodile 800 × 600 × 400 (140 L)', ENERGIE, 'DISTRIBUTION', [box16Stage, ledPwr, soca, brkA, brkB, box16Foh, camStrip], 'Rallonges powerCON TRUE1 × 10\nRallonges Schuko × 4')

  return {
    version: 1,
    name: 'Festival des Lucioles — Grande scène',
    venue: 'Parc des expositions',
    date: new Date().toISOString().slice(0, 10),
    nodes,
    edges,
    cases,
    progress: {},
    customTemplates: [],
    view: { compact: true },
    power: { phases },
    patch,
    stage,
    info: {
      description: 'Scène principale d’un festival de musiques actuelles : 1 500 spectateurs, deux plateaux par soir. Exemple complet de SynopGig.',
      client: { id: 'demo-client', name: 'Comité des fêtes (projet de démonstration)' },
      docType: 'Dossier technique',
      revision: 'A',
      status: 'Pour validation',
      site: 'Parc des expositions, hall B',
      room: 'Grande scène',
    },
  }
}
