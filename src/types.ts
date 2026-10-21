import type { Edge, Node } from '@xyflow/react'

export type SignalType =
  | 'audio-analog'
  | 'audio-digital'
  | 'speaker'
  | 'dmx'
  | 'network'
  | 'video'
  | 'power'
  | 'rf'
  | 'control'

export type ConnectorType =
  | 'xlr3'
  | 'xlr5'
  | 'jack'
  | 'speakon'
  | 'rj45'
  | 'ethercon'
  | 'opticalcon'
  | 'hdmi'
  | 'sdi'
  | 'powercon'
  | 'powercon-true1'
  | 'schuko'
  | 'p17-16a'
  | 'p17-32a'
  | 'socapex'
  | 'speakon8'
  | 'iec'
  | 'p17-63a'
  | 'usb'
  | 'bnc'
  | 'ntype'
  | 'dc'
  | 'minijack'
  | 'rmp54'
  | 'xlr-combo'
  | 'xlr4'
  | 'mini-xlr'
  | 'rca'
  | 'toslink'
  | 'midi'
  | 'euroblock'
  | 'binding-post'
  | 'db9'
  | 'db25'
  | 'displayport'
  | 'dvi'
  | 'vga'
  | 'usb-c'
  | 'lc-fiber'
  | 'smpte-fiber'
  | 'sfp'
  | 'lemo3'
  | 'ca-com'
  | 'harting'
  | 'p17-32a-mono'

export type PortDirection = 'in' | 'out' | 'io'

export interface Port {
  id: string
  label: string
  connector: ConnectorType
  signal: SignalType
  dir: PortDirection
  /** Patch panel ports: outside face or inside (rack) face of a hole. */
  face?: 'ext' | 'int'
  /** Patch panel ports: id of the other face of the same hole. */
  pair?: string
}

/** One D-series hole of a patch panel. */
export interface PanelHole {
  id: string
  label: string
  /** null = blanking plate. */
  connector: ConnectorType | null
  signal: SignalType
  /** Direction seen from outside the rack. */
  dir: PortDirection
}

export interface PanelSpec {
  heightU: number
  holes: PanelHole[]
}

export type Category =
  | 'Son'
  | 'Lumière'
  | 'Vidéo'
  | 'Réseau'
  | 'Énergie'
  | 'Câblage'
  | 'Autre'

export interface DeviceTemplate {
  id: string
  brand?: string
  model: string
  category: Category
  /** Sub-group inside the category (consoles, line arrays, PTZ...). */
  family?: string
  /** Pseudo of the user who shared it (USER library). */
  author?: string
  /** Height in rack units, if the device is rackable. */
  rackU?: number
  /** Weight in kg, used for flight case packing. */
  weight?: number
  ports: Port[]
  panel?: PanelSpec
}

export interface DeviceConfig {
  ip?: string
  dmxUniverse?: string
  dmxAddress?: string
  mode?: string
  notes?: string
}

export type DeviceData = {
  templateId: string
  model: string
  category: Category
  name: string
  zone: string
  rackU?: number
  weight?: number
  ports: Port[]
  config: DeviceConfig
  brand?: string
  panel?: PanelSpec
}

export type DeviceNode = Node<DeviceData, 'device'>

export type CableData = {
  cableId: string
  length?: number
  note?: string
}

export type CableEdge = Edge<CableData>

export type CaseKind = 'rack' | 'malle' | 'valise' | 'console'

export interface Banner {
  title: string
  subtitle: string
  bg: string
  fg: string
  font: string
  logo?: string
}

export interface FlightCase {
  id: string
  number: string
  name: string
  kind: CaseKind
  rackU: number
  width: number
  height: number
  depth: number
  shell: string
  wheels: boolean
  handles: number
  banner: Banner
  /** Device node ids stored in this case. */
  devices: string[]
  /** Rack cases: top rack unit (1 = top) of each mounted device. */
  rackLayout?: Record<string, number>
  /** Free items (cables, accessories...). */
  extras: string
}

export interface GuideProgress {
  [stepId: string]: boolean
}

export interface Project {
  version: 1
  name: string
  venue: string
  date: string
  nodes: DeviceNode[]
  edges: CableEdge[]
  cases: FlightCase[]
  progress: GuideProgress
  customTemplates: DeviceTemplate[]
}
