import { createContext } from 'react'

export interface ViewOptions {
  /** Port ids in use, keyed by node id. */
  used: Map<string, Set<string>>
  compact: boolean
  highlight: Set<string>
  /** Photo or symbol in the device header. */
  images?: boolean
  /** Opens the cards of a device (its + cartes button). */
  onCards?: (nodeId: string) => void
}

export const ViewContext = createContext<ViewOptions>({
  used: new Map(),
  compact: false,
  highlight: new Set(),
})
