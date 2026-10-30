import type { Edge, Node } from '@xyflow/react'

export type SignalType =
  | 'audio-analog'
  | 'audio-digital'
  | 'speaker'
  | 'dmx'
  | 'network'
  | 'dante'
  | 'avb'
  | 'artnet'
  | 'ndi'
  | 'control-ip'
  | 'audio-link'
  | 'sync'
  | 'intercom'
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
  | 'p17-125a'
  | 'microdot'
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
  /** Side of the device box chosen by the user (else: inputs left, outputs right). */
  side?: 'left' | 'right'
  /** Id of the optional card this port belongs to. */
  option?: string
}

/** An optional card or module of a product (a Dante card in a slot...): its ports appear once it is fitted. */
export type DeviceOption = {
  id: string
  label: string
  ports: Port[]
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

/** One characteristic of a product: "Physique · Poids · 39 · kg". */
export type Spec = {
  group: string
  label: string
  value: string
  unit?: string
}

/** A document about a product: data sheet, user guide, product page. */
export type ProductDoc = {
  title: string
  url: string
}

/** What is known about a product beyond its sockets: shown on its sheet. */
// Types, not interfaces: the canvas wants node data indexable.
export type ProductInfo = {
  /** One or two sentences on what it is. */
  description?: string
  /** The maker's page of the product. */
  url?: string
  specs?: Spec[]
  docs?: ProductDoc[]
  /** Power drawn from the mains, in watts (for the power budget). */
  watts?: number
}

export interface DeviceTemplate extends ProductInfo {
  id: string
  brand?: string
  model: string
  category: Category
  /** Sub-group inside the category (consoles, line arrays, PTZ...). */
  family?: string
  /** Pseudo of the user who shared it (USER library). */
  author?: string
  /** USER library: technicians who confirmed it, and the latest error reports. */
  checks?: number
  reports?: { note: string; at: string }[]
  /** Height in rack units, if the device is rackable. */
  rackU?: number
  /** Weight in kg, used for flight case packing. */
  weight?: number
  ports: Port[]
  /** Cards and modules that can be fitted. */
  options?: DeviceOption[]
  panel?: PanelSpec
  /** Product photo: a small data URL, or the USER library's address for it. */
  image?: string
}

export interface DeviceConfig {
  ip?: string
  dmxUniverse?: string
  dmxAddress?: string
  mode?: string
  notes?: string
}

export type DeviceData = ProductInfo & {
  templateId: string
  model: string
  category: Category
  name: string
  zone: string
  rackU?: number
  weight?: number
  ports: Port[]
  /** Cards the product can take, and the ones fitted on this device. */
  options?: DeviceOption[]
  fitted?: string[]
  config: DeviceConfig
  brand?: string
  panel?: PanelSpec
  family?: string
  /** Product photo (data URL, or the USER library's address). */
  image?: string
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
  /** Weight of the empty case, kg. */
  emptyWeight?: number
  /** Shop page the case was recreated from. */
  source?: string
}

export interface GuideProgress {
  [stepId: string]: boolean
}

/** How the synoptic shows the cabling, saved with each project. */
export interface SynopticView {
  /** Cable path: curved, right angles (rounded or sharp) or straight. */
  edgeStyle: 'default' | 'smoothstep' | 'step' | 'straight'
  /** Cable labels: tag and length, tag only, or nothing. */
  labels: 'full' | 'id' | 'none'
  /** Line width, px. */
  thickness: number
  /** Signals whose cables are hidden. */
  hiddenSignals: SignalType[]
  /** One department only (its devices, and what they are plugged into, dimmed). */
  department: Category | 'all'
  /** A selected device dims every cable that does not reach it. */
  focusSelection: boolean
  /** Animated cables, in the direction of the signal. */
  flow: boolean
  /** Hide unused ports. */
  compact: boolean
  /** Right-angle cables each get their own route, never a shared segment. */
  lanes: boolean
  /** Space between two separated cables, px. */
  laneGap: number
  /** Cable tag repeated next to both ports. */
  endTags: boolean
  /** Colour by signal, or one colour per cable. */
  colorMode: 'signal' | 'cable'
  /** Product photo or symbol in each device's header. */
  images: boolean
}

/** What the user changed on a line of the input or output list. */
export interface PatchEdit {
  channel?: string
  name?: string
  stand?: string
  phantom?: boolean
  note?: string
}

export type StageItemKind = 'device' | 'musician' | 'riser' | 'stand' | 'wedge' | 'drums' | 'amp' | 'keys' | 'power' | 'label'

/** Something on the stage plot; sizes and positions in metres, from upstage left. */
export interface StageItem {
  id: string
  kind: StageItemKind
  /** Synoptic device shown by this item. */
  nodeId?: string
  label: string
  x: number
  y: number
  w: number
  h: number
  rot: number
}

export interface StagePlot {
  /** Stage size, metres. */
  width: number
  depth: number
  items: StageItem[]
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
  view?: Partial<SynopticView>
  patch?: { inputs?: Record<string, PatchEdit>; outputs?: Record<string, PatchEdit> }
  stage?: StagePlot
  /** Read-only link published from this project (its key stays in the browser). */
  share?: { id: string; updatedAt?: string }
  /** Power budget: the phase of each power outlet ("nodeId:portId" → L1, L2, L3). */
  power?: { phases?: Record<string, Phase> }
}

export type Phase = 'L1' | 'L2' | 'L3'
