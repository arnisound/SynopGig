import type { Category, ConnectorType, PortDirection, SignalType } from '../types'
import type { PortGroup } from './portGroups'

/*
 * Reads a data sheet (text extracted from a PDF or pasted from a web page)
 * and guesses the model and its connectors. Pure heuristics, no network,
 * no paid service: the result is a draft the user checks and corrects.
 */

export interface Finding extends PortGroup {
  /** The line of the data sheet the group was read from. */
  evidence: string
}

export interface ParsedDatasheet {
  brand?: string
  model?: string
  category: Category
  family?: string
  rackU?: number
  weight?: number
  groups: Finding[]
}

interface Rule {
  re: RegExp
  connector: ConnectorType
  signal: SignalType
  label: { in: string; out: string; io: string }
  /** Forces the direction (network ports are bidirectional). */
  dir?: PortDirection
  /** The rule is skipped on lines matching this. */
  unless?: RegExp
}

const L = (inp: string, out: string, io = inp) => ({ in: inp, out, io })

/** Most specific first: the first rule matching a line wins. */
const RULES: Rule[] = [
  { re: /\b(?:xlr[- ]?5|5[- ]?(?:pin|pôles?|broches?)\s*xlr|dmx(?:[- ]?512)?)\b/i, connector: 'xlr5', signal: 'dmx', label: L('DMX in', 'DMX out', 'DMX') },
  { re: /\bantenn(?:a|e)s?\b/i, connector: 'bnc', signal: 'rf', label: L('Antenne', 'Sortie antenne') },
  { re: /\bnl8\b/i, connector: 'speakon8', signal: 'speaker', label: L('Entrée HP', 'Sortie HP') },
  { re: /\b(?:speakon|nl4|nl2)\b/i, connector: 'speakon', signal: 'speaker', label: L('Entrée HP', 'Sortie HP') },
  { re: /\b(?:aes50|madi|optocore|twinlane|gigaace|slink|ultranet|avb)\b/i, connector: 'ethercon', signal: 'audio-digital', label: L('Liaison numérique', 'Liaison numérique'), dir: 'io' },
  // "Analog / AES inputs" are analog XLR inputs that also accept AES.
  { re: /\baes(?:3|\/ebu|-ebu)?\b/i, connector: 'xlr3', signal: 'audio-digital', label: L('AES in', 'AES out'), unless: /analog/i },
  { re: /\b(?:opticalcon|sfp\+?|fib(?:er|re))\b/i, connector: 'opticalcon', signal: 'network', label: L('Fibre', 'Fibre'), dir: 'io' },
  { re: /\bdante\b/i, connector: 'ethercon', signal: 'network', label: L('Dante', 'Dante'), dir: 'io' },
  { re: /\bethercon\b/i, connector: 'ethercon', signal: 'network', label: L('Réseau', 'Réseau'), dir: 'io' },
  { re: /\b(?:rj-?45|ethernet|lan|poe\+*)\b/i, connector: 'rj45', signal: 'network', label: L('Réseau', 'Réseau'), dir: 'io' },
  { re: /\b(?:12g-|6g-|3g-|hd-)?sdi\b/i, connector: 'sdi', signal: 'video', label: L('SDI in', 'SDI out') },
  { re: /\bhdmi\b/i, connector: 'hdmi', signal: 'video', label: L('HDMI in', 'HDMI out') },
  { re: /\bpowercon\s*true\s*1\b|\btrue1\b/i, connector: 'powercon-true1', signal: 'power', label: L('Secteur', 'Recopie secteur') },
  { re: /\bpowercon\b/i, connector: 'powercon', signal: 'power', label: L('Secteur', 'Recopie secteur') },
  { re: /\b(?:iec|c14|c13|c20)\b/i, connector: 'iec', signal: 'power', label: L('Secteur', 'Recopie secteur') },
  { re: /\bxlr(?![a-z])|\b(?:mic\s*\/\s*line|mic(?:ro(?:phone)?)?\s+inputs?|combo)\b/i, connector: 'xlr3', signal: 'audio-analog', label: L('In', 'Out') },
  { re: /\b(?:trs|jack|1\/4\s*["”]?|6[.,]35)\b/i, connector: 'jack', signal: 'audio-analog', label: L('In jack', 'Out jack') },
  { re: /\busb\b/i, connector: 'usb', signal: 'network', label: L('USB', 'USB'), dir: 'io' },
]

// Numbers followed by one of these are measures, not port counts.
const UNIT = /^\s*(?:[.,]\d+)?\s*(?:k?hz|v\b|vac|w\b|watts?|db|dbu|kg|lbs?|mm|cm|ms|bits?|Ω|ohms?|%|m\b|a\b|va\b|°|u\b|ru\b|he\b|"|”|inch|pouces?|mbps|gbps|gb\b)/i

function count(line: string, at: number): number {
  const nums = [...line.matchAll(/(?<![\d.,])(\d{1,3})(?![\d])/g)]
    .filter((m) => !UNIT.test(line.slice(m.index! + m[0].length)))
    .filter((m) => !/[a-z]\s*$/i.test(line.slice(Math.max(0, m.index! - 1), m.index!)) || /[x×]\s*$/i.test(line.slice(0, m.index!)))
  if (nums.length === 0) return 1
  // The number closest before the connector keyword, else the first one.
  const before = nums.filter((m) => m.index! < at).pop()
  const n = Number((before ?? nums[0])[1])
  return n >= 1 && n <= 128 ? n : 1
}

function direction(line: string): PortDirection | undefined {
  const inp = /\b(?:inputs?|entrées?|in|receive|return|retour)\b/i.test(line)
  const out = /\b(?:outputs?|sorties?|out|thru|through|link|loop|recopie|send|départs?)\b/i.test(line)
  if (inp && !out) return 'in'
  if (out && !inp) return 'out'
  if (inp && out) {
    // "Input / Link": both on one line, the first word usually describes the port.
    const i = line.search(/\b(?:inputs?|entrées?|in)\b/i)
    const o = line.search(/\b(?:outputs?|sorties?|out|thru|link|loop)\b/i)
    return i <= o ? 'in' : 'out'
  }
  return undefined
}

function splitLines(text: string) {
  return text
    .replace(/ /g, ' ')
    .split(/\r?\n|•|;|•|\t{2,}/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1 && l.length < 220)
}

const CONNECTOR_TOKENS = /^(?:XLR\d?|RJ-?45|NL\d|SDI|HDMI|USB\d?|IEC|C1[34]|AES\d*|SFP\+?|IP\d{2}|DMX\d*|\d+G|PoE\+*|TRUE1|MADI|AVB|ISO\d*|CE|EN\d*|UL\d*|RS-?\d+|DC\d*|AC\d*|V\d|A\d)$/i

function guessModel(text: string, brand?: string): string | undefined {
  if (brand) {
    const re = new RegExp(`${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([A-Z0-9][\\w\\-.+/]{1,24}(?:\\s(?:mk\\s?I{1,3}|MKII|II|III|Plus|Pro|HD|4K|Dante|D\\d?))?)`, 'i')
    const m = text.match(re)
    if (m && !CONNECTOR_TOKENS.test(m[1]) && /\d|[A-Z]{2,}/.test(m[1])) return m[1].trim()
  }
  const freq = new Map<string, { n: number; at: number }>()
  for (const m of text.matchAll(/\b([A-Z][A-Za-z]{0,10}[- ]?\d[\w\-.+]{0,12}|\d{1,4}[A-Z][\w-]{0,8})\b/g)) {
    const tok = m[1]
    if (CONNECTOR_TOKENS.test(tok) || UNIT.test(tok.replace(/^\d+/, ''))) continue
    const cur = freq.get(tok) ?? { n: 0, at: m.index! }
    freq.set(tok, { n: cur.n + 1, at: cur.at })
  }
  return [...freq.entries()].sort((a, b) => b[1].n - a[1].n || a[1].at - b[1].at)[0]?.[0]
}

function guessBrand(text: string, brands: string[]) {
  let best: { brand: string; n: number; at: number } | undefined
  for (const brand of brands) {
    const re = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const hits = [...text.matchAll(re)]
    if (hits.length === 0) continue
    const cand = { brand, n: hits.length, at: hits[0].index! }
    if (!best || cand.n > best.n || (cand.n === best.n && cand.at < best.at)) best = cand
  }
  return best?.brand
}

function guessCategory(groups: PortGroup[]): { category: Category; family?: string } {
  const has = (s: SignalType, d?: PortDirection) => groups.some((g) => g.signal === s && (!d || g.dir === d))
  if (has('dmx')) return { category: 'Lumière' }
  if (has('speaker', 'out')) return { category: 'Son', family: 'Amplis' }
  if (has('speaker', 'in')) return { category: 'Son', family: 'Enceintes' }
  if (has('rf', 'in') && has('audio-analog', 'out')) return { category: 'Son', family: 'HF — récepteurs' }
  if (has('rf', 'out')) return { category: 'Son', family: 'Ears (in-ear)' }
  const video = groups.filter((g) => g.signal === 'video')
  if (video.length) {
    const inputs = video.filter((g) => g.dir === 'in').reduce((s, g) => s + g.count, 0)
    return { category: 'Vidéo', family: inputs >= 4 ? 'Mélangeurs' : undefined }
  }
  const others = groups.filter((g) => g.signal !== 'power')
  if (others.length && others.every((g) => g.signal === 'network')) {
    const n = others.reduce((s, g) => s + g.count, 0)
    return { category: 'Réseau', family: n >= 5 ? 'Switchs' : undefined }
  }
  const audioIn = groups.filter((g) => g.signal === 'audio-analog' && g.dir === 'in').reduce((s, g) => s + g.count, 0)
  if (audioIn >= 8) return { category: 'Son', family: has('network') || has('audio-digital') ? 'Stageboxes & moteurs' : 'Consoles' }
  return { category: 'Son' }
}

export function parseDatasheet(text: string, knownBrands: string[]): ParsedDatasheet {
  const lines = splitLines(text)
  const found = new Map<string, Finding>()

  for (const line of lines) {
    const rule = RULES.find((r) => r.re.test(line) && !r.unless?.test(line))
    if (!rule) continue
    const at = line.search(rule.re)
    let dir = rule.dir ?? direction(line) ?? (rule.signal === 'power' ? 'in' : rule.signal === 'speaker' ? 'out' : 'in')
    if (rule.signal === 'rf' && /\b(?:out(?:put)?|sortie|cascade)\b/i.test(line) && !/\binputs?\b/i.test(line)) dir = 'out'
    // Mains lines are full of numbers (100-240 V, 50/60 Hz): only trust "2 x".
    const explicit = line.match(/(?<![\d.,])(\d{1,2})\s*[x×]\s/i)
    let n = rule.signal === 'power' ? (explicit ? Number(explicit[1]) : 1) : count(line, at)
    if (rule.label.io === 'Dante') n = /secondary|secondaire|redundan|redondan/i.test(text) ? 2 : 1
    const prefix = rule.label[dir]
    const key = `${rule.connector}|${rule.signal}|${dir}`
    const cur = found.get(key)
    if (!cur || n > cur.count) found.set(key, { prefix, count: n, connector: rule.connector, signal: rule.signal, dir, evidence: line })
  }

  const order: SignalType[] = ['audio-analog', 'audio-digital', 'rf', 'speaker', 'dmx', 'video', 'network', 'power']
  const groups = [...found.values()].sort(
    (a, b) => order.indexOf(a.signal) - order.indexOf(b.signal) || (a.dir === 'in' ? -1 : 1) - (b.dir === 'in' ? -1 : 1),
  )

  const rack = text.match(/\b(\d)\s*(?:u|ru|he)\b(?!\w)/i) ?? text.match(/rack\s*units?\s*:?\s*(\d)/i)
  const kg = text.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)
  const lb = text.match(/(\d+(?:[.,]\d+)?)\s*(?:lb|lbs)\b/i)
  const weight = kg ? Number(kg[1].replace(',', '.')) : lb ? Math.round((Number(lb[1].replace(',', '.')) / 2.205) * 10) / 10 : undefined

  const brand = guessBrand(text, knownBrands)
  return {
    brand,
    model: guessModel(text, brand),
    ...guessCategory(groups),
    rackU: rack ? Number(rack[1]) || undefined : undefined,
    weight,
    groups,
  }
}
