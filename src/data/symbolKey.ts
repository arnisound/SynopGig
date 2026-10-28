/** Symbol of a model, from its family (and its id for generic models). */
export function symbolKey(t: { family?: string; templateId?: string; id?: string; model?: string; category?: string }): string {
  const f = t.family ?? ''
  const id = t.templateId ?? t.id ?? ''
  const m = (t.model ?? '').toLowerCase()
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
