import type { Edge, Node } from '@xyflow/react'

export type SignalType =
  | 'audio-analog'
  | 'audio-digital'
  | 'speaker'
  | 'dmx'
  | 'network'
  | 'video'
  | 'power'

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

export type PortDirection = 'in' | 'out' | 'io'

export interface Port {
  id: string
  label: string
  connector: ConnectorType
  signal: SignalType
  dir: PortDirection
}

export type Category =
  | 'Son'
  | 'Lumière'
  | 'Vidéo'
  | 'Réseau'
  | 'Énergie'
  | 'Autre'

export interface DeviceTemplate {
  id: string
  model: string
  category: Category
  /** Height in rack units, if the device is rackable. */
  rackU?: number
  /** Weight in kg, used for flight case packing. */
  weight?: number
  ports: Port[]
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
