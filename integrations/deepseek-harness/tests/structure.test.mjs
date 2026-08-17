import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const root = new URL('../', import.meta.url)
test('bundle mounts exactly four Math Map Cordis plugin rows', async () => {
  const patch = await readFile(new URL('cordis.patch.yml', root), 'utf8')
  assert.equal((patch.match(/^    - id: cmath-/gmu) ?? []).length, 4)
  for (const id of ['cmath-math-map-core', 'cmath-paper-import-router', 'cmath-paper-import', 'cmath-math-map-ui']) assert.match(patch, new RegExp(`id: ${id}`))
  assert.match(patch, /id: cmath-math-map-ui\n      name: '@cmath\/dsh-math-map'/u)
})

test('package exposes the four plugins, client face, and bundle patch', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  for (const entry of ['./core', './router', './paper-import', './ui', './client']) assert.equal(typeof pkg.exports[entry], 'string')
  assert.equal(pkg.exports['./package.json'], './package.json')
  assert.equal(pkg.dsh.client.platform, 'web')
})

test('client bundle registers through the Harness module loader', async () => {
  const source = await readFile(new URL('lib/client.js', root), 'utf8')
  assert.doesNotMatch(source, /require\(["']zod["']\)/u)
  assert.match(source, /conversation\.view/u)
  let registration
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load(value) { registration = value } } },
  })
  assert.equal(registration?.id, '@cmath/dsh-math-map')
  assert.equal(typeof registration?.factory, 'function')
})

test('Harness workspace embeds the existing Math Map v5 application', async () => {
  const workspace = await readFile(new URL('src/workspace.tsx', root), 'utf8')
  const host = await readFile(new URL('src/ui.ts', root), 'utf8')
  assert.match(workspace, /<iframe/u)
  assert.match(workspace, /\/plugins\/cmath-math-map\//u)
  assert.match(host, /index-v5\.html/u)
  assert.match(host, /ctx\.webServer\.register/u)
})

test('paper import preserves provider failure details for benchmark diagnostics', async () => {
  const source = await readFile(new URL('src/paper-import.ts', root), 'utf8')
  assert.match(source, /finish\.kind === 'max-tokens'[\s\S]+return \{ content, finishReason: 'length' \}/u)
  assert.match(source, /failure.code/u)
  assert.match(source, /failure.message/u)
  assert.ok(source.includes('Math Map ${stage} call ended with ${finish.kind}${detail}'))
})

test('DeepSeek paper import disables reasoning and preserves the historical dynamic budget ceiling', async () => {
  const patch = await readFile(new URL('cordis.patch.yml', root), 'utf8')
  const paperImport = await readFile(new URL('src/paper-import.ts', root), 'utf8')
  const stageRoutes = patch.match(/(?:extract|integrate|assemble|repair): \{[^}]+\}/gu) ?? []
  assert.equal(stageRoutes.length, 4)
  for (const route of stageRoutes) {
    assert.match(route, /provider: deepseek-official/u)
    assert.match(route, /model: deepseek-v4-flash/u)
    assert.match(route, /reasoningEffort: off/u)
    assert.match(route, /maxTokens: 32000/u)
  }
  assert.match(paperImport, /maxTokens: Math\.min\(request\.maxTokens, route\.maxTokens\)/u)
  assert.match(paperImport, /usage: jsonUsage\(assembler\.usage\)/u)
  assert.match(paperImport, /durationMs: Math\.round/u)
})
