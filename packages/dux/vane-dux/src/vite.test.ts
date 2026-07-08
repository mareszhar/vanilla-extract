/**
 * The build plane: `*.style.ts` modules are evaluated at build time and leave
 * nothing behind — static CSS out, serialized exports in the bundle, zero
 * authoring code shipped ([dux-patterns.md §1], principle 6). Locked against
 * a real Vite build over the fixture app, plus the port label transform as a
 * unit.
 */

import type { Rollup } from 'vite'
import { fileURLToPath } from 'node:url'
import { applyPortLabels, vaneDuxPlugin } from '@mszr/vane-dux/vite'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

function local(path: string) {
  return fileURLToPath(new URL(path, import.meta.url))
}

describe('the vite build', () => {
  async function buildFixture() {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      root: local('./test-support/vite-app'),
      plugins: [vaneDuxPlugin({ identifiers: 'debug' })],
      resolve: {
        alias: {
          '@mszr/vane-dux/runtime': local('./runtime.ts'),
          '@mszr/vane-dux': local('./index.ts'),
        },
      },
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

  it('emits static CSS: classes, port fallbacks, and labeled port names', async () => {
    const { css } = await buildFixture()

    expect(css).toMatch(/\.track__[\w-]+ \{/)
    expect(css).toMatch(/\.fill__[\w-]+ \{/)

    // The export name reached the emitted variable via the label transform,
    // and the default rides the var() reference.
    expect(css).toMatch(/inline-size: calc\(var\(--vane-fraction__[\w-]+, 0\) \* 100%\)/)
    expect(css).toMatch(/background: var\(--vane-tint__[\w-]+, var\(--vane-color-brand\)\)/)
  })

  it('ships no authoring plane: exports are serialized, ports restored from meta', async () => {
    const { js } = await buildFixture()

    // The classes arrive as strings, the ports as restorePort(meta) calls.
    expect(js).toMatch(/track__[\w-]+/)
    expect(js).toMatch(/--vane-fraction__[\w-]+/)

    // Nothing from the build plane survives into app code.
    expect(js).not.toContain('setFileScope')
    expect(js).not.toContain('setAdapter')
    expect(js).not.toContain('createSystem')
    expect(js).not.toContain('@vanilla-extract')
  })
})

describe('applyPortLabels', () => {
  it('injects the export name into a bare port() call', () => {
    expect(applyPortLabels('export const fraction = port(0)'))
      .toBe('export const fraction = port(0, { label: \'fraction\' })')
  })

  it('injects into the system-bound form', () => {
    expect(applyPortLabels('export const gap = system.port(t.space.sm)'))
      .toBe('export const gap = system.port(t.space.sm, { label: \'gap\' })')
  })

  it('merges into existing options', () => {
    expect(applyPortLabels('export const angle = port(0, { as: \'deg\' })'))
      .toBe('export const angle = port(0, { label: \'angle\', as: \'deg\' })')
  })

  it('respects an explicit label', () => {
    const source = 'export const x = port(0, { label: \'custom\' })'
    expect(applyPortLabels(source)).toBe(source)
  })

  it('handles nested parens and strings in the default', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const template = 'export const w = port(`calc(${x} * (1 + 2))`)'
    // eslint-disable-next-line no-template-curly-in-string
    const labeled = 'export const w = port(`calc(${x} * (1 + 2))`, { label: \'w\' })'

    expect(applyPortLabels(template)).toBe(labeled)
    expect(applyPortLabels('export const s = port(\'a) b\')'))
      .toBe('export const s = port(\'a) b\', { label: \'s\' })')
  })

  it('labels several ports in one module', () => {
    const source = 'export const a = port(0)\nexport const b = port(\'4px\')\n'
    expect(applyPortLabels(source))
      .toBe('export const a = port(0, { label: \'a\' })\nexport const b = port(\'4px\', { label: \'b\' })\n')
  })

  it('leaves non-exported and unrelated calls alone', () => {
    const source = 'const local = port(0)\nexport const style = css({})\n'
    expect(applyPortLabels(source)).toBe(source)
  })
})
