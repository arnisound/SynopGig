/** A new product asked for from the synoptic palette, handled by the library page. */
export type NewProduct =
  | { mode: 'find'; query: string }
  | { mode: 'doc'; file: File }
  | { mode: 'manual' }

/** Each request is numbered, so asking twice for the same thing still acts. */
export type NewProductRequest = NewProduct & { n: number }
