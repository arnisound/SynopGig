import { refineSignal } from './connectors'
import type { DeviceTemplate } from '../types'

/*
 * The rules every model of the catalogue follows, the same a technician
 * applies when reading a data sheet. Run by catalog.test.ts.
 */

/** Things that run without mains: passive gear, batteries, PoE, cables and adapters. */
const NO_MAINS = /passi|batterie|accu|pile|câble|cable|éclaté|adaptateur|boîte de scène|boîtier|touret|module sfp|carte|antenne|émetteur|écouteurs|ceinture|in-ear|micro|serre-tête|cravate|pince/i
/** A port that brings the power itself. */
const FED = /poe|alimenté|alimentation/i

export function auditTemplate(t: DeviceTemplate): string[] {
  const out: string[] = []
  const ids = new Set<string>()
  for (const p of t.ports) {
    if (ids.has(p.id)) out.push(`port en double : ${p.id}`)
    ids.add(p.id)
    if (refineSignal(p) !== p.signal) out.push(`« ${p.label} » : signal ${refineSignal(p)}, pas ${p.signal}`)
    if (/casque|phones/i.test(p.label) && /\b[LR]$/.test(p.label)) out.push(`« ${p.label} » : un casque, c’est une prise stéréo`)
  }
  // A stereo pair is complete: every L has its R.
  for (const p of t.ports) {
    const m = /^(.*\S)\s+L$/.exec(p.label)
    if (m && !t.ports.some((q) => q.label === `${m[1]} R`)) out.push(`« ${p.label} » sans son R`)
  }
  // An analogue mixer has a stereo main output on XLR.
  if (t.family === 'Consoles' && /analogique/i.test(t.model)) {
    const main = t.ports.filter((p) => p.dir === 'out' && /^main [LR]$/i.test(p.label))
    if (main.length !== 2 || main.some((p) => p.connector !== 'xlr3')) out.push('sortie principale stéréo XLR (Main L / Main R) manquante')
  }
  const power = t.ports.filter((p) => p.signal === 'power' && p.dir === 'in')
  // A second mains inlet is the redundant one, or numbered.
  if (!t.panel && power.length > 1 && !power.slice(1).every((p) => /\d|redond|secours|extern|A$|B$/i.test(p.label))) out.push('plusieurs entrées secteur non nommées')
  const active = t.ports.some((p) => p.signal !== 'speaker' && p.signal !== 'rf' && p.signal !== 'power' && (p.dir === 'out' || p.dir === 'io') && p.signal !== 'audio-analog')
  if (!t.panel && power.length === 0 && active && !t.ports.some((p) => FED.test(p.label)) && !NO_MAINS.test(`${t.model} ${t.family ?? ''}`)) out.push('aucune alimentation')
  // The product sheet, as the AI reading builds it.
  if (!t.panel && !t.description) out.push('pas de description')
  if (!t.panel && !t.specs?.length) out.push('pas de caractéristiques')
  return out
}

export const auditCatalog = (list: DeviceTemplate[]) =>
  list.map((t) => ({ t, problems: auditTemplate(t) })).filter((r) => r.problems.length > 0)
