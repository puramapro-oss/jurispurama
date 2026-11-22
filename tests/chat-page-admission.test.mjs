import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const filename = 'src/app/(dashboard)/chat/[caseId]/page.tsx'
const source = ts.createSourceFile(filename, readFileSync(new URL(`../${filename}`, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let submit, disabled
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handleSubmit') submit = node.initializer.getText(source)
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'ChatInput') {
    disabled = node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(source) === 'disabled').initializer.expression.getText(source)
  }
  ts.forEachChild(node, visit)
}
visit(source)
assert.ok(submit); assert.ok(disabled)

for (const state of [
  { loading: true, streaming: false },
  { loading: false, streaming: true },
]) {
  test(`actual page preserves its draft and disables submission during ${state.loading ? 'history loading' : 'streaming'}`, () => {
    const changes = [], sends = []
    const context = { ...state, input: 'Brouillon à conserver', setInput: value => changes.push(value), sendMessage: value => sends.push(value) }
    vm.runInNewContext(`(${submit})()`, context)
    assert.deepEqual(changes, [])
    assert.deepEqual(sends, [])
    assert.equal(vm.runInNewContext(disabled, context), true)
  })
}

test('actual page sends and clears a valid draft once the history is ready', () => {
  const changes = [], sends = []
  const context = { loading: false, streaming: false, input: '  Question prête  ', setInput: value => changes.push(value), sendMessage: value => sends.push(value) }
  vm.runInNewContext(`(${submit})()`, context)
  assert.deepEqual(changes, [''])
  assert.deepEqual(sends, ['Question prête'])
  assert.equal(vm.runInNewContext(disabled, context), false)
})
