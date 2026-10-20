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
