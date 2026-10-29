import { CONNECTORS, SIGNALS } from '../data/connectors'
import { FAMILY_ORDER } from '../data/library'
import type { Category, ConnectorType, PortDirection, SignalType, Spec } from '../types'
import type { PortGroup } from './portGroups'

/*
 * Data sheet reading with a language model, free and with nothing to set up
 * for the public. The app picks the first engine available:
 * 1. the user's own Gemini key, if they chose to add one (advanced option);
 * 2. the SynopGig relay: a small free Cloudflare Worker holding the site
 *    owner's Groq or Gemini key (configured once, see worker/README.md);
 *    works in every browser and answers in a couple of seconds;
 * 3. the AI built into Chrome desktop (Gemini Nano), only if the user turns
 *    it on: free and offline but slow.
 * Only the useful lines of the sheet are sent, which keeps answers fast.
 * Every answer is checked again here before use.
 */

/** Fast and generous free tier; thinking is turned off in the request. */
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-lite'

/** The SynopGig relay (worker/relay.js), wherever the app is hosted. */
export const DEFAULT_AI_PROXY_URL = 'https://synopgig-ia.arnisound-tools.workers.dev'

/** VITE_AI_PROXY_URL overrides the relay at build time; "off" disables it. */
const proxyFromEnv = import.meta.env.VITE_AI_PROXY_URL
export const AI_PROXY_URL: string = proxyFromEnv === 'off' ? '' : proxyFromEnv || DEFAULT_AI_PROXY_URL

export type Engine = 'personal' | 'relay' | 'chrome'

export const ENGINE_LABELS: Record<Engine, string> = {
  personal: 'votre clé Gemini',
  relay: 'l’IA SynopGig',
  chrome: 'l’IA intégrée à Chrome',
}

export interface AiGroup extends PortGroup {
  /** Passage of the sheet the model read the group from. */
  quote?: string
  /** What a technician's rule corrected or added, shown with the row. */
  note?: string
}

export interface AiResult {
  brand?: string
  model?: string
  category: Category
  family?: string
  rackU?: number
  weight?: number
  groups: AiGroup[]
  description?: string
  specs?: Spec[]
  /** A second, independent reading of the same sheet (relay), to compare with. */
  second?: AiGroup[]
  /** Services that answered, e.g. "Gemini + Groq". */
  by?: string
  /** Pages the AI read on the web, when it researched the product itself. */
  sources?: { url: string; title: string }[]
  /** What was sent and what came back, word for word: the analysis report. */
  trace?: { sent?: string; geminiChars?: number; images?: number; answers: { engine?: string; raw?: string }[] }
}

const CATEGORIES: Category[] = ['Son', 'Lumière', 'Vidéo', 'Réseau', 'Énergie', 'Autre']
const DIRS: PortDirection[] = ['in', 'out', 'io']

export const SYSTEM_PROMPT = `You are a live sound, lighting and video technician. You receive extracts of the data sheet or manual of ONE device. List its PHYSICAL connectors (front and rear panels) with their exact count, as a technician patching it would see them.
Method:
1. If a "Device:" line names the device, describe only that one: the sheet may cover several models, versions or optional cards. Keep the standard version.
2. Read the connection sections (rear panel, front panel, connections, inputs / outputs, technical data) and count each connector.
3. For every group, copy into "quote" the short passage of the sheet (at most 100 characters, its exact words) that shows the connector and its count.
Counting:
- One group = one connector type, one signal, one direction. "16 XLR mic inputs" gives count 16. "Inputs 1-8" gives 8. "2 x NL4" gives 2.
- Per channel connectors are multiplied: "4 channels, each with XLR input and XLR link output" gives XLR in x4 and XLR out x4.
- Link, thru and loop outputs are their own output group.
- A connector described both in a table and in a panel description is counted once.
- If the count is really not written, use 1.
- Never invent. Leave out options and expansion cards that are not fitted, accessories, compatible formats, wireless links, internal buses and network audio channels ("64 Dante channels" on two ports is 2 connectors, not 64).
- Ignore every measurement (gain, impedance, frequency response, level, noise).
- Channel counts are not connectors: "16 x 12 I/O", "2 x 2 USB audio interface", "64 x 64 Dante" describe channels; a "2 x 2 USB interface" is 1 USB port.
- Mixers: mic inputs, line inputs, main outputs, aux / FX / monitor sends, subgroups, matrix, control room, headphones, insert and footswitch jacks are each physical connectors when the sheet gives their count ("4 subgroups" = 4 outputs).
- Stereo inputs and outputs: L and R on two jacks, two XLR or two RCA count 2 connectors per stereo input; a single TRS or mini-jack stereo socket counts 1. A stereo RCA input is "rca" x2.
- Bluetooth, Wi-Fi and apps are not connectors.
- Per channel inputs: "Inputs 1-8: XLR / 1/4" TRS combo" is xlr-combo x8. "Inputs 9-12: XLR or dual 1/4" TRS" is xlr3 x4 and jack x8 (each channel has one XLR and two jacks).
- A footswitch socket is a "jack" input with signal "control". A monitor or control room output pair on jacks is jack x2.
- Line-level outputs (main, aux, subgroup, monitor, matrix) carry "audio-analog", never "speaker": "speaker" is only for amplifier outputs to loudspeakers.
- Read like a technician: balanced main outputs are XLR unless a jack is named; the main output of a mixer is stereo (L and R = 2); a mixer with stereo inputs has a stereo main output; a stereo line input or output on jacks, RCA or XLR is two sockets (L and R): "stereo inputs 5/6 and 7/8" are 4 jacks (5L, 6R, 7L, 8R).
- But one socket carries stereo by itself: a headphone output is ONE stereo TRS jack (or mini-jack) per headphone output; a footswitch, an insert or a mini-jack input is one socket.
- Power: "DC in", "12 V", an external power supply or adapter is "dc"; a mains inlet (100-240 V, IEC) is "iec"; "USB powered" is the USB port itself, not a separate power input.
- A sheet may be wrong or mixed with another product (web pages often are): when a section clearly describes another kind of device (e.g. loudspeaker data on a mixer page), ignore it, weight and size included.
Types:
- Ethernet, Dante, AES67, AVB and USB ports are "io". etherCON is "ethercon", a plain RJ45 is "rj45". Primary + secondary Dante = 2 ports.
- Network ports: say what they carry when the sheet does: "dante" (Dante, AES67), "avb" (AVB, Milan), "artnet" (Art-Net, sACN), "ndi" (NDI, SMPTE 2110), "control-ip" (remote control, OSC, app); otherwise "network". AES50, Optocore, SuperMAC, Ultranet and other console-to-stagebox links are "audio-link". Word clock and timecode are "sync".
- Mains power is an input with signal "power" (IEC, powerCON, powerCON TRUE1...). A mains link output is an output with signal "power".
- An XLR/jack combo is "xlr-combo". A headphone output is a "jack" or "minijack" output. Speaker outputs (Speakon, binding posts, terminal blocks) use signal "speaker".
- label: short French name, e.g. "Entrée", "Sortie", "Link", "Sortie HP", "Dante", "Secteur", "Casque".
When pictures of the panel pages come with the text, read the drawings too: every socket drawn on the front or rear panel is a connector, with its printed label; trust the drawing over a summary.
Also give brand, model, category, family, rackU (height in rack units, only for 19 inch rack devices) and weight in kg, when written.
description: one or two sentences in French saying what the device is and what it is for (no marketing).
specs: its main characteristics as written, with French labels, the value and the unit apart, grouped: "Physique" (Dimensions H × L × P, Poids), "Alimentation" (Tension, Consommation, Puissance), then "Audio", "Vidéo", "Lumière" or "Réseau" (e.g. Réponse en fréquence, SPL max, Puissance par canal, Impédance, Latence, Résolution, Flux lumineux). Only what the sources say.
Connector codes: ${Object.entries(CONNECTORS).map(([k, v]) => `${k} = ${v}`).join('; ')}.
Signal codes: ${Object.entries(SIGNALS).map(([k, v]) => `${k} = ${v.label}`).join('; ')}.
Departments (category): ${CATEGORIES.join(', ')}.
Families (family, pick one if it fits): ${FAMILY_ORDER.join(', ')}.`

/** JSON schema of the answer (Gemini response schema, Chrome response constraint). */
export const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    brand: { type: 'string' },
    model: { type: 'string' },
    category: { type: 'string', enum: CATEGORIES },
    family: { type: 'string' },
    rackU: { type: 'integer' },
    weight: { type: 'number' },
    description: { type: 'string' },
    specs: {
      type: 'array',
      items: {
        type: 'object',
        properties: { group: { type: 'string' }, label: { type: 'string' }, value: { type: 'string' }, unit: { type: 'string' } },
        required: ['group', 'label', 'value', 'unit'],
      },
    },
    ports: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          count: { type: 'integer' },
          connector: { type: 'string', enum: Object.keys(CONNECTORS) },
          signal: { type: 'string', enum: Object.keys(SIGNALS) },
          dir: { type: 'string', enum: DIRS },
          quote: { type: 'string' },
        },
        required: ['label', 'count', 'connector', 'signal', 'dir', 'quote'],
      },
    },
  },
  required: ['model', 'category', 'ports'],
}

const SPEAKER_SOCKETS = new Set<ConnectorType>(['speakon', 'speakon8', 'binding-post', 'euroblock', 'ca-com', 'jack', 'harting'])

const CONNECTOR_BY_LABEL = new Map(Object.entries(CONNECTORS).map(([k, v]) => [v.toLowerCase(), k as ConnectorType]))

/** Never trust model output: keep only known codes and sane numbers. */
export function sanitizeAi(raw: unknown): AiResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  // eslint-disable-next-line no-control-regex -- strips control characters on purpose
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '')
  const ports = Array.isArray(r.ports) ? r.ports : []
  const groups: AiGroup[] = []
  for (const p of ports) {
    if (!p || typeof p !== 'object') continue
    const q = p as Record<string, unknown>
    const c = str(q.connector, 40)
    const connector = (Object.hasOwn(CONNECTORS, c) ? c : CONNECTOR_BY_LABEL.get(c.toLowerCase())) as ConnectorType | undefined
    let signal = (Object.hasOwn(SIGNALS, str(q.signal, 20)) ? q.signal : undefined) as SignalType | undefined
    if (!connector || !signal) continue
    const dir = DIRS.includes(q.dir as PortDirection) ? (q.dir as PortDirection) : 'in'
    // Loudspeaker power never travels on XLR, RCA, mini-jack or USB: that is a line output.
    if (signal === 'speaker' && !SPEAKER_SOCKETS.has(connector)) signal = 'audio-analog'
    const count = Math.max(1, Math.min(256, Math.round(Number(q.count) || 1)))
    const quote = str(q.quote, 160) || undefined
    // The same connector given twice (spec table, then panel description): kept once.
    const twin = groups.find((g) => g.connector === connector && g.signal === signal && g.dir === dir && (g.count === count || (!!quote && words(g.quote ?? '') === words(quote))))
    if (twin) {
      twin.count = Math.max(twin.count, count)
      continue
    }
    groups.push({ prefix: str(q.label, 40) || CONNECTORS[connector], count, connector, signal, dir, ...(quote ? { quote } : {}) })
  }
  const num = (v: unknown, max: number) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 && n <= max ? n : undefined
  }
  const rack = num(r.rackU, 48)
  return technicianRules({
    brand: str(r.brand, 40) || undefined,
    model: str(r.model, 80) || undefined,
    category: CATEGORIES.includes(r.category as Category) ? (r.category as Category) : 'Son',
    family: str(r.family, 60) || undefined,
    rackU: rack && Math.round(rack),
    weight: num(r.weight, 2000),
    groups,
    description: str(r.description, 400) || undefined,
    specs: (Array.isArray(r.specs) ? r.specs : [])
      .slice(0, 30)
      .map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {}))
      .map((x) => ({ group: str(x.group, 40) || 'Autres', label: str(x.label, 60), value: str(x.value, 80), unit: str(x.unit, 20) || undefined }))
      .filter((x) => x.label && x.value),
  })
}

/*
 * What any sound technician knows, applied after the AI: it corrects the
 * beginner's mistakes a model still makes, and says so on the row.
 */
const STEREO = /st[ée]r[ée]o|\bdual\b|\bl\s*[/&-]\s*r\b|left\s*(?:\/|and|&)\s*right|gauche\s*(?:\/|et)\s*droite/i
const MAIN = /\bmain\b|\bmaster\b|\bsum\b|principale?s?|\bl\s*\/\s*r\b/i
const JACK_WORDS = /\btrs\b|\bjack\b|1\/4|6[.,]35|klinke/i

export function technicianRules(r: AiResult): AiResult {
  const isMixer = r.category === 'Son' && (/console|m[ée]lang|mix/i.test(r.family ?? '') || r.groups.some((g) => g.dir === 'out' && MAIN.test(`${g.prefix} ${g.quote ?? ''}`)))
  const groups = r.groups.map((g) => {
    const said = `${g.prefix} ${g.quote ?? ''}`
    const notes: string[] = []
    let { count, connector } = g
    // Balanced main outputs of a mixer are XLR, unless the sheet names a jack.
    if (isMixer && g.dir === 'out' && MAIN.test(said) && /balanced|sym[ée]tri/i.test(said) && !JACK_WORDS.test(g.quote ?? '') && connector !== 'xlr3') {
      connector = 'xlr3'
      notes.push('sortie principale symétrique : XLR')
    }
    // The main output of a mixer is stereo: L and R.
    if (isMixer && g.dir === 'out' && MAIN.test(said) && !/mono/i.test(said) && count === 1 && connector !== 'minijack') {
      count = 2
      notes.push('sortie principale stéréo : L et R')
    }
    // An external power supply is a DC input, not USB (unless the sheet says USB powered).
    if (g.signal === 'power' && (connector === 'usb' || connector === 'usb-c') && /\bdc\b|adapt|power supply|alimentation externe|netzteil|\b\d+\s*v\b/i.test(g.quote ?? '') && !/usb/i.test(g.quote ?? '')) {
      connector = 'dc'
      notes.push('alimentation externe : entrée DC')
    }
    // One socket carries stereo by itself: headphones, footswitch, insert.
    const oneSocket = /phone|casque|kopfh|footswitch|p[ée]dal|insert|send\s*\/\s*return/i.test(said)
    if (oneSocket && /phone|casque|kopfh/i.test(said) && count === 2 && !quoteHasCount(g.quote ?? '', 2)) {
      count = 1
      notes.push('casque : une prise stéréo')
    }
    // Stereo line inputs numbered by their L channel ("5L / 7L"): the R ones are there too.
    if (!oneSocket && g.dir === 'in' && connector === 'jack' && /\b\d+\s*L\b/i.test(said) && !/\b\d+\s*R\b/i.test(said)) {
      count *= 2
      notes.push(`entrées stéréo : L et R, ${count} jacks`)
    } else if (!oneSocket && STEREO.test(said) && !/mono/i.test(said) && (connector === 'jack' || connector === 'rca' || connector === 'xlr3')) {
      // A stereo input or output on separate sockets (jack, RCA, XLR) takes two: L and R.
      const perStereo = new RegExp(`\\b${count}\\s*(?:x\\s*)?(?:${STEREO.source})`, 'i').test(g.quote ?? '') || count % 2 === 1
      if (perStereo) {
        count *= 2
        notes.push(`stéréo : L et R, ${count} prises`)
      }
    }
    return notes.length ? { ...g, count, connector, note: notes.join(' · ') } : g
  })
  // A mixer always has a main stereo output: when the reading has none, it is added, to check.
  if (isMixer && !groups.some((g) => g.dir === 'out' && MAIN.test(`${g.prefix} ${g.quote ?? ''}`)) && groups.some((g) => g.dir === 'in' && g.signal === 'audio-analog')) {
    groups.push({ prefix: 'Sortie principale', count: 2, connector: 'xlr3', signal: 'audio-analog', dir: 'out', note: 'déduite : une console a toujours une sortie principale stéréo' })
  }
  return { ...r, groups }
}

// ---- Checking an answer against the sheet

/** Lower case, no accents, words only: for comparing passages. */
const words = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10, twelve: 12, sixteen: 16, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, huit: 8, douze: 12, seize: 16, zwei: 2, vier: 4, acht: 8, dual: 2, quad: 4, single: 1 }

/** Can this passage justify that count? A number, a range, a word or a product (4 channels x 2). */
export function quoteHasCount(quote: string, count: number) {
  if (count <= 1) return true
  const q = quote.toLowerCase()
  const nums = [...q.matchAll(/\d+/g)].map((m) => Number(m[0]))
  for (const w of words(q).split(' ')) if (NUMBER_WORDS[w]) nums.push(NUMBER_WORDS[w])
  if (nums.includes(count)) return true
  for (const m of q.matchAll(/(\d+)\s*(?:-|–|to|à|bis)\s*(\d+)/g)) if (Number(m[2]) - Number(m[1]) + 1 === count) return true
  return nums.some((a, i) => nums.some((b, j) => i !== j && a * b === count))
}

/** Is the passage really in the sheet? Exact, or nearly all its words. */
export function quoteInSheet(quote: string, sheet: string) {
  const q = words(quote)
  if (!q) return false
  const all = words(sheet)
  if (all.includes(q)) return true
  const known = new Set(all.split(' '))
  const list = q.split(' ').filter((w) => w.length > 1)
  return list.length > 0 && list.filter((w) => known.has(w)).length / list.length >= 0.85
}

export interface CheckedGroup extends AiGroup {
  /** Why the row needs a look; empty when the sheet confirms it. */
  doubts: string[]
}

/** Connectors two readings may name differently for the same socket. */
const FAMILY: Partial<Record<ConnectorType, string>> = {
  xlr3: 'xlr',
  'xlr-combo': 'xlr',
  rj45: 'rj45',
  ethercon: 'rj45',
  usb: 'usb',
  'usb-c': 'usb',
  powercon: 'powercon',
  'powercon-true1': 'powercon',
  speakon: 'speakon',
  speakon8: 'speakon',
  bnc: 'bnc',
  sdi: 'bnc',
}
const family = (c: ConnectorType) => FAMILY[c] ?? c

/** Same socket (or a close kind of it), compatible direction. */
const sameKind = (a: { connector: ConnectorType; dir: PortDirection }, b: { connector: ConnectorType; dir: PortDirection }) =>
  family(a.connector) === family(b.connector) && (a.dir === b.dir || a.dir === 'io' || b.dir === 'io')

/**
 * Every group of an answer checked against the sheet itself: the passage
 * must be in it and must carry the count; the rule-based reading (no AI)
 * must not read another number; and when a second AI read the sheet on its
 * own, it must have found the same. Two independent models agreeing is the
 * strongest sign: it outweighs a count not written word for word (counts
 * per channel are worked out, not written).
 */
export function checkAnswer(
  groups: AiGroup[],
  sheet: string,
  rules: { connector: ConnectorType; dir: PortDirection; count: number; guessed?: boolean }[] = [],
  second?: AiGroup[],
): CheckedGroup[] {
  return groups.map((g) => {
    const doubts: string[] = []
    const other = second?.filter((o) => sameKind(o, g)) ?? []
    // The other reading may split or merge groups of the same socket: compare each one and their total.
    const total = other.reduce((n, o) => n + o.count, 0)
    const agreed = other.some((o) => o.count === g.count) || (other.length > 1 && total === g.count)
    if (second && !other.length) doubts.push('vu par une seule des deux IA')
    else if (second && !agreed) doubts.push(`l’autre IA lit ${[...new Set(other.map((o) => o.count))].join(' ou ')}`)
    if (sheet.trim()) {
      if (!g.quote) {
        if (!agreed) doubts.push('aucun passage cité')
      } else if (!quoteInSheet(g.quote, sheet)) {
        if (!agreed) doubts.push('passage introuvable dans la fiche')
      } else if (!quoteHasCount(g.quote, g.count) && !(g.note && g.count % 2 === 0 && quoteHasCount(g.quote, g.count / 2)) && !agreed) doubts.push(`quantité ${g.count} non écrite dans le passage`)
    }
    const same = rules.filter((r) => !r.guessed && sameKind(r, g))
    if (same.length && !same.some((r) => r.count === g.count)) doubts.push(`l’analyse rapide lit ${[...new Set(same.map((r) => r.count))].join(' ou ')}`)
    if (g.count > 32 && !agreed) doubts.push('nombre élevé')
    // Added by a technician's rule, not read in the sheet: always to check.
    if (g.note?.startsWith('déduite')) doubts.push('non lue dans la fiche')
    return { ...g, doubts }
  })
}

/** What the second AI found and the first did not: offered to the user, not added. */
export function missedGroups(groups: AiGroup[], second: AiGroup[] = []) {
  return second.filter((o) => !groups.some((g) => sameKind(o, g)))
}

// ---- Choosing what the model reads

const CONNECTOR_WORDS =
  /xlr|jack|trs|combo|speakon|\bnl[248]\b|rca|cinch|\baes|madi|dante|ethercon|rj-?45|ethernet|\blan\b|\bsdi\b|bnc|hdmi|usb|midi|dmx|powercon|true ?1|\biec\b|c1[349]\b|mains|secteur|phoenix|euroblock|terminal|bornier|\bdb-?\d|d-?sub|gpio|antenn|fib(?:er|re)|sfp|optical|toslink|adat|word ?clock|lemo|displayport|\bdvi\b|\bvga\b|thunderbolt|schuko|\bpoe\b|binding post/i
const IO_WORDS =
  /\b(?:inputs?|outputs?|thru|through|link|loop|entrées?|sorties?|eingang|eingänge|ausgang|ausgänge|ports?|channels?|canaux|voies|kanäle|connect(?:ions?|ors?|ivity)|connectique|anschlüsse|rear|front|arrière|i\/o|in\/out)\b/i
const SIZE_WORDS = /\brack|\b\d+\s*(?:u|he|ru)\b|\bkg\b|\bweight|\bpoids|\bgewicht|\bdimension/i
const SECTION = /connect|anschl|rear panel|front panel|back panel|face (?:avant|arrière)|panneau|inputs?\s*(?:\/|&|and)\s*outputs?|\bi\/o\b|specifications?|caractéristiques|technische daten|technical data|spécifications/i
const JUNK =
  /warning|caution|danger|avertissement|warrant|garantie|liability|conformity|conformité|declaration|recycl|dispos(?:al|e of)|déchets|lightning|moisture|\brain\b|humidité|qualified (?:service )?personnel|copyright|all rights reserved|trademark|marque déposée|do not (?:open|remove|expose)/i

/** Lines short enough to read: long ones are cut at separators. */
function sheetLines(text: string) {
  const out: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line) continue
    if (line.length <= 240) {
      out.push(line)
      continue
    }
    let rest = line
    while (rest.length > 240) {
      const cut = Math.max(rest.lastIndexOf(' | ', 240), rest.lastIndexOf('. ', 240), rest.lastIndexOf('; ', 240), rest.lastIndexOf(' • ', 240))
      const at = cut > 80 ? cut + 1 : 240
      out.push(rest.slice(0, at).trim())
      rest = rest.slice(at).trim()
    }
    if (rest) out.push(rest)
  }
  return out
}

/**
 * What the model reads: the head of the sheet (name, model) and the
 * connection passages with the lines around them (a table often puts the
 * label on one short line and the number on the next), best first when the sheet
 * is too long, then put back in the order of the sheet. Safety, warranty
 * and legal text is left out, and so are lines repeated word for word.
 */
export function focusText(text: string, max = 6000, device = '') {
  const lines = sheetLines(text)
  const target = words(device)
    .split(' ')
    .filter((w) => w.length > 2 && /\d/.test(w))
  const score = new Array<number>(lines.length).fill(0)
  let section = 0
  lines.forEach((l, i) => {
    if (l.length < 60 && SECTION.test(l)) section = 30
    else if (section > 0) section--
    if (JUNK.test(l)) {
      score[i] = -1
      return
    }
    let s = 0
    if (CONNECTOR_WORDS.test(l)) s += 3
    if (IO_WORDS.test(l)) s += 2
    if (SIZE_WORDS.test(l)) s += 2
    if (s && /\d/.test(l)) s += 1
    if (target.some((w) => words(l).includes(w))) s += 1
    if (section > 0 && s > 0) s += 1
    score[i] = s
  })
  const keep = new Map<number, number>()
  lines.slice(0, 10).forEach((_, i) => score[i] >= 0 && keep.set(i, 100))
  lines.forEach((_, i) => {
    if (score[i] < 2) return
    for (const j of [i - 1, i, i + 1]) if (j >= 0 && j < lines.length && score[j] >= 0 && (j === i || score[j] > 0 || lines[j].length <= 32)) keep.set(j, Math.max(keep.get(j) ?? 0, j === i ? score[i] : score[i] - 1))
  })
  const seen = new Set<string>()
  const chosen = new Set<number>()
  let size = 0
  for (const [i] of [...keep.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])) {
    const w = words(lines[i])
    if (seen.has(w) || size + lines[i].length + 1 > max) continue
    seen.add(w)
    chosen.add(i)
    size += lines[i].length + 1
  }
  return [...chosen].sort((a, b) => a - b).map((i) => lines[i]).join('\n') + '\n'
}

// ---- Gemini request (used by the relay and by a personal key)

/** Gemini wants upper-case OpenAPI types. */
function geminiSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(geminiSchema)
  if (!s || typeof s !== 'object') return s
  return Object.fromEntries(
    Object.entries(s as Record<string, unknown>).map(([k, v]) => [k, k === 'type' && typeof v === 'string' ? v.toUpperCase() : geminiSchema(v)]),
  )
}

export function geminiRequest(input: { text?: string; pdfBase64?: string }) {
  const parts: object[] = []
  if (input.pdfBase64) parts.push({ inline_data: { mime_type: 'application/pdf', data: input.pdfBase64 } })
  if (input.text) parts.push({ text: `Data sheet extracts:\n${input.text.slice(0, 60000)}` })
  parts.push({ text: 'List the connectors of this device.' })
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: geminiSchema(RESULT_SCHEMA),
      // A short thinking pass: counts per channel, duplicates and options are traps.
      thinkingConfig: { thinkingBudget: 1024 },
    },
  }
}

/**
 * Characters of the sheet sent (about 2 000 tokens): the free Groq tier
 * allows 8 000 tokens a minute per model, prompt and thinking included.
 */
const TEXT_BUDGET = 7000

/** Names the device for sheets covering a whole range. */
const deviceLine = (device?: string) => (device?.trim() ? `Device: ${device.trim()}\n` : '')

/** A PDF with no text layer (scan) has to be read by the model itself. */
export const isReadable = (text: string) => text.replace(/\s/g, '').length > 200

async function toBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

type GeminiReply = { error?: { message?: string }; candidates?: { content?: { parts?: { text?: string }[] } }[] }

async function readGemini(res: Response) {
  const data = (await res.json().catch(() => ({}))) as GeminiReply
  if (!res.ok) throw new Error(data.error?.message ?? `erreur ${res.status}`)
  const answer = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return sanitizeAi(JSON.parse(answer || '{}'))
}

export async function extractGemini(input: { text?: string; pdf?: File; device?: string }, key: string, model = GEMINI_DEFAULT_MODEL): Promise<AiResult> {
  if (!key.trim()) throw new Error('Ajoutez votre clé Gemini dans les options avancées.')
  const text = input.text ?? ''
  const scan = !!input.pdf && !isReadable(text)
  const body = geminiRequest({ text: scan ? deviceLine(input.device) : deviceLine(input.device) + focusText(text, TEXT_BUDGET, input.device), pdfBase64: scan ? await toBase64(input.pdf!) : undefined })
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
    body: JSON.stringify(body),
  })
  return readGemini(res)
}

/** What the relay accepts: the prompt, the schema, the useful lines and/or the PDF (for Gemini). */
export function relayRequest(input: { text?: string; fullText?: string; images?: string[]; single?: boolean; system?: string }) {
  return { v: 2, system: input.system ?? SYSTEM_PROMPT, schema: RESULT_SCHEMA, text: input.text, fullText: input.fullText, ...(input.images?.length ? { images: input.images } : {}), ...(input.single ? { single: true } : {}) }
}

/** What Gemini reads (its free quota allows far more than the others'): most of the sheet. */
const GEMINI_BUDGET = 60000

const ENGINE_NAMES: Record<string, string> = { groq: 'Groq', mistral: 'Mistral', zai: 'Z.ai', 'zai-vision': 'Z.ai (images)', gemini: 'Gemini' }

/** The relay forwards to Groq or Gemini with the site owner's key, kept secret on the server. */
export async function extractRelay(input: { text?: string; pdf?: File; device?: string }, url = AI_PROXY_URL): Promise<AiResult> {
  const text = input.text ?? ''
  const scan = !!input.pdf && !isReadable(text)
  if (!scan && !text.trim()) throw new Error('rien à analyser')
  // The pages showing the panels, as pictures: the drawings say what the scattered labels do not.
  const images = input.pdf ? await import('./pdfText').then((m) => m.panelPages(input.pdf!)).catch(() => []) : []
  if (scan && !images.length) throw new Error('PDF scanné illisible : collez le texte des caractéristiques')
  // A scan has no text for the text models (they would guess from the name alone): the picture reader only, told the device.
  const body = relayRequest({
    text: scan ? undefined : deviceLine(input.device) + focusText(text, TEXT_BUDGET, input.device),
    fullText: scan || text.length <= TEXT_BUDGET ? undefined : deviceLine(input.device) + focusText(text, GEMINI_BUDGET, input.device),
    images,
  })
  if (scan && input.device?.trim()) body.system += `\n${deviceLine(input.device).trim()}`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = (await res.json().catch(() => ({}))) as { text?: string; engine?: string; second?: string; secondEngine?: string; error?: { message?: string } }
  if (!res.ok) throw new Error(data.error?.message ?? `erreur ${res.status}`)
  const main = sanitizeAi(JSON.parse(data.text || '{}'))
  const name = (e?: string) => (e ? (ENGINE_NAMES[e] ?? e) : '')
  const trace = {
    sent: body.text,
    geminiChars: (body.fullText ?? body.text)?.length,
    images: images.length,
    answers: [{ engine: data.engine, raw: data.text }, ...(data.second ? [{ engine: data.secondEngine, raw: data.second }] : [])],
  }
  if (!data.second) return { ...main, by: name(data.engine) || undefined, trace }
  let second: AiResult | undefined
  try {
    second = sanitizeAi(JSON.parse(data.second))
  } catch {
    second = undefined
  }
  return { ...main, second: second?.groups, by: [name(data.engine), second ? name(data.secondEngine) : ''].filter(Boolean).join(' + '), trace }
}

// ---- AI built into Chrome (Prompt API, Gemini Nano)

interface ChromeSession {
  prompt(input: string, options?: { responseConstraint?: object; omitResponseConstraintInput?: boolean }): Promise<string>
  destroy(): void
}
interface ChromeLanguageModel {
  availability(options?: object): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>
  create(options?: object): Promise<ChromeSession>
}

const languageModel = () => (globalThis as { LanguageModel?: ChromeLanguageModel }).LanguageModel
const CHROME_IO = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] }

/** 'missing' when the browser has no built-in AI at all. */
export async function chromeAiStatus(): Promise<'missing' | 'unavailable' | 'downloadable' | 'downloading' | 'available'> {
  const lm = languageModel()
  if (!lm) return 'missing'
  try {
    return await lm.availability(CHROME_IO)
  } catch {
    return 'unavailable'
  }
}

export async function extractChrome(text: string, onProgress: (msg: string) => void, device?: string): Promise<AiResult> {
  const lm = languageModel()
  if (!lm) throw new Error('IA de Chrome absente')
  const session = await lm.create({
    ...CHROME_IO,
    initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
    monitor(m: EventTarget) {
      m.addEventListener('downloadprogress', (e) => {
        const loaded = (e as Event & { loaded?: number }).loaded ?? 0
        onProgress(`Chrome prépare son IA intégrée (une seule fois) : ${Math.round(loaded * 100)} %`)
      })
    },
  })
  try {
    onProgress('L’IA intégrée à Chrome lit la fiche…')
    const answer = await session.prompt(`Data sheet extracts:\n${deviceLine(device)}${focusText(text, 4000, device)}`, { responseConstraint: RESULT_SCHEMA, omitResponseConstraintInput: true })
    return sanitizeAi(JSON.parse(answer))
  } finally {
    session.destroy()
  }
}

// ---- Automatic choice

export interface AutoOptions {
  text: string
  pdf?: File
  /** Brand and model looked for, when the sheet was found by name. */
  device?: string
  personalKey?: string
  personalModel?: string
  /** The AI built into Chrome is slow: only used when the user turns it on. */
  allowChrome?: boolean
  onProgress: (msg: string) => void
}

/** Engines usable right now, best first. */
export async function availableEngines(personalKey?: string, allowChrome = false): Promise<Engine[]> {
  const list: Engine[] = []
  if (personalKey?.trim()) list.push('personal')
  if (AI_PROXY_URL) list.push('relay')
  if (allowChrome) {
    const chrome = await chromeAiStatus()
    if (chrome !== 'missing' && chrome !== 'unavailable') list.push('chrome')
  }
  return list
}

/** Tries each available engine in turn; throws when none could answer. */
export async function extractAuto(o: AutoOptions): Promise<{ result: AiResult; engine: Engine }> {
  const engines = await availableEngines(o.personalKey, o.allowChrome)
  if (engines.length === 0) throw new Error('Aucune IA disponible sur cet appareil.')
  const errors: string[] = []
  for (const engine of engines) {
    try {
      if (engine === 'personal') {
        o.onProgress('Gemini lit la fiche…')
        return { result: await extractGemini({ text: o.text, pdf: o.pdf, device: o.device }, o.personalKey!, o.personalModel), engine }
      }
      if (engine === 'relay') {
        o.onProgress('L’IA SynopGig lit la fiche…')
        return { result: await extractRelay({ text: o.text, pdf: o.pdf, device: o.device }), engine }
      }
      if (!o.text.trim()) throw new Error('pas de texte lisible dans ce PDF')
      return { result: await extractChrome(o.text, o.onProgress, o.device), engine }
    } catch (e) {
      errors.push(`${ENGINE_LABELS[engine]} : ${(e as Error).message}`)
    }
  }
  throw new Error(errors.join(' · '))
}

// ---- Settling a disagreement

/** The two readings disagree on these groups: a different count, or seen by one only. */
export function disagreements(first: AiGroup[], second: AiGroup[] = []) {
  const differ = first.filter((g) => {
    const o = second.filter((x) => sameKind(x, g))
    return !o.length || (!o.some((x) => x.count === g.count) && o.reduce((n, x) => n + x.count, 0) !== g.count)
  })
  return [...differ, ...missedGroups(first, second)]
}

const ARBITER = `${SYSTEM_PROMPT}
Two readings of this sheet by two other AIs disagree; they are given before the extracts. Read the extracts again and give the final, complete list of connectors. Keep what the sheet proves, whoever found it; drop what it does not. For every group, quote the passage. When the sheet really cannot settle a count, keep the count a quote supports.`

const listed = (groups: AiGroup[]) =>
  groups.map((g) => `- ${g.count} x ${g.connector} ${g.signal} ${g.dir} "${g.prefix}"${g.quote ? ` (quote: ${g.quote.slice(0, 100)})` : ''}`).join('\n') || '- (nothing)'

/**
 * A third reading by the relay's best text model, told both readings and
 * shown the sheet again, settles what they disagree on. Undefined when it
 * cannot answer (quota): the two readings stay as they are.
 */
export async function settle(result: AiResult, sheet: string, device = '', url = AI_PROXY_URL, request: typeof fetch = fetch): Promise<AiResult | undefined> {
  if (!url || !result.second || !sheet.trim() || disagreements(result.groups, result.second).length === 0) return undefined
  const text = `${deviceLine(device)}Reading A:\n${listed(result.groups)}\nReading B:\n${listed(result.second)}\n\nData sheet extracts:\n${focusText(sheet, 6000, device)}`
  try {
    const res = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(relayRequest({ system: ARBITER, text, single: true })) })
    if (!res.ok) return undefined
    const data = (await res.json()) as { text?: string; engine?: string }
    const final = sanitizeAi(JSON.parse(data.text || '{}'))
    const trace = result.trace && { ...result.trace, answers: [...result.trace.answers, { engine: `arbitre (${data.engine ?? '?'})`, raw: data.text }] }
    return final.groups.length ? { ...result, trace, groups: final.groups, by: `${result.by ?? ''}, tranché par ${ENGINE_NAMES[data.engine ?? ''] ?? data.engine ?? 'une 3e IA'}` } : undefined
  } catch {
    return undefined
  }
}

// ---- Researching a product on the web

export const RESEARCH_PROMPT = `${SYSTEM_PROMPT}
Here you receive no extracts, only the product name: research it yourself, to reproduce it faithfully in SynopGig (a tool drawing the cabling of live shows).
1. Search the web: the manufacturer's product page and specifications, its user guide or quick start guide (they describe every panel), and the specifications of shops such as Thomann or Sweetwater to cross-check.
2. Make sure every source is about this exact model, not another one of the range.
3. List every physical connector in panel order: the rear panel first, left to right as printed, then the front and top panels. One group per run of identical sockets ("Mic 1-2", "Ch 3-4"...).
4. label: the name printed on the panel, short ("Mic 1-2", "Line 5-8", "Main L/R", "Monitor 1-2", "Phones", "Footswitch", "USB", "Power"); quote: the words of the source you read it in.
5. signal: the protocol each connector carries (analog audio, AES3, Dante, AES50, MIDI, DMX, Art-Net, video, power...).`

/** The relay's AI searches the web and reads the product's pages by itself, then lists its connectors in panel order. */
export async function researchWeb(brand: string, model: string, url = AI_PROXY_URL, request: typeof fetch = fetch): Promise<AiResult> {
  if (!url) throw new Error('relais indisponible')
  const product = `${brand} ${model}`.trim()
  const res = await request(`${url.replace(/\/+$/, '')}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ v: 2, system: RESEARCH_PROMPT, schema: RESULT_SCHEMA, product }),
  })
  const data = (await res.json().catch(() => ({}))) as { text?: string; engine?: string; model?: string; sources?: { url: string; title: string }[]; error?: { message?: string } }
  if (!res.ok) throw new Error(data.error?.message ?? `erreur ${res.status}`)
  const result = sanitizeAi(JSON.parse(data.text || '{}'))
  const who = data.engine === 'gemini-web' ? 'Gemini' : 'Groq'
  return { ...result, by: `${who} (recherche web)`, sources: data.sources ?? [], trace: { sent: `Product: ${product}`, answers: [{ engine: `recherche web ${who} (${data.model ?? '?'})`, raw: data.text }] } }
}
