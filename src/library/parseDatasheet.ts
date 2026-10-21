import type { Category, ConnectorType, PortDirection, SignalType } from '../types'
import type { PortGroup } from './portGroups'

/*
 * Reads a data sheet (text extracted from a PDF or pasted from a web page)
 * and guesses the model and its connectors. Pure heuristics, no network,
 * no paid service: the result is a draft the user checks and corrects.
 *
 * Counts are only read from explicit quantities ("4 x XLR", "16 inputs",
 * "Inputs 1-4", "XLR (2)"): data sheets are full of other numbers (gain,
 * impedance, frequency...) that must never become a number of ports.
 */

export interface Finding extends PortGroup {
  /** Lines of the data sheet the group was read from. */
  evidence: string[]
  /** True when no explicit quantity was found (count defaulted to 1). */
  guessed: boolean
  /** Different quantities were read for the same connector. */
  conflicting: number[]
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
  /** Default direction when the line says nothing. */
  fallback?: PortDirection
  /** The rule is skipped on lines matching this. */
  unless?: RegExp
  /** Generic wording ("mic inputs"): only used when the line names no connector. */
  alone?: boolean
}

const L = (inp: string, out: string, io = inp) => ({ in: inp, out, io })

/** Most specific first: a span of text matched by a rule is not reused by later ones. */
const RULES: Rule[] = [
  { re: /\b(?:xlr[- ]?\/?\s*(?:jack|trs|1\/4\s*["”]?)\s*combo|combo\s*(?:xlr|jack|trs)(?:\s*\/\s*(?:xlr|jack|trs|1\/4\s*["”]?))?|xlr\s*\/\s*(?:jack|trs)|(?:jack|trs)\s*\/\s*xlr|combo)\b/gi, connector: 'xlr-combo', signal: 'audio-analog', label: L('In', 'Out') },
  { re: /\b(?:xlr[- ]?5|5[- ]?(?:pin|pôles?|broches?)\s*xlr|dmx(?:[- ]?512)?)\b/gi, connector: 'xlr5', signal: 'dmx', label: L('DMX in', 'DMX out', 'DMX') },
  { re: /\b(?:xlr[- ]?4|4[- ]?(?:pin|pôles?|broches?)\s*xlr)\b/gi, connector: 'xlr4', signal: 'power', label: L('Alim XLR 4', 'Sortie XLR 4'), fallback: 'in' },
  { re: /\b(?:mini[- ]?xlr|ta[345]f?)\b/gi, connector: 'mini-xlr', signal: 'audio-analog', label: L('Entrée mini-XLR', 'Sortie mini-XLR') },
  { re: /\bantenn(?:a|e)s?\b/gi, connector: 'bnc', signal: 'rf', label: L('Antenne', 'Sortie antenne') },
  { re: /\bword\s*clock\b|\bwclk\b/gi, connector: 'bnc', signal: 'audio-digital', label: L('Word clock in', 'Word clock out') },
  { re: /\bsmpte\s*(?:311|fib(?:er|re))|\blemo\s*3k93\b/gi, connector: 'smpte-fiber', signal: 'video', label: L('Fibre caméra', 'Fibre caméra'), dir: 'io' },
  { re: /\blemo\b/gi, connector: 'lemo3', signal: 'audio-analog', label: L('Entrée Lemo', 'Sortie Lemo'), fallback: 'in' },
  { re: /\bca-?com\b/gi, connector: 'ca-com', signal: 'speaker', label: L('Entrée CA-COM', 'Sortie CA-COM'), fallback: 'out' },
  { re: /\bharting\b/gi, connector: 'harting', signal: 'audio-analog', label: L('Multipaire Harting', 'Multipaire Harting'), dir: 'io' },
  { re: /\bnl8\b/gi, connector: 'speakon8', signal: 'speaker', label: L('Entrée HP', 'Sortie HP'), fallback: 'out' },
  { re: /\b(?:speakon|nl4|nl2)\b/gi, connector: 'speakon', signal: 'speaker', label: L('Entrée HP', 'Sortie HP'), fallback: 'out' },
  { re: /\bbinding\s*posts?\b|\bbornes?\s*(?:hp|haut-parleurs?|banane|à vis)\b/gi, connector: 'binding-post', signal: 'speaker', label: L('Entrée HP', 'Sortie HP'), fallback: 'out' },
  { re: /\b(?:aes50|madi|optocore|twinlane|gigaace|slink|ultranet|avb|dsnake)\b/gi, connector: 'ethercon', signal: 'audio-digital', label: L('Liaison numérique', 'Liaison numérique'), dir: 'io' },
  { re: /\bs\/?pdif\b/gi, connector: 'rca', signal: 'audio-digital', label: L('S/PDIF in', 'S/PDIF out'), unless: /optic|toslink/i },
  { re: /\b(?:toslink|adat|optical\s*(?:in|out|s\/?pdif))\b/gi, connector: 'toslink', signal: 'audio-digital', label: L('Optique in', 'Optique out') },
  { re: /\baes(?:3|\/ebu|-ebu)?\b/gi, connector: 'xlr3', signal: 'audio-digital', label: L('AES in', 'AES out'), unless: /analog|aes50/i },
  { re: /\blc[- ]duplex\b|\blc\s+(?:connectors?|fib(?:er|re))\b/gi, connector: 'lc-fiber', signal: 'network', label: L('Fibre LC', 'Fibre LC'), dir: 'io' },
  { re: /\bsfp(?:\+|28|\b)/gi, connector: 'sfp', signal: 'network', label: L('SFP', 'SFP'), dir: 'io' },
  { re: /\bopticalcon\b|\bfib(?:er|re)s?\b/gi, connector: 'opticalcon', signal: 'network', label: L('Fibre', 'Fibre'), dir: 'io' },
  { re: /\bdante\b/gi, connector: 'ethercon', signal: 'network', label: L('Dante', 'Dante'), dir: 'io' },
  { re: /\bethercon\b/gi, connector: 'ethercon', signal: 'network', label: L('Réseau', 'Réseau'), dir: 'io' },
  { re: /\b(?:rj-?45|ethernet|lan|poe\+*)\b/gi, connector: 'rj45', signal: 'network', label: L('Réseau', 'Réseau'), dir: 'io' },
  { re: /\b(?:12g-|6g-|3g-|hd-)?sdi\b/gi, connector: 'sdi', signal: 'video', label: L('SDI in', 'SDI out') },
  { re: /\bbnc\b/gi, connector: 'sdi', signal: 'video', label: L('BNC in', 'BNC out'), unless: /antenn|word\s*clock|wclk/i },
  { re: /\bhdmi\b/gi, connector: 'hdmi', signal: 'video', label: L('HDMI in', 'HDMI out') },
  { re: /\bdisplay\s*port\b|\bdp\s*1\.[24]\b/gi, connector: 'displayport', signal: 'video', label: L('DisplayPort in', 'DisplayPort out') },
  { re: /\bdvi(?:-[di])?\b/gi, connector: 'dvi', signal: 'video', label: L('DVI in', 'DVI out') },
  { re: /\b(?:vga|hd-?15)\b/gi, connector: 'vga', signal: 'video', label: L('VGA in', 'VGA out') },
  { re: /\bpowercon\s*true\s*1\b|\btrue1\b/gi, connector: 'powercon-true1', signal: 'power', label: L('Secteur', 'Recopie secteur'), fallback: 'in' },
  { re: /\bpowercon\b/gi, connector: 'powercon', signal: 'power', label: L('Secteur', 'Recopie secteur'), fallback: 'in' },
  { re: /\b(?:iec|c14|c13|c20)\b/gi, connector: 'iec', signal: 'power', label: L('Secteur', 'Recopie secteur'), fallback: 'in' },
  { re: /\bmidi\b/gi, connector: 'midi', signal: 'control', label: L('MIDI in', 'MIDI out') },
  { re: /\b(?:db-?9|d-?sub\s*9|rs-?232|rs-?422|rs-?485)\b/gi, connector: 'db9', signal: 'control', label: L('Série', 'Série'), dir: 'io' },
  { re: /\b(?:db-?25|d-?sub\s*25)\b/gi, connector: 'db25', signal: 'audio-analog', label: L('DB25 in', 'DB25 out') },
  { re: /\b(?:gpio|gpi\/o|gpi|tally)\b/gi, connector: 'euroblock', signal: 'control', label: L('GPIO', 'GPIO'), dir: 'io' },
  { re: /\b(?:euroblock|euro-block|phoenix|terminal\s*blocks?|bornier|screw\s*terminals?)\b/gi, connector: 'euroblock', signal: 'audio-analog', label: L('In bornier', 'Out bornier') },
  { re: /\bxlr(?:[- ]?3(?:-\d{2})?)?(?![a-z\d])/gi, connector: 'xlr3', signal: 'audio-analog', label: L('In', 'Out') },
  { re: /\b(?:trs|jack|1\/4\s*["”]?|6[.,]35\s*mm)/gi, connector: 'jack', signal: 'audio-analog', label: L('In jack', 'Out jack'), unless: /3[.,]5\s*mm|mini[- ]?jack/i },
  { re: /\b(?:mini[- ]?jack|3[.,]5\s*mm)\b/gi, connector: 'minijack', signal: 'audio-analog', label: L('In mini-jack', 'Out mini-jack') },
  { re: /\b(?:rca|cinch|phono)\b/gi, connector: 'rca', signal: 'audio-analog', label: L('In RCA', 'Out RCA') },
  { re: /\busb[- ]?c\b|\btype[- ]?c\b/gi, connector: 'usb-c', signal: 'network', label: L('USB-C', 'USB-C'), dir: 'io' },
  { re: /\busb\b/gi, connector: 'usb', signal: 'network', label: L('USB', 'USB'), dir: 'io' },
  { re: /\b(?:mic\s*\/\s*line|mic(?:ro(?:phone)?)?\s+inputs?)\b/gi, connector: 'xlr3', signal: 'audio-analog', label: L('In', 'Out'), alone: true },
]

// Lines describing a measurement, not a connector (gain, impedance, response...).
const MEASURE = /\b(?:gain|impedance|impédance|sensitivity|sensibilité|frequency|fréquence|response|réponse|thd|noise|bruit|dynamic|dynamique|crosstalk|diaphonie|latency|latence|ein|cmrr|spl|level|niveau|range|plage|headroom)\b/i
const PORT_WORDS = '(?:inputs?|outputs?|entrées?|sorties?|ports?|channels?|canaux|voies|connecteurs?|connectors?|sockets?|prises?|embases?)'

/** Explicit quantity around a connector keyword, or undefined. */
function quantity(before: string, keyword: string, after: string): number | undefined {
  const seg = `${before}${keyword}${after}`
  const tries: (RegExpMatchArray | null)[] = [
    // "4 x analog inputs on XLR", "2 × XLR"
    before.match(/(?<![\d.,])(\d{1,3})\s*[x×*]\s*[^\d]{0,40}$/i),
    // "XLR x 4", "XLR (4)"
    after.match(/^[^\d]{0,12}?[x×]\s*(\d{1,3})\b/i) ?? after.match(/^\s*\(\s*[x×]?\s*(\d{1,3})\s*\)/),
    // "Antenne : 2 x BNC"
    after.match(/^\s*:?\s*(\d{1,3})\s*[x×]/i),
    // "16 mic/line inputs (XLR)", "8 sorties XLR"
    seg.match(new RegExp(`(?<![\\d.,])(\\d{1,3})\\s+(?:[a-zà-ÿ/+-]+\\s+){0,4}${PORT_WORDS}\\b`, 'i')),
    // "Inputs: 4", "Sorties : 2 x"
    seg.match(new RegExp(`${PORT_WORDS}\\s*:\\s*(\\d{1,3})(?![\\d.,])(?!\\s*(?:db|hz|khz|v|w|Ω|ohm|%|ms|bits?)\\b)`, 'i')),
  ]
  for (const m of tries) if (m) return Number(m[1])
  // "Inputs 1-4", "Entrées 1 à 8"
  const range = seg.match(new RegExp(`${PORT_WORDS}?\\s*(\\d{1,3})\\s*(?:-|–|à|to)\\s*(\\d{1,3})\\b(?!\\s*(?:db|hz|khz|v|w|Ω|ohm|%|ms|kg|mm)\\b)`, 'i'))
  if (range && Number(range[1]) === 1 && Number(range[2]) > 1) return Number(range[2])
  return undefined
}

function direction(text: string): PortDirection | 'both' | undefined {
  if (/\b(?:in\s*\/\s*out|in\s*&\s*out|i\/o|entrée\s*\/\s*sortie)\b/i.test(text)) return 'both'
  const inp = /\b(?:inputs?|entrées?|in|receive|return|retour)\b/i.test(text)
  const out = /\b(?:outputs?|sorties?|out|thru|through|link|loop|recopie|send|départs?|phones?|headphones?|casques?|monitor(?:ing)?)\b/i.test(text)
  if (inp && !out) return 'in'
  if (out && !inp) return 'out'
  if (inp && out) {
    const i = text.search(/\b(?:inputs?|entrées?|in)\b/i)
    const o = text.search(/\b(?:outputs?|sorties?|out|thru|link|loop)\b/i)
    return i <= o ? 'in' : 'out'
  }
  return undefined
}

function splitLines(text: string) {
  return text
    .replace(/ /g, ' ')
    .split(/\r?\n|•|;|•|\t{2,}/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1 && l.length < 260)
}

interface Hit {
  rule: Rule
  start: number
  end: number
}

/** Connector mentions of a line, most specific rule winning on overlaps. */
function hits(line: string): Hit[] {
  const taken: Hit[] = []
  for (const rule of RULES) {
    if (rule.unless?.test(line) || (rule.alone && taken.length)) continue
    for (const m of line.matchAll(rule.re)) {
      const h = { rule, start: m.index!, end: m.index! + m[0].length }
      if (!taken.some((t) => h.start < t.end && t.start < h.end)) taken.push(h)
    }
  }
  return taken.sort((a, b) => a.start - b.start)
}

const CONNECTOR_TOKENS = /^(?:XLR\d?|RJ-?45|NL\d|SDI|HDMI|USB\d?|IEC|C1[34]|AES\d*|SFP\+?|IP\d{2}|DMX\d*|\d+G|PoE\+*|TRUE1|MADI|AVB|ISO\d*|CE|EN\d*|UL\d*|RS-?\d+|DC\d*|AC\d*|V\d|A\d|TA\d|DB\d+)$/i

function guessModel(text: string, brand?: string): string | undefined {
  if (brand) {
    const re = new RegExp(`${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([A-Z0-9][\\w\\-.+/]{1,24}(?:\\s(?:mk\\s?I{1,3}|MKII|II|III|Plus|Pro|HD|4K|Dante|D\\d?))?)`, 'i')
    const m = text.match(re)
    if (m && !CONNECTOR_TOKENS.test(m[1]) && /\d|[A-Z]{2,}/.test(m[1])) return m[1].trim()
  }
  const freq = new Map<string, { n: number; at: number }>()
  for (const m of text.matchAll(/\b([A-Z][A-Za-z]{0,10}[- ]?\d[\w\-.+]{0,12}|\d{1,4}[A-Z][\w-]{0,8})\b/g)) {
    const tok = m[1]
    if (CONNECTOR_TOKENS.test(tok) || /^\d+(?:k?hz|v|w|db|kg|mm|ms|bit)/i.test(tok)) continue
    const cur = freq.get(tok) ?? { n: 0, at: m.index! }
    freq.set(tok, { n: cur.n + 1, at: cur.at })
  }
  return [...freq.entries()].sort((a, b) => b[1].n - a[1].n || a[1].at - b[1].at)[0]?.[0]
}

function guessBrand(text: string, brands: string[]) {
  let best: { brand: string; n: number; at: number } | undefined
  for (const brand of brands) {
    const re = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const found = [...text.matchAll(re)]
    if (found.length === 0) continue
    const cand = { brand, n: found.length, at: found[0].index! }
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

interface Acc {
  rule: Rule
  dir: PortDirection
  counts: number[]
  evidence: string[]
  /** Named by a real connector word on a line that is not a measurement. */
  solid: boolean
}

/** Most frequent explicit count; on a tie, the smallest (safer than a stray big number). */
function pick(counts: number[]) {
  const freq = new Map<number, number>()
  for (const c of counts) freq.set(c, (freq.get(c) ?? 0) + 1)
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0]
}

export function parseDatasheet(text: string, knownBrands: string[]): ParsedDatasheet {
  const acc = new Map<string, Acc>()
  const twoDante = /secondary|secondaire|redundan|redondan/i.test(text)

  for (const line of splitLines(text)) {
    const found = hits(line)
    const measure = MEASURE.test(line)
    const seenInLine = new Set<string>()
    found.forEach((h, i) => {
      const before = line.slice(i === 0 ? 0 : found[i - 1].end, h.start)
      const after = line.slice(h.end, i + 1 < found.length ? found[i + 1].start : line.length)
      const keyword = line.slice(h.start, h.end)
      const local = direction(`${before}${keyword}${after}`) ?? direction(line)
      const dirs: PortDirection[] = h.rule.dir
        ? [h.rule.dir]
        : local === 'both'
          ? ['in', 'out']
          : [local ?? h.rule.fallback ?? 'in']
      let n = measure ? undefined : quantity(before, keyword, after)
      // Mains lines are full of numbers (100-240 V, 50/60 Hz): only trust "2 x".
      if (h.rule.signal === 'power' && !/(?<![\d.,])\d{1,2}\s*[x×]\s*[^\d]{0,40}$/i.test(before)) n = undefined
      if (h.rule.label.io === 'Dante') n = twoDante ? 2 : 1
      if (n !== undefined && (n < 1 || n > 128)) n = undefined
      for (const dir of dirs) {
        const key = `${h.rule.connector}|${h.rule.signal}|${dir}`
        const cur = acc.get(key) ?? { rule: h.rule, dir, counts: [], evidence: [], solid: false }
        if (!measure && !h.rule.alone) cur.solid = true
        // One count per line and connector: "2 x 1/4" TRS" names the jack twice.
        if (n !== undefined && !seenInLine.has(key)) cur.counts.push(n)
        if (!cur.evidence.includes(line) && cur.evidence.length < 4) cur.evidence.push(line)
        seenInLine.add(key)
        acc.set(key, cur)
      }
    })
  }

  const order: SignalType[] = ['audio-analog', 'audio-digital', 'rf', 'speaker', 'dmx', 'video', 'control', 'network', 'power']
  const groups: Finding[] = [...acc.values()]
    // Generic wording or measurement lines alone never make a port up.
    .filter((a) => a.solid || a.counts.length > 0)
    .map((a) => {
      const chosen = pick(a.counts)
      return {
        prefix: a.rule.label[a.dir],
        count: chosen ?? 1,
        connector: a.rule.connector,
        signal: a.rule.signal,
        dir: a.dir,
        evidence: a.evidence,
        guessed: chosen === undefined,
        conflicting: [...new Set(a.counts)].filter((c) => c !== chosen),
      }
    })
    // A bare "USB" (often a table header) next to a USB-C finding is the same port.
    .filter((g, _, all) => !(g.connector === 'usb' && g.guessed && all.some((o) => o.connector === 'usb-c')))
    .sort((a, b) => order.indexOf(a.signal) - order.indexOf(b.signal) || (a.dir === 'in' ? -1 : 1) - (b.dir === 'in' ? -1 : 1))

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
