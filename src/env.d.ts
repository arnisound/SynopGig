interface ImportMetaEnv {
  /** Overrides the AI relay URL (worker/); "off" disables it. Default: the SynopGig relay. */
  readonly VITE_AI_PROXY_URL?: string
  /** Overrides the USER library URL (worker/library.js); "off" disables sharing. */
  readonly VITE_LIBRARY_URL?: string
}
