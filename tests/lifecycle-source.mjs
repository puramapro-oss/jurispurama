import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const compiled = new Map()

// Run the actual application's callback, not a duplicate implementation.
export function callback(file, name, context, baseRef) {
  if (baseRef && !/^[a-f0-9]{40}$/.test(baseRef)) throw new Error('Expected a full commit SHA')
  const key = `${baseRef ?? 'worktree'}:${file}:${name}`
  if (!compiled.has(key)) {
    const text = baseRef
      ? execFileSync('git', ['show', `${baseRef}:${file}`], { encoding: 'utf8' })
      : readFileSync(resolve(file), 'utf8')
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let selected
    function visit(node) {
      if (name === 'effect' && ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect') {
        selected ??= node.arguments[0]
      } else if (ts.isVariableDeclaration(node) && node.name.getText(source) === name && node.initializer) {
        selected = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    assert.ok(selected, `${file}: ${name} must exist`)
    compiled.set(key, ts.transpileModule(`globalThis.actualCallback = ${selected.getText(source)}`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText)
  }
  vm.runInNewContext(compiled.get(key), context)
  return context.actualCallback
}

export function deferred() {
  let resolve, reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

export async function flush() {
  await Promise.resolve()
  await Promise.resolve()
}
