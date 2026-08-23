/**
 * Scan lexical mécanique NIYAMA §0.3 — "lexique interdit scanné mécaniquement sur
 * tout le texte de chaque app". Parcourt `src/` et signale toute ligne matchant une
 * entrée de `src/lib/legal/forbidden-lexicon.ts` (frontière JURIS, promesses de
 * résultat garanti, etc.).
 *
 * Usage : npm run scan:lexicon
 * Exit code 1 si au moins une occurrence est trouvée (utilisable en CI/gate).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { FORBIDDEN_LEXICON } from '../lib/legal/forbidden-lexicon'

const ROOT = join(__dirname, '..', '..')
const SRC_DIR = join(ROOT, 'src')

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mdx', '.md'])
const EXCLUDED_DIR_NAMES = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '__tests__',
  'tests',
])
// Fichiers qu'on ne scanne jamais : le lexique lui-même (contient les patterns en
// clair) et ce scanner (contient les explications des patterns).
const EXCLUDED_FILES = new Set([
  join(SRC_DIR, 'lib', 'legal', 'forbidden-lexicon.ts'),
  join(SRC_DIR, 'scripts', 'scan-forbidden-lexicon.ts'),
])

interface Finding {
  file: string
  line: number
  ruleId: string
  reason: string
  excerpt: string
}

function listFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIR_NAMES.has(entry)) continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      listFiles(full, acc)
    } else if (SCANNED_EXTENSIONS.has(extname(full)) && !EXCLUDED_FILES.has(full)) {
      acc.push(full)
    }
  }
  return acc
}

function scanFile(file: string): Finding[] {
  const findings: Finding[] = []
  const content = readFileSync(file, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    for (const entry of FORBIDDEN_LEXICON) {
      // reset lastIndex not needed: pattern has no global flag, RegExp.test is safe to reuse
      if (entry.pattern.test(line)) {
        findings.push({
          file: relative(ROOT, file),
          line: idx + 1,
          ruleId: entry.id,
          reason: entry.reason,
          excerpt: line.trim().slice(0, 160),
        })
      }
    }
  })
  return findings
}

function main() {
  const files = listFiles(SRC_DIR)
  const allFindings = files.flatMap(scanFile)

  if (allFindings.length === 0) {
    console.warn(
      `[scan:lexicon] OK — ${files.length} fichiers scannés, 0 occurrence du lexique interdit (${FORBIDDEN_LEXICON.length} règles).`
    )
    process.exit(0)
  }

  console.error(
    `[scan:lexicon] ÉCHEC — ${allFindings.length} occurrence(s) du lexique interdit trouvée(s) sur ${files.length} fichiers scannés :\n`
  )
  for (const f of allFindings) {
    console.error(`  ${f.file}:${f.line} [${f.ruleId}]`)
    console.error(`    "${f.excerpt}"`)
    console.error(`    → ${f.reason}\n`)
  }
  process.exit(1)
}

main()
