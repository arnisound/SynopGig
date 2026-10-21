// Run by .github/workflows/user-library.yml when an issue titled
// "[Matériel USER] …" is opened: validates the JSON block of the issue and
// appends it to public/user-library.json. Prints a message for the issue
// comment; exits with 1 when the issue is rejected.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { parseIssue, serializeLibrary, type UserLibraryFile } from '../src/library/userLibrary.ts'

const FILE = new URL('../public/user-library.json', import.meta.url)

interface IssueEvent {
  issue: { number: number; title: string; body: string | null; user: { login: string } }
}

function output(key: string, value: string) {
  const path = process.env.GITHUB_OUTPUT
  const line = `${key}<<EOF_SYNOPGIG\n${value}\nEOF_SYNOPGIG\n`
  if (path) appendFileSync(path, line)
  else process.stdout.write(`${key}: ${value}\n`)
}

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? process.argv[2], 'utf8')) as IssueEvent
const { issue } = event
const parsed = parseIssue(issue.body ?? '', issue.user.login)

if (!parsed.ok) {
  output('message', `❌ Matériel non ajouté : ${parsed.error}\n\nCorrigez le bloc JSON (ou reproposez le matériel depuis l’application), puis ouvrez une nouvelle issue.`)
  process.exit(1)
}

const lib = JSON.parse(readFileSync(FILE, 'utf8')) as UserLibraryFile
const id = `user-${issue.number}`
if (lib.entries.some((e) => e.id === id)) {
  output('message', 'Ce matériel est déjà dans la bibliothèque USER.')
  process.exit(0)
}
const { brand, model: name0, category, family, rackU, weight, groups } = parsed.value.model
const model = { brand, model: name0, category, family, rackU, weight, groups }
lib.entries.push({
  id,
  ...model,
  author: parsed.value.author,
  github: issue.user.login,
  createdAt: new Date().toISOString(),
  issue: issue.number,
})
writeFileSync(FILE, serializeLibrary(lib))
const name = `${model.brand ? `${model.brand} ` : ''}${model.model}`
output('name', name)
output(
  'message',
  `✅ **${name}** est ajouté à la bibliothèque USER, proposé par **${parsed.value.author}**.\n\nIl apparaîtra pour tout le monde dans quelques minutes (palette du synoptique, rubrique « Bibliothèque USER »). Merci !`,
)
