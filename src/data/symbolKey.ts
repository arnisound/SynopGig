/** Symbol of a model, from its family (and its id for generic models). */
export function symbolKey(t: { family?: string; templateId?: string; id?: string; model?: string; category?: string }): string {
  const f = t.family ?? ''
  const id = t.templateId ?? t.id ?? ''
  const m = (t.model ?? '').toLowerCase()
  // The model says more than its family: a lavalier is not a handheld.
  const byModel: [RegExp, RegExp, string][] = [
    [/./, /chargeur|station de charge|charge \d/, 'charger'],
    [/./, /interface dante|interface audio|ani\d|aniusb|sl di 4/, 'converter'],
    [/./, /point d’accès/, 'wifi'],
    [/./, /micro de surface|micro de table|linéaire/, 'ceiling'],
    [/émetteurs|Conférence/, /émetteur de table|col de cygne/, 'gooseneck'],
    [/./, /pince/, 'mic'],
    [/émetteurs/, /transmitter/, 'plugon'],
    [/Ears/, /récepteur/, 'bodypack'],
    [/Conférence/, /processeur/, 'processor'],
    [/émetteurs|Conférence|Micros/, /cravate|lavalier|\bmke ?[12]\b|\bme ?[24]\b|twinplex tl|wl18|mx15[0]|4061|6060/, 'lavalier'],
    [/émetteurs|Conférence|Micros/, /serre-tête|oreille|headset|headmic|hsp|th53|dh5|beta 5[34]|sm3[15]|4088|6066|mx153|me 3/, 'headset'],
    [/émetteurs|Conférence/, /plug-on/, 'plugon'],
    [/émetteurs|Conférence/, /émetteur main|handheld|skm|ad2|adx2|ulxd2|slxd2|qlxd2|blx2|glxd2|ur2|axt200|mxw2|hha|mth410/, 'handheld'],
    [/émetteurs|Conférence|Ears/, /ceinture|bodypack|\bsk\b|sek/, 'bodypack'],
    [/Ears/, /écouteurs|\bse\d{3}|\bie ?\d/, 'earphones'],
    [/Ears/, /émetteur|psm|\bsr\b|\bsr |adt|p\d+t|m3 \(/, 'iemtx'],
    [/antennes/, /distributeur|splitter|combineur|spectrum|switch/, 'rfrack'],
    [/Conférence/, /plafond|ceiling/, 'ceiling'],
    [/Conférence|Micros/, /col de cygne|pupitre|gooseneck|tablestand/, 'gooseneck'],
    [/Line arrays/, /colonne|column|linea|evox|vxl|lx-|len-|fs-1|ic\d|cbx|ics|\bxlc|\bcs-|axiom/, 'column'],
    [/Lyres beam/, /./, 'beam'],
    [/Barres|PAR/, /barre|bar\b|strip|bar \d|fr10|sixbar/, 'bar'],
    [/Strobes/, /blinder|strike/, 'blinder'],
    [/Monitoring personnel/, /mixeur|me-1|p16-m/, 'personalmixer'],
    [/Monitoring personnel/, /hub|distributeur|me-u|p16-d/, 'switch'],
    [/Nodes/, /splitter|lumisplit|xsp/, 'splitter'],
    [/Multipaire/, /boîte de scène/, 'dropbox'],
    [/Accessoires de rack/, /plaque|passe-câbles|barre de maintien/, 'blank'],
    [/Accessoires de rack/, /lampe|éclairage/, 'lamp'],
    [/Accessoires de rack/, /ventilation/, 'fan'],
    [/Accessoires de rack/, /micros hf/, 'handheld'],
  ]
  for (const [fam, re, key] of byModel) if (fam.test(f) && re.test(m)) return key
  const rules: [RegExp, string][] = [
    [/^Micros/, 'mic'],
    [/^DI$/, 'di'],
    [/^Consoles lumière/, 'lightdesk'],
    [/^Consoles|Conférence/, 'console'],
    [/^Stageboxes/, 'stagebox'],
    [/récepteurs/, 'receiver'],
    [/émetteurs/, 'transmitter'],
    [/Ears/, 'ear'],
    [/antennes/, 'antenna'],
    [/Monitoring personnel/, 'headphones'],
    [/^Amplis/, 'amp'],
    [/^Processeurs|Cartes réseau/, 'processor'],
    [/Line arrays/, 'array'],
    [/^Enceintes/, 'speaker'],
    [/^Subs/, 'sub'],
    [/^Retours/, 'wedge'],
    [/Multipaire/, 'multicore'],
    [/Lyres wash/, 'wash'],
    [/Lyres/, 'movinghead'],
    [/PAR|Sans fil/, 'par'],
    [/Découpes/, 'profile'],
    [/Strobes/, 'strobe'],
    [/Effets/, 'smoke'],
    [/Gradateurs/, 'dimmer'],
    [/Nodes/, 'dmxnode'],
    [/Caméras PTZ/, 'ptz'],
    [/Pupitres PTZ/, 'ptzdesk'],
    [/^Caméras/, 'camera'],
    [/Vidéoprojecteurs/, 'projector'],
    [/^LED$/, 'led'],
    [/Mélangeurs/, 'videomixer'],
    [/Grilles|enregistreurs/, 'recorder'],
    [/Convertisseurs/, 'converter'],
    [/Serveurs média/, 'server'],
    [/Ordinateurs/, /portable|ordinateur|mini pc|tour|écran/i.test(m) ? 'computer' : 'server'],
    [/Switchs/, 'switch'],
    [/Accessoires réseau/, /wi-?fi|point d’accès/i.test(m) ? 'wifi' : 'converter'],
    [/Distribution|Conditionneurs/, 'power'],
    [/Onduleurs/, 'ups'],
    [/Chargeurs/, 'charger'],
    [/Bandeaux/, 'panel'],
    [/Accessoires de rack/, 'drawer'],
  ]
  for (const [re, key] of rules) if (re.test(f)) return key
  // Generic models without a family.
  const byId: Record<string, string> = { mic: 'mic', di: 'di', laptop: 'computer', 'switch-8': 'switch', camera: 'camera', projector: 'projector', screen: 'led' }
  if (byId[id]) return byId[id]
  const byCategory: Record<string, string> = { Son: 'speaker', Lumière: 'par', Vidéo: 'camera', Réseau: 'switch', Énergie: 'power', Câblage: 'panel' }
  return byCategory[t.category ?? ''] ?? 'box'
}
