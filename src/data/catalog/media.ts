import type { DeviceTemplate, ProductDoc } from '../../types'
import FOUND from './media.json'

/*
 * Direct links of the catalogue: the maker's product page, data sheet or
 * user guide, each one checked to exist. media.json holds the product page
 * and photo read from each maker's own site (its og:image or product shot),
 * checked to answer with an image: shown from that address, never copied,
 * and a dead link brings the symbol back.
 */

// logo: the photo is the maker's logo, shown beside the symbol rather than in its place.
type Media = { docs?: ProductDoc[]; photo?: string; logo?: boolean }
const page = (url: string): ProductDoc => ({ title: 'Page produit (fabricant)', url })
const sheet = (url: string): ProductDoc => ({ title: 'Fiche technique (PDF)', url })
const guide = (url: string, title = 'Mode d’emploi'): ProductDoc => ({ title, url })

const CHECKED: Record<string, Media> = {
  'la-la12x': { docs: [page('https://l-acoustics.com/products/la12x')] },
  'la-la7-16': { docs: [page('https://l-acoustics.com/products/la7-16')] },
  'la-la7-16i': { docs: [page('https://www.l-acoustics.com/products/la7.16i/')] },
  'nexo-nxamp4x1': { docs: [page('https://nexo-sa.com/products/nxamp4x1/')] },
  'nexo-nxamp4x1mk2': { docs: [page('https://www.nexo-sa.com/products/nxamp4x1mk2')] },
  'nexo-nxamp4x4mk2': { docs: [sheet('https://www.nexo-sa.com/wp-content/uploads/NXAMP4x4MK2.pdf')] },
  'db-d80': { docs: [page('https://www.dbaudio.com/global/en/products/electronics/d80/')] },
  'db-d40': { docs: [page('https://www.dbaudio.com/global/en/products/amplifiers/d40/')] },
  'db-d20': { docs: [page('https://www.dbaudio.com/global/en/products/electronics/d20/')] },
  'db-ksl8': { docs: [sheet('https://www.dbaudio.com/assets/products/downloads/manuals-documentation/sl-series/dbaudio-datasheet-ksl8-en.pdf')] },
  'yam-dm7': { docs: [page('https://usa.yamaha.com/products/proaudio/mixers/dm7/')] },
  'yam-dm7c': { docs: [page('https://usa.yamaha.com/products/proaudio/mixers/dm7/')] },
  'yam-tf1': { docs: [page('https://usa.yamaha.com/products/proaudio/mixers/tf/specs.html')] },
  'yam-tf3': { docs: [page('https://usa.yamaha.com/products/proaudio/mixers/tf/specs.html')] },
  'yam-tf5': { docs: [page('https://usa.yamaha.com/products/proaudio/mixers/tf/specs.html')] },
  'yam-cl1': { docs: [page('https://usa.yamaha.com/products/proaudio/mixers/cl_series/specs.html')] },
  'yam-cl3': { docs: [page('https://usa.yamaha.com/products/proaudio/mixers/cl_series/specs.html')] },
  'yam-cl5': { docs: [page('https://usa.yamaha.com/products/proaudio/mixers/cl_series/specs.html')] },
  'yam-pm10': { docs: [page('https://in.yamaha.com/en/products/proaudio/mixers/rivage_pm/index.html')] },
  'yam-pm5': { docs: [page('https://in.yamaha.com/en/products/proaudio/mixers/rivage_pm/index.html')] },
  'yam-pm3': { docs: [page('https://in.yamaha.com/en/products/proaudio/mixers/rivage_pm/index.html')] },
  'yam-rio1608': { docs: [page('https://usa.yamaha.com/products/proaudio/interfaces/r_series_adda_2/index.html')] },
  'yam-rio3224': { docs: [page('https://usa.yamaha.com/products/proaudio/interfaces/r_series_adda_2/index.html')] },
  'yam-dxr10': { docs: [page('https://usa.yamaha.com/products/proaudio/speakers/dxr/specs.html')] },
  'yam-dxr12': { docs: [page('https://usa.yamaha.com/products/proaudio/speakers/dxr/specs.html')] },
  'yam-dxr15': { docs: [page('https://usa.yamaha.com/products/proaudio/speakers/dxr/specs.html')] },
  'yam-dxs15': { docs: [sheet('https://au.yamaha.com/files/download/other_assets/1/450501/dxs18_15mkll_12mkll_en_ts_a0.pdf')] },
  'yam-dxs18': { docs: [sheet('https://au.yamaha.com/files/download/other_assets/1/450501/dxs18_15mkll_12mkll_en_ts_a0.pdf')] },
  'yam-px8': { docs: [page('https://usa.yamaha.com/products/proaudio/power_amps/px_series/specs.html')] },
  'yam-px10': { docs: [page('https://usa.yamaha.com/products/proaudio/power_amps/px_series/specs.html')] },
  'digico-q225': { docs: [page('https://digico.biz/consoles/quantum225t/'), sheet('https://digico.biz/wp-content/uploads/2026/03/DiGiCo-Quantum-225-and-Pulse-Data-Sheet.pdf')] },
  'ssl-l100': { docs: [page('https://www.solidstatelogic.com/live/l100')] },
  'ssl-l200': { docs: [page('https://solidstatelogic.com/live/l200')] },
  'ssl-l350': { docs: [page('https://www.solidstatelogic.com/live/l350')] },
  'avid-s6l-24c': { docs: [sheet('https://cdn.avid.com/myavid/avid/files/resource-center/venue_s6l_architectural_specifications.pdf')] },
  'avid-s6l-32d': { docs: [sheet('https://cdn.avid.com/myavid/avid/files/resource-center/venue_s6l_architectural_specifications.pdf')] },
  'avid-s6l-48d': { docs: [sheet('https://cdn.avid.com/myavid/avid/files/resource-center/venue_s6l_architectural_specifications.pdf')] },
  'ah-cq12t': { docs: [guide('https://support.allen-heath.com/hc/en-gb/articles/48456773235473-CQ-Connections', 'Connexions CQ (support Allen & Heath)')] },
  'ah-cq18t': { docs: [guide('https://support.allen-heath.com/hc/en-gb/articles/48456773235473-CQ-Connections', 'Connexions CQ (support Allen & Heath)')] },
  'ah-cq20b': { docs: [guide('https://support.allen-heath.com/hc/en-gb/articles/48456773235473-CQ-Connections', 'Connexions CQ (support Allen & Heath)')] },
  'shure-ulxd4d': { docs: [guide('https://pubs.shure.com/guide/ULXD-DQ/en-US', 'Guide ULX-D double et quadruple')] },
  'shure-ulxd4q': { docs: [guide('https://pubs.shure.com/guide/ULXD-DQ/en-US', 'Guide ULX-D double et quadruple')] },
  'ps-x8': { docs: [page('https://powersoft.com/en/products/touring-amps/x8')] },
  'qsc-k82': { docs: [page('https://www.qsc.com/fr/systemes/produits/enceintes/enceintes-amplifiees-fixes/serie-qsc-k2tm/')] },
  'qsc-k102': { docs: [page('https://www.qsc.com/fr/systemes/produits/enceintes/enceintes-amplifiees-fixes/serie-qsc-k2tm/')] },
  'qsc-k122': { docs: [page('https://www.qsc.com/fr/systemes/produits/enceintes/enceintes-amplifiees-fixes/serie-qsc-k2tm/')] },
  'barco-udx4k32': { docs: [sheet('https://assets.barco.com/m/68e96a3b1d09716e/original/UDX-4K32-en-Spec-sheet.pdf'), guide('https://www.barco.com/manuals/R5906112/cl0gagr9mdkb.html', 'Manuel (caractéristiques)')] },
  'epson-eb-pu2010': { docs: [guide('https://files.support.epson.com/docid/cpd6/cpd61020/source/specifications/reference/ebpu1006w_pu2010w/spex_electrical_ebpu1006w_pu2010w.html', 'Caractéristiques électriques (Epson)')] },
  // Photos: Wikimedia Commons (free licence), shown from their address; a dead link brings the symbol back.
  'shure-sm58': { photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Shure_SM58.jpg/320px-Shure_SM58.jpg' },
}

/** The makers' own sites. */
export const SITES: Record<string, string> = {
  APC: 'apc.com', BSS: 'bssaudio.com', Adamson: 'adamsonsystems.com', Agora: 'agora-switch.com', 'Allen & Heath': 'allen-heath.com', 'Analog Way': 'analogway.com', Antari: 'antari.com', Astera: 'astera-led.com',
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

const found = FOUND as Record<string, Media>

/** The checked links and photo of a model, else its maker's site. */
export function withMedia(t: DeviceTemplate): DeviceTemplate {
  const media: Media = { docs: [...(CHECKED[t.id]?.docs ?? []), ...(found[t.id]?.docs ?? [])], photo: CHECKED[t.id]?.photo ?? found[t.id]?.photo }
  const site = t.brand ? SITES[t.brand] : undefined
  const docs = [...(media.docs ?? []), ...(t.docs ?? [])].filter((d, i, all) => all.findIndex((o) => o.url === d.url) === i)
  if (site && !docs.some((d) => d.url.includes(site))) docs.push({ title: `Site du fabricant (${site})`, url: `https://www.${site}/` })
  const url = t.url ?? media.docs?.find((d) => /Page produit/.test(d.title))?.url
  return { ...t, ...(docs.length ? { docs } : {}), ...(url ? { url } : {}), ...(media.photo && !t.image ? { image: media.photo } : {}) }
}

/** Ids given links or a photo here (checked by the tests). */
export const mediaIds = () => [...Object.keys(CHECKED), ...Object.keys(found)]

/** Images that are a maker's logo, not a photo of the product. */
export const LOGOS = new Set(Object.values(found).filter((m) => m.logo && m.photo).map((m) => m.photo as string))

/** Models whose photo comes from here. */
export const photoIds = () => [...Object.keys(CHECKED), ...Object.keys(found)].filter((id) => CHECKED[id]?.photo ?? found[id]?.photo)
