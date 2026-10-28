// pdf.js draws pages with Map.getOrInsertComputed, too recent for some browsers (Safari, older Chrome).
for (const C of [Map, WeakMap] as unknown as { prototype: Record<string, unknown> }[]) {
  const proto = C.prototype as { has(k: unknown): boolean; get(k: unknown): unknown; set(k: unknown, v: unknown): void } & Record<string, unknown>
  proto.getOrInsertComputed ??= function (this: typeof proto, key: unknown, make: (k: unknown) => unknown) {
    if (!this.has(key)) this.set(key, make(key))
    return this.get(key)
  }
  proto.getOrInsert ??= function (this: typeof proto, key: unknown, value: unknown) {
    if (!this.has(key)) this.set(key, value)
    return this.get(key)
  }
}

/**
 * Extracts the text of a PDF in the browser with pdf.js: free, offline,
 * the file never leaves the computer. Loaded on demand to keep the app light.
 */
export async function pdfToText(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const doc = await task.promise
  const pages: string[] = []
  for (let i = 1; i <= Math.min(doc.numPages, 30); i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      text += item.str + (item.hasEOL ? '\n' : ' ')
    }
    pages.push(text)
  }
  await task.destroy()
  return pages.join('\n')
}

const PANEL_WORDS = /rear panel|front panel|back panel|top panel|side panel|connections?|connectors?|hook-?up|controls? and connectors|i\/o|anschl[üu]sse|r[üu]ckseite|face (?:avant|arri[èe]re)|panneau|connectique|branchements/gi
const SOCKET_WORDS = /\bxlr\b|\btrs\b|\bjack\b|speakon|\brca\b|\busb\b|ethercon|rj-?45|\bdmx\b|\bmidi\b|footswitch|phones|headphones|\bmain\b|\bmonitor\b|\binput|\boutput/gi

/**
 * The pages of a PDF most likely to show the panels (drawings of the
 * sockets, numbered features), as JPEG images for an AI that reads
 * pictures: a hook-up drawing says more than its scattered labels.
 * Base64 without the data: prefix.
 */
export async function panelPages(file: File, max = 4): Promise<string[]> {
  if (typeof document === 'undefined') return []
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    const doc = await task.promise
    const scored: { n: number; score: number }[] = []
    for (let n = 1; n <= Math.min(doc.numPages, 40); n++) {
      const content = await (await doc.getPage(n)).getTextContent()
      const text = content.items.map((i) => ('str' in i ? i.str : '')).join(' ')
      const score = (text.match(PANEL_WORDS)?.length ?? 0) * 3 + Math.min(8, text.match(SOCKET_WORDS)?.length ?? 0)
      scored.push({ n, score })
    }
    // Best pages first; a scan (no text at all) shows its first pages.
    const chosen = scored
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score || a.n - b.n)
      .slice(0, max)
      .map((p) => p.n)
    const pages = chosen.length ? chosen.sort((a, b) => a - b) : scored.slice(0, max).map((p) => p.n)
    const out: string[] = []
    for (const n of pages) {
      const page = await doc.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: Math.min(2.5, 1400 / Math.max(base.width, base.height)) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport, canvas }).promise
      out.push(canvas.toDataURL('image/jpeg', 0.72).split(',')[1])
    }
    return out
  } finally {
    await task.destroy()
  }
}
