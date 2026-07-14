/** End-to-end contract for the optional TypeScript rename-symbol bridge. */

import type { LanguageService, LanguageServiceHost } from 'typescript'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const initPlugin = require(resolve(process.cwd(), 'typescript.cjs')) as (modules: { typescript: typeof ts }) => {
  create: (info: { languageService: LanguageService }) => LanguageService
}

const MARK = '/*rename*/'

interface RenameFixture {
  service: LanguageService
  files: Record<string, string>
  cursor: { fileName: string, position: number }
}

function fixture(cursorFile: 'design.ts' | 'consumer.ts'): RenameFixture {
  const marked = {
    'design.ts': `
      import { alpha, defineTokens, oklch } from '@mszr/vane-dux'

      export const t = defineTokens({ color: { ${cursorFile === 'design.ts' ? MARK : ''}brand: oklch(0.58, 0.2, 285) } })
        .derive(({ color }) => ({ color: { brandSoft: alpha(color.brand, 0.12) } }))
        .derive(({ color }) => ({ color: { brandHover: color.brand.mix('#000', 0.12) } }))
        .build()

      void t.color.brand
    `,
    'consumer.ts': `
      import { t } from './design'
      void t.color.${cursorFile === 'consumer.ts' ? MARK : ''}brand
    `,
    'other.ts': `
      import { defineTokens, oklch } from '@mszr/vane-dux'
      const other = defineTokens({ color: { brand: oklch(0.4, 0.1, 20) } }).build()
      void other.color.brand
    `,
  }

  return fixtureFromSources(marked, cursorFile)
}

function modularFixture(cursorFile: 'colors.ts' | 'consumer.ts'): RenameFixture {
  const marked = {
    'colors.ts': `
      import { alpha, defineTokens, oklch } from '@mszr/vane-dux'
      export const colors = defineTokens({ color: { ${cursorFile === 'colors.ts' ? MARK : ''}brand: oklch(0.58, 0.2, 285) } })
        .derive(({ color }) => ({ color: { brandSoft: alpha(color.brand, 0.12) } }))
    `,
    'metrics.ts': `
      import { defineTokens } from '@mszr/vane-dux'
      export const metrics = defineTokens({ space: { sm: '8px' } })
    `,
    'design.ts': `
      import { defineTokens } from '@mszr/vane-dux'
      import { colors } from './colors'
      import { metrics } from './metrics'
      export const t = defineTokens().compose(colors).compose(metrics)
        .derive(({ color, space }) => ({ control: { tint: color.brandSoft, gap: space.sm } }))
        .build()
    `,
    'consumer.ts': `
      import { t } from './design'
      void t.color.${cursorFile === 'consumer.ts' ? MARK : ''}brand
    `,
    'other.ts': `
      import { defineTokens } from '@mszr/vane-dux'
      const other = defineTokens({ color: { brand: '#f00' } }).build()
      void other.color.brand
    `,
  }

  return fixtureFromSources(marked, cursorFile)
}

function engineModularFixture(cursorFile: 'colors.ts' | 'consumer.ts'): RenameFixture {
  const marked = {
    'engine.ts': `
      import { createEngine } from '@mszr/vane-dux'
      export const de = createEngine()
    `,
    'colors.ts': `
      import { de } from './engine'
      export const colors = de.defineTokens({ color: { ${cursorFile === 'colors.ts' ? MARK : ''}brand: de.oklch(0.58, 0.2, 285) } })
        .derive(({ color }) => ({ color: { brandSoft: de.alpha(color.brand, 0.12) } }))
    `,
    'metrics.ts': `
      import { de } from './engine'
      export const metrics = de.defineTokens({ space: { sm: de.length.rem(0.5) } })
    `,
    'design.ts': `
      import { de } from './engine'
      import { colors } from './colors'
      import { metrics } from './metrics'
      export const ds = de.createSystem({
        tokens: de.defineTokens().compose(colors).compose(metrics),
      })
    `,
    'consumer.ts': `
      import { ds } from './design'
      void ds.t.color.${cursorFile === 'consumer.ts' ? MARK : ''}brand
    `,
  }

  return fixtureFromSources(marked, cursorFile)
}

function fixtureFromSources(marked: Record<string, string>, cursorFile: string): RenameFixture {
  const project = process.cwd()
  const virtualRoot = resolve(project, '__rename__')
  const cursorSource = marked[cursorFile]
  const cursorPosition = cursorSource.indexOf(MARK)
  const files = Object.fromEntries(Object.entries(marked).map(([name, source]) => [
    resolve(virtualRoot, name),
    source.replace(MARK, ''),
  ]))
  const configPath = resolve(project, 'tsconfig.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, project)
  const host: LanguageServiceHost = {
    getCompilationSettings: () => parsed.options,
    getCurrentDirectory: () => project,
    getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => [...parsed.fileNames, ...Object.keys(files)],
    getScriptSnapshot: (name) => {
      const text = files[name] ?? ts.sys.readFile(name)
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text)
    },
    getScriptVersion: () => '0',
    fileExists: name => name in files || ts.sys.fileExists(name),
    readFile: name => files[name] ?? ts.sys.readFile(name),
    readDirectory: ts.sys.readDirectory,
  }
  const native = ts.createLanguageService(host)

  return {
    service: initPlugin({ typescript: ts }).create({ languageService: native }),
    files,
    cursor: {
      fileName: resolve(virtualRoot, cursorFile),
      position: cursorPosition,
    },
  }
}

function renamed(fixture: RenameFixture): string[] {
  const info = fixture.service.getRenameInfo(fixture.cursor.fileName, fixture.cursor.position)
  expect(info.canRename).toBe(true)

  return (fixture.service.findRenameLocations(fixture.cursor.fileName, fixture.cursor.position, false, false, true) ?? [])
    .filter(location => location.fileName in fixture.files)
    .map(location => `${location.fileName.split('/').at(-1)}:${fixture.files[location.fileName].slice(location.textSpan.start, location.textSpan.start + location.textSpan.length)}`)
    .sort()
}

describe('token rename-symbol', () => {
  const expected = [
    'consumer.ts:brand',
    'design.ts:brand',
    'design.ts:brand',
    'design.ts:brand',
    'design.ts:brand',
  ]

  it('renames from the definition through every stage and consumer', () => {
    const project = fixture('design.ts')

    try {
      expect(renamed(project)).toEqual(expected)
    }
    finally {
      project.service.dispose()
    }
  })

  it('renames from a synthesized consumer property without crossing into another graph', () => {
    const project = fixture('consumer.ts')

    try {
      expect(renamed(project)).toEqual(expected)
    }
    finally {
      project.service.dispose()
    }
  })

  const modularExpected = [
    'colors.ts:brand',
    'colors.ts:brand',
    'consumer.ts:brand',
  ]

  it('preserves a source module identity through aggregate composition', () => {
    const project = modularFixture('colors.ts')

    try {
      expect(renamed(project)).toEqual(modularExpected)
    }
    finally {
      project.service.dispose()
    }
  })

  it('renames from an aggregate consumer back into the contributing module only', () => {
    const project = modularFixture('consumer.ts')

    try {
      expect(renamed(project)).toEqual(modularExpected)
    }
    finally {
      project.service.dispose()
    }
  })

  it('preserves rename identity through canonical engine modules and a finalized system', () => {
    const fromDefinition = engineModularFixture('colors.ts')
    const fromConsumer = engineModularFixture('consumer.ts')

    try {
      expect(renamed(fromDefinition)).toEqual(modularExpected)
      expect(renamed(fromConsumer)).toEqual(modularExpected)
    }
    finally {
      fromDefinition.service.dispose()
      fromConsumer.service.dispose()
    }
  })
})
