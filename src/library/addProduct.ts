import { checkAnswer, disagreements, missedGroups, researchWeb, settle, type AiGroup, type AiResult, type CheckedGroup } from './ai'
import { findDocs, research, type FoundDoc, type Research } from './finder'
import { parseDatasheet } from './parseDatasheet'

/*
 * Adding a product that is not in the library, almost by itself: the user
 * gives the brand and the model, then only checks and corrects.
 *
 * Two independent readings, at the same time:
 * 1. the relay's AI researches the product on the web and reads its pages
 *    itself (maker, data sheet, manual, shops), and lists its connectors in
 *    panel order with their protocol;
 * 2. SynopGig finds the product's documents, reads them, and has them read
 *    (text, and the panel pages as pictures).
 * Where they agree, the row is confirmed; where they differ, a third reading
 * settles it with the documents; what remains doubtful is shown in orange.
 */

export interface ProductReading {
  /** Brand, model, department, family, height, weight, and the connector groups in panel order. */
  result: AiResult
  /** The groups with what to check on each (empty: confirmed). */
  checked: CheckedGroup[]
  /** Found by one reading only: offered, not added. */
  suggestions: AiGroup[]
  /** Every document the search found, to pick another one. */
  docs: FoundDoc[]
  /** The documents read: their text, photos and the main PDF. */
  read?: Research
  /** Pages and documents the readings came from. */
  sources: { url: string; title: string }[]
  /** What was read, sent and received, word for word. */
  report: string
  /** How many independent readings the result stands on (1: check it all). */
  readings: number
}

export interface Readers {
  researchWeb: (brand: string, model: string) => Promise<AiResult>
  findDocs: (brand: string, model: string) => Promise<FoundDoc[]>
  research: (docs: FoundDoc[], model: string, onStep: (msg: string) => void) => Promise<Research>
  /** The usual analysis of a sheet (relay, personal key or Chrome's AI, as the user set it). */
  readSheet: (text: string, pdf: File | undefined, device: string) => Promise<AiResult>
  settle: (result: AiResult, sheet: string, device: string) => Promise<AiResult | undefined>
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))
const same = (a: AiGroup, b: AiGroup) => a.connector === b.connector && a.dir === b.dir

export async function readProduct(
  brand: string,
  model: string,
  knownBrands: string[],
  onStep: (msg: string) => void,
  readers: Pick<Readers, 'readSheet'> & Partial<Readers>,
): Promise<ProductReading> {
  const r: Readers = { researchWeb, findDocs, research, settle, ...readers }
  const device = `${brand} ${model}`.trim()
  onStep('L’IA recherche le produit sur le web, SynopGig cherche sa documentation…')

  const [web, docsPart] = await Promise.all([
    r.researchWeb(brand, model).catch((e: unknown) => new Error(message(e))),
    (async () => {
      const docs = await r.findDocs(brand, model).catch(() => [] as FoundDoc[])
      if (!docs.length) return { docs, read: new Error('aucun document trouvé') }
      const read = await r.research(docs, model, onStep).catch((e: unknown) => new Error(message(e)))
      return { docs, read }
    })(),
  ])
  const read = docsPart.read instanceof Error ? undefined : docsPart.read
  onStep(read ? 'Lecture des documents par l’IA…' : 'Documents illisibles : la recherche web seule sert de base.')
  const sheetReading = read ? await r.readSheet(read.text, read.pdf, device).catch((e: unknown) => new Error(message(e))) : undefined

  const webOk = !(web instanceof Error) && web.groups.length > 0
  const sheetOk = !!sheetReading && !(sheetReading instanceof Error) && sheetReading.groups.length > 0
  if (!webOk && !sheetOk) {
    const why = [web instanceof Error && `recherche web : ${web.message}`, docsPart.read instanceof Error && `documents : ${docsPart.read.message}`, sheetReading instanceof Error && `lecture : ${sheetReading.message}`]
    throw new Error(why.filter(Boolean).join(' ; ') || 'rien trouvé sur ce produit')
  }
  const webResult = webOk ? (web as AiResult) : undefined
  const sheetResult = sheetOk ? (sheetReading as AiResult) : undefined
  // The web reading leads (it lists the panels in order); the documents' reading checks it.
  const main = webResult ?? sheetResult!
  const compare = webResult ? sheetResult?.groups : sheetResult?.second
  const sheet = read?.text ?? ''

  let groups = main.groups
  let settled: AiResult | undefined
  if (compare && sheet && disagreements(main.groups, compare).length) {
    onStep('Les deux lectures diffèrent : une troisième tranche avec les documents…')
    settled = await r.settle({ ...main, second: compare }, sheet, device).catch(() => undefined)
    if (settled) groups = settled.groups
  }

  const rules = sheet ? parseDatasheet(sheet, knownBrands).groups : []
  const readings = [main.groups, ...(compare ? [compare] : [])]
  const checked = settled
    ? checkAnswer(groups, sheet, rules).map((g) =>
        readings.some((list) => list.some((o) => same(o, g) && o.count === g.count)) ? g : { ...g, doubts: [...g.doubts, `aucune des deux lectures ne lisait ${g.count}`] },
      )
    : // The web reading quotes pages SynopGig did not read: checked against the other reading, not the text.
      checkAnswer(groups, webResult ? '' : sheet, rules, compare)

  const others = readings.flat()
  const missed = missedGroups(groups, others).filter((g, i, all) => all.findIndex((o) => same(o, g)) === i)
  const fromRules = rules.filter((x) => !x.guessed && !groups.some((g) => g.connector === x.connector) && !missed.some((m) => m.connector === x.connector))

  const result: AiResult = {
    ...(sheetResult ?? {}),
    ...main,
    brand: brand || main.brand,
    model: model || main.model,
    rackU: main.rackU ?? sheetResult?.rackU,
    weight: main.weight ?? sheetResult?.weight,
    groups,
    by: [webResult && 'recherche web', sheetResult && `documents (${sheetResult.by ?? 'IA'})`, settled && 'arbitrage'].filter(Boolean).join(' + '),
  }
  const sources = [...(webResult?.sources ?? []), ...(read?.used ?? [])].filter((s, i, all) => all.findIndex((o) => o.url === s.url) === i)

  const answers = [...(webResult?.trace?.answers ?? []), ...(sheetResult?.trace?.answers ?? []), ...(settled?.trace?.answers.slice(-1) ?? [])]
  const report = [
    `Rapport SynopGig — ${new Date().toISOString()}`,
    `Produit : ${device}`,
    `Recherche web : ${web instanceof Error ? `échec (${web.message})` : `${web.groups.length} groupe(s), ${web.sources?.length ?? 0} page(s) lue(s)`}`,
    `Documents trouvés : ${docsPart.docs.length} · lus : ${read ? read.used.map((u) => `${u.title} <${u.url}>`).join(' ; ') : message(docsPart.read)}`,
    `Lecture des documents : ${sheetReading === undefined ? 'aucune' : sheetReading instanceof Error ? `échec (${sheetReading.message})` : `${sheetReading.groups.length} groupe(s) (${sheetReading.by ?? '?'}), ${sheetReading.trace?.images ?? 0} page(s) en image`}`,
    `Sources : ${sources.map((s) => s.url).join(' ; ') || '(aucune)'}`,
    '',
    ...answers.flatMap((a, i) => [`=== Réponse ${i + 1} : ${a.engine ?? '?'} ===`, a.raw ?? '(vide)', '']),
    '=== Résultat affiché ===',
    ...checked.map((g) => `${g.count} × ${g.connector} · ${g.signal} · ${g.dir} · « ${g.prefix} »${g.note ? ` · corrigé : ${g.note}` : ''}${g.doubts.length ? ` · à vérifier : ${g.doubts.join(', ')}` : ''}`),
    '',
    '=== Texte envoyé à l’IA (documents) ===',
    sheetResult?.trace?.sent ?? '(aucun)',
  ].join('\n')

  return { result, checked, suggestions: [...missed, ...fromRules], docs: docsPart.docs, read, sources, report, readings: readings.length }
}
