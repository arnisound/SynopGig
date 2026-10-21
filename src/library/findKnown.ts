import type { DeviceTemplate } from '../types'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** "Rio1608-D2 (stagebox)" matches "RIO1608D2", "Rio 1608-D2"…: a space or dash may sit anywhere. */
function modelPattern(model: string) {
  const alnum = model.replace(/\(.*?\)/g, '').replace(/[^\p{L}\p{N}]/gu, '')
  // Too short or generic ("X8", "Bandeau") would match anything.
  if (alnum.length < 4 || !/\d/.test(alnum)) return undefined
  return new RegExp(`(?<![\\p{L}\\p{N}])${[...alnum].map(escape).join('[\\s\\-_]?')}(?![\\p{L}\\p{N}])`, 'iu')
}

/**
 * Models of the base, the USER library or "Mes modèles" that the data sheet
 * names (brand and model): instant, no AI needed. Best match first.
 */
export function findKnownModels(text: string, templates: DeviceTemplate[], max = 3): DeviceTemplate[] {
  if (!text.trim()) return []
  const head = text.slice(0, 20000)
  const found: { t: DeviceTemplate; score: number }[] = []
  for (const t of templates) {
    if (t.panel) continue
    const re = modelPattern(t.model)
    if (!re || !re.test(head)) continue
    const brandOk = !t.brand || t.brand === 'Générique' || new RegExp(`\\b${escape(t.brand)}\\b`, 'i').test(head)
    if (!brandOk) continue
    found.push({ t, score: t.model.replace(/\(.*?\)/g, '').length + (t.brand ? 5 : 0) })
  }
  const seen = new Set<string>()
  return found
    .sort((a, b) => b.score - a.score)
    .map((f) => f.t)
    .filter((t) => {
      const key = `${t.brand} ${t.model}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, max)
}
