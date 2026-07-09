/**
 * The build plane: `*.style.ts` modules are evaluated at build time and leave
 * nothing behind — static CSS out, serialized exports in the bundle, zero
 * authoring code shipped ([dux-patterns.md §1], principle 6). Locked against
 * a real Vite build over the fixture app, a real dev server for the HMR
 * contract (stable ids, in-place swaps), and the debug-name transform as a
 * unit.
 */

import type { Rollup, ViteDevServer } from 'vite'
import { Buffer } from 'node:buffer'
import { cp, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyDebugNames, styleExportNames, vaneDuxPlugin } from '@mszr/vane-dux/vite'
import { build, createServer } from 'vite'
import { afterEach, describe, expect, it } from 'vitest'

function local(path: string) {
  return fileURLToPath(new URL(path, import.meta.url))
}

const aliases = {
  '@mszr/vane-dux/runtime': local('./runtime.ts'),
  '@mszr/vane-dux': local('./index.ts'),
}

describe('the vite build', () => {
  async function buildFixture() {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      root: local('./test-support/vite-app'),
      plugins: [vaneDuxPlugin({ identifiers: 'debug' })],
      resolve: { alias: aliases },
      build: {
        write: false,
        minify: false,
        lib: {
          entry: local('./test-support/vite-app/entry.ts'),
          formats: ['es'],
          fileName: 'entry',
        },
      },
    })

    const { output } = (Array.isArray(result) ? result[0] : result) as Rollup.RollupOutput
    const chunk = output.find(item => item.type === 'chunk')
    const asset = output.find(item => item.type === 'asset' && item.fileName.endsWith('.css'))
    const css = asset?.type === 'asset' ? String(asset.source) : ''

    return { js: chunk?.type === 'chunk' ? chunk.code : '', css }
  }

  it('emits static CSS with declaration-name debug ids — no explicit id in the fixture', async () => {
    const { css } = await buildFixture()

    expect(css).toMatch(/\.track__[\w-]+ \{/)
    expect(css).toMatch(/\.fill__[\w-]+ \{/)

    // The export name reached the emitted variable via the debug-name
    // transform, and the default rides the var() reference.
    expect(css).toMatch(/inline-size: calc\(var\(--vane-fraction__[\w-]+, 0\) \* 100%\)/)
    expect(css).toMatch(/background: var\(--vane-tint__[\w-]+, var\(--vane-color-brand\)\)/)
  })

  it('emits recipe classes per arm, named for the recipe', async () => {
    const { css } = await buildFixture()

    expect(css).toMatch(/\.button__[\w-]+ \{/)
    expect(css).toMatch(/\.button_intent_ghost__[\w-]+ \{/)
    expect(css).toMatch(/\.button_pill__[\w-]+ \{/)

    // The module-local published port got its declaration name too.
    expect(css).toMatch(/padding-inline: var\(--vane-paddingX__[\w-]+, var\(--vane-space-sm\)\)/)
  })

  it('ships no authoring plane: exports are serialized, handles restored from tables', async () => {
    const { js } = await buildFixture()

    expect(js).toMatch(/track__[\w-]+/)
    expect(js).toMatch(/--vane-fraction__[\w-]+/)
    expect(js).toContain('restoreRecipe')

    // Nothing from the build plane survives into app code.
    expect(js).not.toContain('setFileScope')
    expect(js).not.toContain('setAdapter')
    expect(js).not.toContain('createSystem')
    expect(js).not.toContain('@vanilla-extract')
  })

  it('a restored recipe resolves at runtime: classes, defaults, published ports', async () => {
    const { js } = await buildFixture()
    const bundle = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

    expect(bundle.ghostPill).toMatch(/^button__[\w-]+ button_intent_ghost__[\w-]+ button_pill__[\w-]+$/)
    expect(bundle.button()).toMatch(/^button__[\w-]+ button_intent_brand__[\w-]+$/)
    expect(bundle.button.variants).toEqual({ intent: ['brand', 'ghost'] })
    expect(Object.keys(bundle.themedPadding)[0]).toMatch(/^--vane-paddingX__[\w-]+$/)
  })

  it('restored atoms resolve at runtime from their precompiled tables', async () => {
    const { js } = await buildFixture()
    const bundle = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

    expect(bundle.stackedGap).toMatch(/^atoms_stack__[\w-]+ atoms_gap_sm__[\w-]+$/)
    expect(bundle.atoms({ gap: 'sm' })).toMatch(/^atoms_gap_sm__[\w-]+$/)
  })
})

describe('hmr', () => {
  let server: ViteDevServer | undefined

  afterEach(async () => {
    await server?.close()
    server = undefined
  })

  async function serveFixtureCopy() {
    // realpath: Vite resolves modules to real paths; macOS tmpdir is a symlink.
    const root = await realpath(await mkdtemp(join(tmpdir(), 'vane-hmr-')))
    await cp(local('./test-support/vite-app'), root, { recursive: true })
    // The substrate walks up for a named package.json; the copy needs its own.
    await writeFile(join(root, 'package.json'), '{ "name": "vane-hmr-fixture", "type": "module" }')

    server = await createServer({
      configFile: false,
      logLevel: 'silent',
      root,
      plugins: [vaneDuxPlugin({ identifiers: 'debug' })],
      resolve: { alias: aliases },
      server: { middlewareMode: true, hmr: false, watch: null },
      optimizeDeps: { noDiscovery: true },
    })

    return { root, server }
  }

  /** The changed file's HMR pass, deterministically: our hook + invalidation. */
  async function hotUpdate(devServer: ViteDevServer, file: string) {
    // The instance wired into the server holds the dependency index.
    const wired = devServer.config.plugins.find(entry => entry.name === 'vane-dux-style-ts')!
    const modules = [...devServer.moduleGraph.getModulesByFile(file) ?? []]
    const handler = (typeof wired.handleHotUpdate === 'object'
      ? wired.handleHotUpdate.handler
      : wired.handleHotUpdate) as unknown as (ctx: object) => Promise<unknown> | unknown
    const affected = await handler({
      file,
      server: devServer,
      modules,
      timestamp: Date.now(),
      read: () => readFile(file, 'utf-8'),
    })

    for (const moduleNode of (affected as Iterable<never> | undefined) ?? modules)
      devServer.moduleGraph.invalidateModule(moduleNode)

    return affected as Array<{ file: string | null }> | undefined
  }

  it('a style edit serves fresh CSS under the same virtual id — swap in place, never stack', async () => {
    const { root, server: devServer } = await serveFixtureCopy()
    const styleUrl = '/progress.style.ts'
    const virtualId = `${join(root, 'progress.style.ts')}.vane.css`

    const first = await devServer.transformRequest(styleUrl)
    // Vite serves the stable id root-relative — no content hash in the URL.
    expect(first?.code).toContain('import "/progress.style.ts.vane.css"')
    expect(first?.code).toContain('import.meta.hot.accept()')

    expect((await devServer.transformRequest(virtualId))?.code).toContain('block-size: 100%')

    const file = join(root, 'progress.style.ts')
    await writeFile(file, (await readFile(file, 'utf-8')).replace('\'100%\'', '\'50%\''))
    await hotUpdate(devServer, file)

    const second = await devServer.transformRequest(styleUrl)
    // The import is the same stable id — the client's style tag gets replaced.
    expect(second?.code).toContain('import "/progress.style.ts.vane.css"')

    const refreshed = await devServer.transformRequest(virtualId)
    expect(refreshed?.code).toContain('block-size: 50%')
    expect(refreshed?.code).not.toContain('block-size: 100%')
  })

  it('editing a bundled dependency hot-updates every style module built on it', async () => {
    const { root, server: devServer } = await serveFixtureCopy()

    await devServer.transformRequest('/progress.style.ts')
    await devServer.transformRequest('/button.style.ts')

    const systemFile = join(root, 'system.style.ts')
    await writeFile(systemFile, (await readFile(systemFile, 'utf-8')).replace('#635bff', '#ff0000'))

    const affected = await hotUpdate(devServer, systemFile)
    const affectedFiles = (affected ?? []).map(moduleNode => moduleNode.file)

    // Both dependents re-evaluate; their fresh CSS lands under the same ids.
    expect(affectedFiles).toContain(join(root, 'progress.style.ts'))
    expect(affectedFiles).toContain(join(root, 'button.style.ts'))

    await devServer.transformRequest('/progress.style.ts')
    const refreshed = await devServer.transformRequest(`${join(root, 'system.style.ts')}.vane.css`)
    expect(refreshed?.code).toContain('#ff0000')
  })
})

describe('auto-imports', () => {
  it('styleExportNames reads every export form', () => {
    const source = `
      import { createSystem } from '@mszr/vane-dux'
      export const { t, css, recipe: makeRecipe } = createSystem({ tokens: {} })
      export const brand = '#635bff'
      export function helper() {}
      const local = 1
      export { local, local as alias }
      export type { VaneProps } from '@mszr/vane-dux'
    `

    expect(styleExportNames(source).sort())
      .toEqual(['alias', 'brand', 'css', 'helper', 'local', 'makeRecipe', 't'])
  })

  it('an unbound css/t in a style module resolves to the configured system', async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'vane-auto-')))
    await cp(local('./test-support/vite-app/system.style.ts'), join(root, 'system.style.ts'))
    await writeFile(join(root, 'package.json'), '{ "name": "vane-auto-fixture", "type": "module" }')
    // No imports at all — `css` and `t` arrive through the auto-import shim.
    await writeFile(join(root, 'card.style.ts'), 'export const card = css({ padding: t.space.sm })\n')
    await writeFile(join(root, 'entry.ts'), 'export { card } from \'./card.style\'\n')

    const result = await build({
      configFile: false,
      logLevel: 'silent',
      root,
      plugins: [vaneDuxPlugin({
        identifiers: 'debug',
        autoImports: { from: join(root, 'system.style.ts') },
      })],
      resolve: { alias: aliases },
      build: {
        write: false,
        minify: false,
        lib: { entry: join(root, 'entry.ts'), formats: ['es'], fileName: 'entry' },
      },
    })

    const { output } = (Array.isArray(result) ? result[0] : result) as Rollup.RollupOutput
    const asset = output.find(item => item.type === 'asset' && item.fileName.endsWith('.css'))
    const css = asset?.type === 'asset' ? String(asset.source) : ''

    expect(css).toMatch(/\.card__[\w-]+ \{/)
    expect(css).toContain('padding: var(--vane-space-sm)')
  })
})

describe('applyDebugNames', () => {
  it('injects the export name into a bare port() call', () => {
    expect(applyDebugNames('export const fraction = port(0)'))
      .toBe('export const fraction = port(0, { label: \'fraction\' })')
  })

  it('injects into the system-bound form', () => {
    expect(applyDebugNames('export const gap = system.port(t.space.sm)'))
      .toBe('export const gap = system.port(t.space.sm, { label: \'gap\' })')
  })

  it('labels module-local ports — the published-ports pattern', () => {
    expect(applyDebugNames('const paddingX = port(t.space.md)'))
      .toBe('const paddingX = port(t.space.md, { label: \'paddingX\' })')
  })

  it('merges into existing options', () => {
    expect(applyDebugNames('export const angle = port(0, { as: \'deg\' })'))
      .toBe('export const angle = port(0, { label: \'angle\', as: \'deg\' })')
  })

  it('respects an explicit label', () => {
    const source = 'export const x = port(0, { label: \'custom\' })'
    expect(applyDebugNames(source)).toBe(source)
  })

  it('appends debug ids to css, recipe, anatomy, and keyframes calls', () => {
    expect(applyDebugNames('export const card = css({ padding: 8 })'))
      .toBe('export const card = css({ padding: 8 }, \'card\')')
    expect(applyDebugNames('export const button = recipe({ base: {} })'))
      .toBe('export const button = recipe({ base: {} }, \'button\')')
    expect(applyDebugNames('const dialog = anatomy({ parts: [\'root\'] })'))
      .toBe('const dialog = anatomy({ parts: [\'root\'] }, \'dialog\')')
    expect(applyDebugNames('const fade = system.keyframes({ from: { opacity: 0 } })'))
      .toBe('const fade = system.keyframes({ from: { opacity: 0 } }, \'fade\')')
  })

  it('respects an explicit debug id', () => {
    const source = 'export const card = css({ padding: 8 }, \'Card\')'
    expect(applyDebugNames(source)).toBe(source)
  })

  it('handles nested parens and strings in arguments', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const template = 'export const w = port(`calc(${x} * (1 + 2))`)'
    // eslint-disable-next-line no-template-curly-in-string
    const labeled = 'export const w = port(`calc(${x} * (1 + 2))`, { label: \'w\' })'

    expect(applyDebugNames(template)).toBe(labeled)
    expect(applyDebugNames('export const s = port(\'a) b\')'))
      .toBe('export const s = port(\'a) b\', { label: \'s\' })')
    expect(applyDebugNames('export const c = css({ content: \'","\' })'))
      .toBe('export const c = css({ content: \'","\' }, \'c\')')
  })

  it('names several declarations in one module', () => {
    const source = 'export const a = port(0)\nconst b = css({})\n'
    expect(applyDebugNames(source))
      .toBe('export const a = port(0, { label: \'a\' })\nconst b = css({}, \'b\')\n')
  })

  it('leaves unrelated calls alone', () => {
    const source = 'export const system = createSystem({ tokens: {} })\nconst n = Math.max(1, 2)\n'
    expect(applyDebugNames(source)).toBe(source)
  })
})
