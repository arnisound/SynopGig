import type { DeviceTemplate, ProductDoc, Spec } from '../../types'

/*
 * Product sheets of the models whose description is not in their own
 * file: what the device is, and its main characteristics.
 */

type Extra = [string, string, string, string?]
const s = (d: string, ...x: Extra[]) => ({ d, x })
const univ = (n: string) => ['Lumière', 'Univers DMX', n] as Extra
const src = (v: string) => ['Lumière', 'Source', v] as Extra

const SHEETS: Record<string, { d: string; x: Extra[] }> = {
  // ---- Generic models
  mic: s('Micro dynamique générique de scène, sortie XLR.'),
  di: s('Boîte de direct active générique : entrée jack, renvoi thru, sortie symétrique XLR.'),
  'stagebox-16-8': s('Stagebox Dante générique 16 entrées / 8 sorties.'),
  'console-num': s('Console numérique générique 48 voies avec Dante.'),
  processor: s('Processeur / matrice audio générique 4 entrées / 8 sorties.'),
  'amp-4ch': s('Ampli de puissance générique 4 canaux.'),
  'speaker-passive': s('Enceinte passive générique.'),
  'sub-passive': s('Sub passif générique.'),
  'wedge-active': s('Retour de scène amplifié générique.'),
  'hf-receiver': s('Récepteur HF double générique.'),
  'light-desk': s('Console lumière générique (DMX et Art-Net).'),
  'node-dmx': s('Node Art-Net / sACN générique 4 univers DMX.', univ('4')),
  'splitter-dmx': s('Splitter DMX générique 1 entrée vers 6 sorties isolées.'),
  'spot-lyre': s('Lyre spot générique.'),
  'par-led': s('PAR LED générique.'),
  'dimmer-6': s('Gradateur générique 6 circuits de 2,3 kW.', ['Lumière', 'Circuits', '6 × 2,3 kW']),
  camera: s('Caméra générique, sortie SDI.'),
  'video-mixer': s('Mélangeur vidéo générique 4 entrées.'),
  projector: s('Vidéoprojecteur générique.'),
  screen: s('Écran de contrôle générique.'),
  'switch-8': s('Switch réseau générique 8 ports.'),
  'switch-fiber': s('Switch réseau générique 8 ports avec liaisons fibre.'),
  laptop: s('Ordinateur portable (lecture, contrôle, édition).'),
  'distro-32': s('Armoire de distribution électrique générique 32 A triphasé.'),
  multiprise: s('Multiprise / triplette secteur.'),
  'rack-power-1u': s('Distribution secteur générique en rack 1U.'),
  // ---- Lighting consoles
  'avo-arena': s('Console lumière Avolites grand format (Titan), deux écrans tactiles, pour les grosses productions.', univ('jusqu’à 64 (avec processeurs)')),
  'avo-d9-215': s('Console lumière Avolites Diamond 9, haut de gamme Titan.', univ('jusqu’à 64')),
  'avo-quartz': s('Console lumière Avolites compacte (Titan) à écran tactile.', univ('16')),
  'avo-tiger': s('Console lumière Avolites Tiger Touch II (Titan), format moyen avec écran tactile.', univ('16 (64 avec processeurs)')),
  'avo-titan-mobile': s('Surface de contrôle Avolites Titan Mobile, pilotée par un ordinateur en USB.', univ('2')),
  'chamsys-mq250': s('Console lumière ChamSys MagicQ MQ250M, format moyen à écran tactile.', univ('128')),
  'chamsys-mq50': s('Console lumière ChamSys MagicQ compacte.', univ('6')),
  'chamsys-mq500m': s('Console lumière ChamSys MagicQ MQ500M Stadium, haut de gamme.', univ('256')),
  'chamsys-mq70': s('Console lumière ChamSys MagicQ compacte à écran tactile.', univ('12')),
  'chamsys-mq80': s('Console lumière ChamSys MagicQ compacte à deux écrans.', univ('24')),
  'chamsys-stadium-wing': s('Aile de contrôle ChamSys MagicQ Stadium, reliée à un ordinateur ou une console.'),
  'etc-colorsource40': s('Console lumière ETC ColorSource 40 AV, simple, avec entrée audio et contrôle de projecteurs LED.', univ('2')),
  'etc-eos-apex': s('Console lumière ETC Eos Apex 10, haut de gamme de la famille Eos.'),
  'etc-eos-ti': s('Console lumière ETC Eos Ti de la famille Eos.'),
  'etc-gio5': s('Console lumière ETC Gio @5 compacte de la famille Eos.'),
  'etc-ion-xe': s('Console lumière ETC Ion Xe de la famille Eos.'),
  'ma2-light': s('Console lumière grandMA2 light (génération précédente), réseau MA-Net2.'),
  'ma3-compact': s('Console lumière grandMA3 compact.'),
  'ma3-compact-xt': s('Console lumière grandMA3 compact XT, plus de faders.'),
  'ma3-full': s('Console lumière grandMA3 full-size, la grande de la gamme.'),
  'ma3-light': s('Console lumière grandMA3 light.'),
  'ma3-cmd-wing': s('Surface de commande grandMA3 onPC command wing, reliée à un ordinateur.'),
  'ma3-fader-wing': s('Aile de faders grandMA3 onPC fader wing.'),
  'ma3-pu-l': s('Processeur grandMA3 processing unit L : ajoute des paramètres au réseau MA.'),
  'ma3-pu-m': s('Processeur grandMA3 processing unit M : ajoute des paramètres au réseau MA.'),
  // ---- Nodes
  'dmxking-edmx4': s('Node Art-Net / sACN DMXking 4 univers.', univ('4')),
  'etc-response-4': s('Passerelle ETC Response 4 univers DMX, alimentée en PoE.', univ('4')),
  'luminex-lumi12': s('Node Luminex LumiNode 12 en rack 1U, 12 ports DMX configurables.', univ('12')),
  'luminex-lumi2': s('Petit node Luminex LumiNode 2, 2 ports DMX.', univ('2')),
  'luminex-lumi4': s('Node Luminex LumiNode 4 en rack, 4 ports DMX.', univ('4')),
  'ma-8port': s('Node grandMA3 8 ports DMX en rack 2U.', univ('8')),
  'ma-xport-node': s('Petit node grandMA3 2 ports DMX alimenté en PoE.', univ('2')),
  'ma-net-switch': s('Switch MA Network Switch préconfiguré pour MA-Net et l’Art-Net.'),
  'swisson-xnd4': s('Node Swisson XND-4 4 univers en rack 1U.', univ('4')),
  'swisson-xnd8': s('Node Swisson XND-8 8 univers en rack 1U.', univ('8')),
  // ---- Fixtures
  'ayrton-diablo': s('Lyre profile LED compacte Ayrton.', src('LED 300 W')),
  'chauvet-maverick-force-s': s('Lyre profile LED Chauvet Maverick Force S.', src('LED')),
  'chauvet-r1-spot': s('Petite lyre spot LED Chauvet Rogue R1.', src('LED')),
  'cp-mythos2': s('Lyre hybride spot / beam Claypaky Mythos 2.', src('lampe 470 W')),
  'cp-scenius-unico': s('Lyre profile Claypaky Scenius Unico, forte puissance.', src('lampe 1400 W')),
  'cp-xtylos': s('Lyre beam à source laser Claypaky Xtylos.', src('laser RVB')),
  'elation-fuze-profile': s('Lyre profile LED Elation Fuze.', src('LED')),
  'martin-encore-perf': s('Lyre profile LED Martin MAC Encore Performance, silencieuse pour le théâtre.', src('LED')),
  'martin-mac-ultra': s('Lyre profile LED forte puissance Martin MAC Ultra Performance.', src('LED')),
  'martin-viper': s('Lyre profile Martin MAC Viper.', src('lampe 1000 W')),
  'robe-bmfl-blade': s('Lyre profile Robe BMFL Blade à couteaux.', src('lampe 1700 W')),
  'robe-esprite': s('Lyre profile LED Robe ESPRITE à couteaux.', src('LED 650 W')),
  'robe-forte': s('Lyre profile LED forte puissance Robe FORTE.', src('LED 1000 W')),
  'robe-megapointe': s('Lyre hybride beam / spot Robe MegaPointe.', src('lampe 470 W')),
  'robe-painte': s('Lyre profile LED compacte Robe PAINTE à couteaux.', src('LED')),
  'robe-t1': s('Lyre profile LED Robe T1, pour le théâtre et la télévision.', src('LED')),
  'robe-t2': s('Lyre profile LED Robe T2, plus puissante que la T1.', src('LED')),
  'ayrton-huracan': s('Lyre wash LED forte puissance Ayrton Huracán.', src('LED 1000 W')),
  'ayrton-magicblade': s('Barre motorisée LED Ayrton MagicBlade-R (7 sources).', src('LED')),
  'chauvet-r2wash': s('Lyre wash LED Chauvet Rogue R2.', src('LED')),
  'elation-smarty-hybrid': s('Lyre hybride beam / spot / wash Elation Smarty Hybrid.', src('lampe')),
  'glp-x4l': s('Lyre wash LED GLP impression X4 L.', src('LED')),
  'glp-x4s': s('Petite lyre wash LED GLP impression X4 S.', src('LED')),
  'martin-aura-pxl': s('Lyre wash LED à pixels Martin MAC Aura PXL.', src('LED')),
  'martin-aura-xb': s('Lyre wash LED Martin MAC Aura XB.', src('LED')),
  'martin-quantum-wash': s('Lyre wash LED Martin MAC Quantum Wash.', src('LED')),
  'robe-spiider-led': s('Lyre wash LED Robe LEDWash 600X.', src('LED')),
  'robe-spiider': s('Lyre wash LED Robe Spiider à effet pétale.', src('LED')),
  'cp-sharpy': s('Lyre beam Claypaky Sharpy, le faisceau serré de référence.', src('lampe 189 W')),
  'cp-sharpy-plus': s('Lyre hybride beam / spot Claypaky Sharpy Plus.', src('lampe 330 W')),
  'martin-rush-mh6': s('Petite lyre wash LED Martin RUSH MH 6.', src('LED')),
  'robe-ledbeam150': s('Petite lyre beam / wash LED Robe LEDBeam 150.', src('LED')),
  'robe-led-beam350': s('Lyre beam / wash LED Robe LEDBeam 350.', src('LED')),
  'robe-pointe': s('Lyre hybride beam / spot Robe Pointe.', src('lampe 280 W')),
  'robe-spikie': s('Petite lyre beam LED à rotation continue Robe Spikie.', src('LED')),
  'chauvet-colorado-pxl16': s('Barre LED à pixels Chauvet COLORado PXL Bar 16.', src('LED')),
  'elation-sixbar1000': s('Barre LED 6 couleurs Elation SixBar 1000.', src('LED')),
  'glp-fr10': s('Barre LED motorisée GLP impression FR10.', src('LED')),
  'glp-x4bar20': s('Barre wash LED motorisée GLP impression X4 Bar 20.', src('LED')),
  'etc-colorsource-spot': s('Découpe LED couleur ETC ColorSource Spot.', src('LED')),
  'etc-s4-led3': s('Découpe LED ETC Source Four LED Series 3.', src('LED')),
  'chauvet-strike-array4': s('Blinder LED 4 cellules Chauvet STRIKE Array 4.', src('LED')),
  'martin-atomic3000': s('Strobe LED Martin Atomic 3000 LED.', src('LED')),
  'martin-atomic-bold': s('Strobe / wash LED Martin Atomic Bold.', src('LED')),
  'astera-ax3': s('Petit projecteur LED sur batterie Astera AX3, commande sans fil CRMX.', src('LED'), ['Alimentation', 'Batterie', 'intégrée']),
  'astera-ax5': s('PAR LED sur batterie Astera AX5, commande sans fil CRMX.', src('LED'), ['Alimentation', 'Batterie', 'intégrée']),
  'astera-hyperion': s('Tube LED à pixels sur batterie Astera Hyperion, commande sans fil CRMX.', src('LED'), ['Alimentation', 'Batterie', 'intégrée']),
  'astera-titan': s('Tube LED à pixels sur batterie Astera Titan, commande sans fil CRMX.', src('LED'), ['Alimentation', 'Batterie', 'intégrée']),
  // ---- Video
  'bmd-atem-panel10': s('Pupitre de commande ATEM 1 M/E Advanced Panel 10 pour les mélangeurs ATEM.'),
  'bmd-atem-1me-4k': s('Mélangeur vidéo ATEM Constellation 4K 1 M/E, entrées 12G-SDI.'),
  'bmd-1me-hd': s('Mélangeur vidéo ATEM Constellation HD 1 M/E, entrées SDI.'),
  'bmd-atem-2me-hd': s('Mélangeur vidéo ATEM Constellation HD 2 M/E, 20 entrées SDI.'),
  'bmd-atem-mini-extreme-iso': s('Mélangeur ATEM Mini Extreme ISO 8 entrées HDMI, enregistrement de chaque source et streaming.'),
  'bmd-atem-mini-pro': s('Petit mélangeur ATEM Mini Pro 4 entrées HDMI avec streaming et enregistrement.'),
  'bmd-atem-sdi-extreme': s('Mélangeur ATEM SDI Extreme ISO 8 entrées SDI, enregistrement de chaque source.'),
  'bmd-tvs-hd8': s('Mélangeur ATEM Television Studio HD8 8 entrées SDI.'),
  'bmd-hyperdeck-shuttle': s('Enregistreur / lecteur vidéo HyperDeck Shuttle HD sur carte SD.'),
  'bmd-hyperdeck-4k-pro': s('Enregistreur / lecteur vidéo HyperDeck Studio 4K Pro, 12G-SDI et HDMI.'),
  'bmd-hyperdeck': s('Enregistreur / lecteur vidéo HyperDeck Studio HD Plus.'),
  'bmd-videohub-12': s('Grille de commutation vidéo Smart Videohub 12×12.'),
  'bmd-videohub-20': s('Grille de commutation vidéo Smart Videohub 20×20.'),
  'bmd-videohub-40': s('Grille de commutation vidéo Videohub 40×40 12G.'),
  'bmd-bidir': s('Convertisseur bidirectionnel SDI ↔ HDMI.'),
  'bmd-mc-hdmi-sdi': s('Convertisseur HDMI vers SDI 3G, alimenté en USB.'),
  'bmd-mc-sdi-hdmi': s('Convertisseur SDI vers HDMI 3G, alimenté en USB.'),
  'bmd-teranex-mini': s('Convertisseur Teranex Mini 12G-SDI vers HDMI.'),
  'hdbt-rx': s('Récepteur HDBaseT : reçoit le HDMI sur un câble Cat (jusqu’à 100 m), alimenté par l’émetteur.'),
  'hdbt-tx': s('Émetteur HDBaseT : envoie le HDMI sur un câble Cat (jusqu’à 100 m).'),
  'bmd-pocket6k': s('Caméra cinéma Blackmagic Pocket 6K, sortie HDMI.'),
  'bmd-studio4k': s('Caméra de plateau Blackmagic Studio Camera 4K Plus, sortie HDMI.'),
  'bmd-studio-6k-pro': s('Caméra de plateau Blackmagic Studio Camera 6K Pro, 12G-SDI avec retour.'),
  'bmd-ursa-bcast-g2': s('Caméra broadcast Blackmagic URSA Broadcast G2.'),
  'sony-fx6': s('Caméra cinéma Sony FX6 plein format.'),
  'bmd-atem-camera-control': s('Pupitre de contrôle caméras ATEM Camera Control Panel (iris, noir, couleur).'),
  'led-tile': s('Dalle LED générique 500 × 500 mm, données et secteur en chaîne.'),
  // ---- Network
  'luminex-gc10': s('Switch Luminex GigaCore 10 préconfiguré pour le spectacle (groupes Dante, Art-Net...).'),
  'luminex-gc16xt': s('Switch Luminex GigaCore 16Xt préconfiguré pour le spectacle.'),
  'netgear-m4250': s('Switch Netgear AV Line M4250 manageable, profils Dante, AVB et NDI.'),
  'cisco-cbs250-8t': s('Petit switch manageable Cisco 8 ports + 2 SFP.'),
  'cisco-sg350-10': s('Switch manageable Cisco 10 ports en rack.'),
  'opticalcon-breakout': s('Boîtier passif qui éclate un opticalCON QUAD en 4 liaisons DUO.'),
  'media-converter': s('Convertisseur réseau fibre ↔ cuivre.'),
  'poe-injector': s('Injecteur PoE : alimente un appareil réseau par son câble.'),
  'mac-mini-rack-1u': s('Mac mini monté dans un tiroir rack 1U (lecture, contrôle).'),
  'kvm-switch-8': s('Switch KVM 8 ordinateurs vers une console (écran, clavier, souris).'),
  'control-monitor': s('Écran de contrôle 24″ (HDMI, DisplayPort).'),
  // ---- Power
  'distro-125': s('Armoire de distribution 125 A triphasée : départs P17 63 A et 32 A.', ['Énergie', 'Arrivée', '125 A tri']),
  'distro-63': s('Armoire de distribution 63 A triphasée : départs P17 32 A et 16 A.', ['Énergie', 'Arrivée', '63 A tri']),
  'distro-16-6': s('Boîtier de distribution P17 16 A vers 6 prises powerCON.'),
  'distro-32-socapex': s('Boîtier P17 32 A tri vers 2 multiprises Socapex.'),
  'rack-power-2u': s('Distribution secteur rack 2U : arrivée P17 32 A tri, 12 départs powerCON TRUE1.'),
  'soca-breakout': s('Éclaté Socapex vers 6 prises powerCON TRUE1.'),
  'ups-1u-generic': s('Onduleur rack 1U 1000 VA pour les appareils sensibles (consoles, réseaux).'),
  'ups-battery-2u': s('Module de batteries supplémentaires pour onduleur rack.'),
  'rack-strip-8': s('Bandeau rack 1U de 8 prises secteur avec interrupteur.'),
  'charger-talkie-6': s('Chargeur 6 talkies-walkies.'),
  // ---- Rack accessories
  'rack-drawer-1u': s('Tiroir de rack 1U.'),
  'rack-drawer-2u': s('Tiroir de rack 2U.'),
  'rack-drawer-3u': s('Tiroir de rack 3U.'),
  'rack-drawer-4u': s('Tiroir de rack 4U.'),
  'rack-drawer-lock-2u': s('Tiroir de rack 2U fermant à clé.'),
  'rack-shelf-1u': s('Tablette fixe de rack 1U.'),
  'rack-shelf-2u': s('Tablette fixe de rack 2U.'),
  'lamp-usb': s('Lampe col de cygne USB.'),
  'rack-blank-1u': s('Plaque pleine de rack 1U.'),
  'rack-blank-2u': s('Plaque pleine de rack 2U.'),
  'rack-blank-3u': s('Plaque pleine de rack 3U.'),
  'rack-vent-1u': s('Plaque ventilée de rack 1U.'),
  'rack-brush-1u': s('Passe-câbles à brosse 1U.'),
}

/** The makers' own sites, to look a model up on them. */
const SITES: Record<string, string> = {
  APC: 'apc.com', Adamson: 'adamsonsystems.com', Agora: 'agora-switch.com', 'Allen & Heath': 'allen-heath.com', 'Analog Way': 'analogway.com', Antari: 'antari.com', Astera: 'astera-led.com',
  'Audio-Technica': 'audio-technica.com', Avid: 'avid.com', Avolites: 'avolites.com', 'Axiom Pro Audio': 'axiomproaudio.com', Ayrton: 'ayrton.eu', Barco: 'barco.com', Behringer: 'behringer.com',
  BirdDog: 'birddog.tv', 'Blackmagic Design': 'blackmagicdesign.com', Brompton: 'bromptontech.com', Canon: 'canon.com', ChamSys: 'chamsys.co.uk', 'Chauvet Professional': 'chauvetprofessional.com',
  Cisco: 'cisco.com', Claypaky: 'claypaky.it', DMXking: 'dmxking.com', DPA: 'dpamicrophones.com', Decimator: 'decimator.com', DiGiCo: 'digico.biz', ETC: 'etcconnect.com', Eaton: 'eaton.com',
  'Electro-Voice': 'electrovoice.com', Elation: 'elationlighting.com', Epson: 'epson.com', Fohhn: 'fohhn.com', Furman: 'furmanpower.com', GLP: 'glp.de', Klotz: 'klotz-ais.com', 'L-Acoustics': 'l-acoustics.com',
  'Lab.gruppen': 'labgruppen.com', Lake: 'labgruppen.com', Lectrosonics: 'lectrosonics.com', 'Look Solutions': 'looksolutions.com', Luminex: 'luminex.be', 'MA Lighting': 'malighting.com', MDG: 'mdgfog.com',
  Martin: 'martin.com', Midas: 'midasconsoles.com', NEXO: 'nexo-sa.com', Netgear: 'netgear.com', Neumann: 'neumann.com', NovaStar: 'novastar.tech', PTZOptics: 'ptzoptics.com', Panasonic: 'pro-av.panasonic.net',
  Powersoft: 'powersoft.com', PreSonus: 'presonus.com', QSC: 'qsc.com', RCF: 'rcf.it', 'RF Venue': 'rfvenue.com', Radial: 'radialeng.com', Robe: 'robe.cz', 'Robert Juliat': 'robertjuliat.com', Roland: 'proav.roland.com',
  SKAARHOJ: 'skaarhoj.com', Sennheiser: 'sennheiser.com', Shure: 'shure.com', 'Solid State Logic': 'solidstatelogic.com', Sony: 'pro.sony', Soundcraft: 'soundcraft.com', Swisson: 'swisson.com', 'TP-Link': 'tp-link.com',
  Ubiquiti: 'ui.com', Wisycom: 'wisycom.com', Xilica: 'xilica.com', Yamaha: 'yamaha.com', 'd&b audiotechnik': 'dbaudio.com',
}

const search = (q: string) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`

/** Links that always lead somewhere: the user guide searched on the web, and the model on its maker's site. */
export function docLinks(t: Pick<DeviceTemplate, 'brand' | 'model'>): ProductDoc[] {
  if (!t.brand || t.brand === 'Générique') return []
  const name = `${t.brand} ${t.model.replace(/\s*\(.*\)$/, '')}`
  const site = SITES[t.brand]
  return [
    { title: 'Mode d’emploi (PDF) — recherche web', url: search(`${name} user manual pdf`) },
    { title: 'Fiche technique — recherche web', url: search(`${name} datasheet specifications`) },
    ...(site ? [{ title: `Sur le site ${site}`, url: search(`site:${site} ${t.model.replace(/\s*\(.*\)$/, '')}`) }] : []),
  ]
}

/**
 * Mains consumption from the makers' sheets and manuals, with how it is
 * measured: amplifiers and powered speakers at 1/8 of their power (pink
 * noise, the usual figure for sizing a supply), projectors in normal mode.
 */
const WATTS: Record<string, [number, string]> = {
  'la-la12x': [1850, '1/8 puissance, 4 Ω'],
  'la-la4x': [690, '1/8 puissance (≈ 3 A sous 230 V)'],
  'la-larak2': [5550, '3 × LA12X à 1/8 puissance, 4 Ω'],
  'la-larak2avb': [5550, '3 × LA12X à 1/8 puissance, 4 Ω'],
  'nexo-nxamp4x1': [1100, '1/8 puissance'],
  'nexo-nxamp4x4': [3000, '1/8 puissance'],
  'nexo-nxamp4x4mk2': [2400, '1/8 puissance, 4 Ω'],
  'nexo-nxamp4x2mk2': [1890, '1/8 puissance, 2 Ω (8,2 A sous 230 V)'],
  'nexo-nxamp4x1mk2': [1130, '1/8 puissance, 2 Ω (4,9 A sous 230 V)'],
  'ps-t604': [230, '1/8 puissance, 8 Ω (≈ 1 A)'],
  'qsc-k82': [250, '1/8 puissance (1,1 A sous 230 V)'],
  'qsc-k102': [250, '1/8 puissance (1,1 A sous 230 V)'],
  'qsc-k122': [250, '1/8 puissance (1,1 A sous 230 V)'],
  'qsc-ks118': [400, '1/8 puissance (1,7 A sous 240 V)'],
  'qsc-cp12': [75, '1/8 puissance'],
  'yam-dxr10': [110, '1/8 puissance'],
  'yam-dxr12': [110, '1/8 puissance'],
  'yam-dxr15': [110, '1/8 puissance'],
  'yam-dzr10': [150, '1/8 puissance'],
  'yam-dzr12': [150, '1/8 puissance'],
  'yam-dzr15': [150, '1/8 puissance'],
  'yam-dzr315': [150, '1/8 puissance'],
  'yam-dxs15': [100, '1/8 puissance'],
  'yam-dxs18': [150, '1/8 puissance'],
  'yam-dxs18xlf-d': [150, '1/8 puissance'],
  'barco-udx4k32': [2900, 'nominale (3100 W max)'],
  'epson-eb-pu2010': [535, 'typique (452 W en mode éco)'],
  'pana-rz120': [1100, 'maximale (730 W en mode normal)'],
  'yam-ql5': [200, 'nominale'],
  'yam-ql1': [135, 'nominale'],
  'db-d80': [3600, 'base de dimensionnement du constructeur (crête 7000 W, repos 180 W)'],
  'ps-x8': [4300, '1/8 puissance, 4 Ω (18 A sous 240 V)'],
  'ma3-light': [300, 'maximale (300 VA)'],
  'ma3-full': [300, 'maximale (300 VA)'],
  'ma3-compact': [250, 'maximale (250 VA)'],
  'ma3-cmd-wing': [50, 'maximale (50 VA)'],
  'ma-xport-node': [12, 'nominale (PoE)'],
  'ma2-light': [280, 'nominale'],
  'yam-rio1608': [72, 'nominale'],
  'yam-rio3224': [120, 'nominale'],
}

/** Ids given a sheet or a consumption here (checked by the tests). */
export const sheetIds = () => [...Object.keys(SHEETS), ...Object.keys(WATTS)]

/** Adds the sheet written here to a model that lacks it. */
export function withSheet(t: DeviceTemplate): DeviceTemplate {
  const docs = t.docs?.length ? t.docs : docLinks(t)
  if (docs.length) t = { ...t, docs }
  const measured = WATTS[t.id]
  if (measured) {
    const [w, how] = measured
    const specs = [...(t.specs ?? []).filter((x) => x.label !== 'Consommation'), { group: 'Alimentation', label: `Consommation (${how})`, value: String(w), unit: 'W' }]
    t = { ...t, watts: w, specs }
  }
  const sheet = SHEETS[t.id]
  if (!sheet) return t
  const extra: Spec[] = sheet.x.map(([group, label, value, unit]) => ({ group, label, value, ...(unit ? { unit } : {}) }))
  const base: Spec[] = t.specs ?? [
    ...(t.weight ? [{ group: 'Physique', label: 'Poids', value: String(t.weight).replace('.', ','), unit: 'kg' }] : []),
    ...(t.rackU ? [{ group: 'Physique', label: 'Format rack', value: String(t.rackU), unit: 'U' }] : []),
  ]
  const watts = t.watts ? [{ group: 'Alimentation', label: 'Consommation', value: String(t.watts), unit: 'W' }] : []
  const specs = [...base, ...(base.some((x) => x.label === 'Consommation') ? [] : watts), ...extra]
  return { ...t, description: t.description ?? sheet.d, ...(specs.length ? { specs } : {}) }
}
