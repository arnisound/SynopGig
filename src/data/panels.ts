import type { ConnectorType, DeviceTemplate, PanelHole, PanelSpec, Port, PortDirection, SignalType } from '../types'

/** D-series holes per rack unit on a 19" patch panel. */
export const HOLES_PER_U = 16

export interface HoleType {
  connector: ConnectorType
  signal: SignalType
  label: string
}

/** Connectors that fit a Neutrik D-size cut-out. */
export const HOLE_TYPES: HoleType[] = [
  { connector: 'xlr3', signal: 'audio-analog', label: 'XLR 3 (audio)' },
  { connector: 'xlr3', signal: 'audio-digital', label: 'XLR 3 (AES)' },
  { connector: 'xlr5', signal: 'dmx', label: 'XLR 5 (DMX)' },
  { connector: 'ethercon', signal: 'network', label: 'etherCON (réseau)' },
  { connector: 'ethercon', signal: 'audio-digital', label: 'etherCON (AES50 / SLink)' },
  { connector: 'opticalcon', signal: 'network', label: 'opticalCON (fibre)' },
  { connector: 'speakon', signal: 'speaker', label: 'Speakon NL4 (HP)' },
  { connector: 'speakon8', signal: 'speaker', label: 'Speakon NL8 (HP)' },
  { connector: 'powercon-true1', signal: 'power', label: 'powerCON TRUE1' },
  { connector: 'sdi', signal: 'video', label: 'BNC (SDI / MADI)' },
  { connector: 'bnc', signal: 'rf', label: 'BNC (antenne HF)' },
  { connector: 'rmp54', signal: 'audio-analog', label: 'RMP 54 pts (16 voies)' },
  { connector: 'hdmi', signal: 'video', label: 'HDMI' },
  { connector: 'jack', signal: 'audio-analog', label: 'Jack 6.35' },
  { connector: 'xlr-combo', signal: 'audio-analog', label: 'Combo XLR / jack' },
  { connector: 'rca', signal: 'audio-analog', label: 'RCA (cinch)' },
  { connector: 'toslink', signal: 'audio-digital', label: 'Toslink / ADAT' },
  { connector: 'usb-c', signal: 'network', label: 'USB-C' },
  { connector: 'displayport', signal: 'video', label: 'DisplayPort' },
  { connector: 'usb', signal: 'network', label: 'USB' },
]

export const holeTypeKey = (t: { connector: ConnectorType | null; signal: SignalType }) => `${t.connector}|${t.signal}`

export const flip = (d: PortDirection): PortDirection => (d === 'in' ? 'out' : d === 'out' ? 'in' : 'io')

export const extId = (holeId: string) => `${holeId}-ext`
export const intId = (holeId: string) => `${holeId}-int`

/** Each hole is a pass-through: an outside port and its inside twin. */
export function panelPorts(spec: PanelSpec): Port[] {
  return spec.holes.flatMap((h) => {
    if (!h.connector) return []
    return [
      { id: intId(h.id), label: h.label, connector: h.connector, signal: h.signal, dir: flip(h.dir), face: 'int' as const, pair: extId(h.id) },
      { id: extId(h.id), label: h.label, connector: h.connector, signal: h.signal, dir: h.dir, face: 'ext' as const, pair: intId(h.id) },
    ]
  })
}

export function emptyPanel(heightU: number): PanelSpec {
  return {
    heightU,
    holes: Array.from({ length: heightU * HOLES_PER_U }, (_, i) => ({
      id: `h${i + 1}`,
      label: '',
      connector: null,
      signal: 'audio-analog',
      dir: 'in',
    })),
  }
}

/** Fills `count` holes starting at index `from` with numbered connectors. */
export function fillHoles(
  spec: PanelSpec,
  from: number,
  count: number,
  type: HoleType | null,
  dir: PortDirection,
  prefix: string,
  start = 1,
): PanelSpec {
  const holes = spec.holes.map((h, i): PanelHole => {
    const k = i - from
    if (k < 0 || k >= count) return h
    if (!type) return { ...h, connector: null, label: '' }
    return {
      ...h,
      connector: type.connector,
      signal: type.signal,
      dir,
      label: count === 1 && !/\d$/.test(prefix) ? prefix : `${prefix} ${start + k}`.trim(),
    }
  })
  return { ...spec, holes }
}

function preset(id: string, model: string, heightU: number, groups: [HoleType, PortDirection, string, number][]): DeviceTemplate {
  let spec = emptyPanel(heightU)
  let at = 0
  for (const [type, dir, prefix, count] of groups) {
    spec = fillHoles(spec, at, count, type, dir, prefix)
    at += count
  }
  return { id, model, category: 'Câblage', rackU: heightU, weight: heightU * 1.2, ports: panelPorts(spec), panel: spec }
}

const T = (connector: ConnectorType, signal: SignalType) => HOLE_TYPES.find((t) => t.connector === connector && t.signal === signal)!

export const PANEL_TEMPLATES: DeviceTemplate[] = [
  preset('panel-1u', 'Bandeau de câblage 1U (vide)', 1, []),
  preset('panel-2u', 'Bandeau de câblage 2U (vide)', 2, []),
  preset('panel-3u', 'Bandeau de câblage 3U (vide)', 3, []),
  preset('panel-stage-1u', 'Bandeau plateau 1U (8 in / 4 out / réseau / secteur)', 1, [
    [T('xlr3', 'audio-analog'), 'in', 'MIC', 8],
    [T('xlr3', 'audio-analog'), 'out', 'RET', 4],
    [T('ethercon', 'network'), 'io', 'NET', 2],
    [T('powercon-true1', 'power'), 'in', 'SECTEUR', 1],
    [T('powercon-true1', 'power'), 'out', 'RECOPIE', 1],
  ]),
  preset('panel-32in-2u', 'Bandeau 32 entrées XLR 2U', 2, [[T('xlr3', 'audio-analog'), 'in', 'IN', 32]]),
  preset('panel-amp-1u', 'Bandeau ampli 1U (4 in / 4 HP / réseau / secteur)', 1, [
    [T('xlr3', 'audio-analog'), 'in', 'IN', 4],
    [T('speakon', 'speaker'), 'out', 'HP', 4],
    [T('ethercon', 'network'), 'io', 'NET', 1],
    [T('powercon-true1', 'power'), 'in', 'SECTEUR', 1],
  ]),
  preset('panel-light-1u', 'Bandeau lumière 1U (8 DMX / 2 réseau / secteur)', 1, [
    [T('xlr5', 'dmx'), 'out', 'DMX', 8],
    [T('ethercon', 'network'), 'io', 'NET', 2],
    [T('powercon-true1', 'power'), 'in', 'SECTEUR', 1],
  ]),
  preset('panel-video-1u', 'Bandeau vidéo 1U (8 SDI in / 4 SDI out / HDMI / réseau)', 1, [
    [T('sdi', 'video'), 'in', 'SDI IN', 8],
    [T('sdi', 'video'), 'out', 'SDI OUT', 4],
    [T('hdmi', 'video'), 'out', 'HDMI', 1],
    [T('ethercon', 'network'), 'io', 'NET', 1],
    [T('powercon-true1', 'power'), 'in', 'SECTEUR', 1],
  ]),
]

/** Click on a hole: select it alone, or add/remove it when extending. */
export function toggleHole(selected: Set<string>, holeId: string, extend: boolean) {
  const next = new Set(extend ? selected : [])
  if (extend && selected.has(holeId)) next.delete(holeId)
  else next.add(holeId)
  return next
}
