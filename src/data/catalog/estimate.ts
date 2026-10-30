import type { DeviceTemplate } from '../../types'

/*
 * A consumption for every mains-powered model, so a power budget can be
 * drawn and phases balanced. Makers' figures come first (sheets.ts); for the
 * others, an engineer's estimate by kind of device, checked against the
 * makers' figures we have (LA4X 750 estimated / 690 measured, NXAMP4x1
 * 950 / 1100, Rio1608 65 / 72, K12.2 220 / 250, QL5 200 / 200: within
 * 25 %), and marked as such.
 */

/** Rated amplifier power written in the model or its sheet: "4 × 1300 W", "12 000 W", "2000 W partagés". */
function ratedPower(t: DeviceTemplate): number | undefined {
  const text = `${t.model} ${(t.specs ?? []).filter((s) => /puissance/i.test(s.label)).map((s) => `${s.value} ${s.unit ?? ''}`).join(' ')}`
  const times = /(\d+)\s*[×x]\s*(\d[\d\s]*)\s*W/i.exec(text)
  if (times) return Number(times[1]) * Number(times[2].replace(/\s/g, ''))
  const total = /(\d[\d\s]{2,})\s*W/.exec(text)
  return total ? Number(total[1].replace(/\s/g, '')) : undefined
}

const round = (w: number) => (w < 100 ? Math.max(5, Math.round(w / 5) * 5) : Math.round(w / 10) * 10)
const analog = (t: DeviceTemplate) => t.ports.filter((p) => p.signal === 'audio-analog').length
const count = (t: DeviceTemplate, re: RegExp) => t.ports.filter((p) => re.test(p.label)).length

/** [watts, how it was estimated]. */
export function estimateWatts(t: DeviceTemplate): [number, string] | undefined {
  const f = t.family ?? ''
  const m = t.model.toLowerCase()
  const kg = t.weight ?? 0
  const u = t.rackU ?? 0
  const P = ratedPower(t)
  if (/^Amplis/.test(f)) {
    if (P) return [round(P / 8 / 0.75 + 80), '1/8 de la puissance nominale ÷ rendement 75 % + repos']
    return [round(t.ports.filter((p) => p.signal === 'speaker').length * 200 + 80), '≈ 200 W par canal à 1/8 de puissance']
  }
  if (/Enceintes|Subs|Retours|Line arrays/.test(f)) {
    if (P) return [round(P / 10 + 15), '1/8 de la puissance d’ampli intégrée, rendement classe D']
    return [round(kg > 60 ? 400 : kg > 30 ? 250 : 150), 'enceinte amplifiée, selon sa taille']
  }
  if (/^Consoles$/.test(f)) {
    if (/analogique/.test(m)) return [round(kg > 6 ? 45 : 25), 'console analogique']
    if (/rack|\bxr|\bmr|ui\d|cq-20b/.test(m) || (kg > 0 && kg <= 8)) return [round(40 + analog(t) * 0.5), 'mélangeur numérique compact']
    if (kg > 40) return [350, 'grande console numérique (surface + écrans)']
    if (kg > 18) return [200, 'console numérique de taille moyenne']
    return [120, 'console numérique compacte']
  }
  if (/Stageboxes/.test(f)) return [round(30 + analog(t) * 1.5), '≈ 30 W + 1,5 W par entrée / sortie analogique']
  if (/Processeurs|Conférence/.test(f)) return [round(u >= 2 ? 80 : 45), 'processeur audio']
  if (/HF — récepteurs/.test(f)) {
    const ch = Math.max(1, count(t, /^Sortie XLR/))
    return [round(10 + ch * 8), '≈ 10 W + 8 W par voie de réception']
  }
  if (/HF — antennes/.test(f)) return [round(/combineur|distributeur|spectrum/.test(m) ? 25 : 15), 'distribution HF active']
  if (/Ears/.test(f)) return [round(15 + count(t, /^Entrée/) * 3), 'émetteur de retours ear']
  if (/HF — émetteurs/.test(f)) return [15, 'chargeur / station']
  if (/Monitoring personnel/.test(f)) return [round(/hub|distributeur|p16-d|me-u/.test(m) ? 120 : 15), /hub|distributeur/.test(m) ? 'hub qui alimente les mixeurs personnels' : 'mixeur personnel']
  if (/Switchs/.test(f)) {
    const ports = t.ports.filter((p) => p.signal === 'network').length
    return [round(15 + ports * 1.5), 'switch sans la puissance PoE délivrée (à ajouter selon les appareils alimentés)']
  }
  if (/Accessoires réseau/.test(f)) return [round(/routeur/.test(m) ? 15 : /injecteur/.test(m) ? 35 : 10), 'accessoire réseau']
  if (/Ordinateurs/.test(f)) {
    if (/gpu|station vidéo|4u/.test(m)) return [600, 'ordinateur avec carte graphique, en charge']
    if (/serveur|2u/.test(m)) return [300, 'serveur / PC rack en charge']
    if (/1u|nas/.test(m)) return [200, 'PC / NAS rack 1U en charge']
    if (/tour|bureau/.test(m)) return [250, 'ordinateur de bureau en charge']
    if (/mini|mac mini/.test(m)) return [45, 'mini PC en charge']
    if (/écran|monitor|console kvm/.test(m)) return [35, 'écran']
    if (/kvm/.test(m)) return [15, 'switch KVM']
    return [65, 'ordinateur portable (bloc secteur)']
  }
  if (/Consoles lumière/.test(f)) return [round(kg > 25 ? 300 : kg > 10 ? 150 : 60), 'console lumière, selon sa taille']
  if (/Nodes/.test(f)) return [round(u ? 25 : 10), 'node / splitter DMX']
  if (/Lyres|Barres|Découpes|Strobes/.test(f)) return [round(kg > 30 ? 1000 : kg > 15 ? 500 : kg > 6 ? 250 : 120), 'projecteur, selon sa taille']
  if (/Effets/.test(f)) return [round(kg > 15 ? 1500 : kg > 5 ? 900 : 600), 'machine à fumée : chauffe du bloc (pointe à l’allumage)']
  if (/Gradateurs/.test(f)) return [50, 'électronique du gradateur seule : la charge est celle des projecteurs']
  if (/Sans fil/.test(f)) return [round(/émetteur|box/.test(m) ? 10 : 40), 'charge de la batterie']
  if (/Mélangeurs/.test(f)) return [round(u >= 2 ? 150 : u === 1 ? 80 : kg > 4 ? 60 : 20), 'mélangeur vidéo']
  if (/Grilles|enregistreurs/.test(f)) return [round(/40/.test(m) ? 150 : u ? 40 : 15), 'grille / enregistreur vidéo']
  if (/Convertisseurs/.test(f)) return [round(u ? 40 : 10), 'convertisseur vidéo']
  if (/Caméras PTZ/.test(f)) return [round(/ue150|ue160|crx|x1000|fr7|am7/.test(m) ? 50 : 25), 'caméra PTZ (PoE+ ou bloc)']
  if (/Pupitres PTZ/.test(f)) return [15, 'pupitre de commande']
  if (/^Caméras/.test(f)) return [round(kg > 3 ? 60 : 25), 'caméra']
  if (/Vidéoprojecteurs/.test(f)) return [round(kg > 70 ? 3000 : kg > 40 ? 1800 : 700), 'vidéoprojecteur laser, selon sa classe']
  if (/^LED$/.test(f)) return [round(/dalle|tile/.test(m) ? 180 : /écran/.test(m) ? 120 : u >= 2 ? 150 : 60), 'processeur / écran LED']
  if (/Serveurs média/.test(f)) return [round(u >= 2 ? 400 : 150), 'serveur média / scaler']
  if (/Chargeurs/.test(f)) return [round(u ? 120 : 60), 'chargeur en pleine charge']
  if (/Accessoires de rack/.test(f)) return [round(/ventilation/.test(m) ? 30 : 10), 'accessoire de rack']
  return undefined
}

/** The estimate, when a model has no measured consumption and runs on the mains. */
export function withEstimate(t: DeviceTemplate): DeviceTemplate {
  if (t.watts || t.panel || t.category === 'Énergie' || !t.ports.some((p) => p.signal === 'power' && p.dir === 'in')) return t
  const e = estimateWatts(t)
  if (!e) return t
  const [w, how] = e
  return {
    ...t,
    watts: w,
    wattsEstimated: true,
    specs: [...(t.specs ?? []).filter((s) => !/^Consommation/.test(s.label)), { group: 'Alimentation', label: `Consommation estimée (${how})`, value: `≈ ${w}`, unit: 'W' }],
  }
}
