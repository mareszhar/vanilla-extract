/**
 * The vane-dux Vite plugin — evaluates `*.style.ts` at build time and emits
 * static CSS ([dux-patterns.md §1], [dux-workspace.md §3]). App code never
 * sees an authoring call: a style module's exports arrive as serialized
 * classes, ports, and metadata, and its CSS arrives as a virtual `.vane.css`
 * module the bundler treats like any stylesheet.
 *
 * The pipeline is the substrate's proven integration model (the one its
 * webpack/esbuild/next plugins ship on): esbuild bundles the style module
 * with port labels and file scopes injected, the bundle is evaluated
 * in-process against the css adapter, and the emitted CSS rides a `?source=`
 * query on the virtual id. The substrate's newer vite-node compiler is not
 * reusable here — its file filter is hardcoded to `*.css.ts` at every level.
 * If that filter ever becomes configurable upstream, this plugin can move
 * over without a public change.
 *
 * Two deliberate deviations from the substrate's `processVanillaFile`:
 *
 * - **Substrate imports resolve from vane-dux, not the user's app.** The seam
 *   rule means users never install `@vanilla-extract/*` themselves, so the
 *   bundle's externals are rewritten to absolute paths resolved from here —
 *   under strict package isolation (pnpm) a bare specifier would not resolve
 *   from the evaluated file's directory.
 * - **The adapter binds in-process**, not through a `require` inside the
 *   evaluated source, guaranteeing the bundle and the plugin share one css
 *   instance.
 *
 * The plugin composes two layers:
 * 1. The `*.style.ts` processor described above.
 * 2. The vanilla-extract plugin itself, for any `*.css.ts` files that coexist.
 */

import type { Adapter } from '@vanilla-extract/css'
import type { Plugin, PluginOption, ResolvedConfig } from 'vite'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { removeAdapter, setAdapter } from '@vanilla-extract/css/adapter'
import { transformCss } from '@vanilla-extract/css/transformCss'
import {
  addFileScope,
  getPackageInfo,
  getSourceFromVirtualCssFile,
  normalizePath,
  parseFileScope,
  serializeCss,
  serializeVanillaModule,
  stringifyFileScope,
} from '@vanilla-extract/integration'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { build as esbuild } from 'esbuild'

export type VaneIdentifierMode = 'debug' | 'short'
export type VaneCompilerMode = 'transform' | 'emitCss' | 'inlineCssInDev'

export interface VaneViteOptions {
  /** Emitted class/variable naming; defaults to `debug` in dev, `short` in production. */
  identifiers?: VaneIdentifierMode
  /** Forwarded to the composed vanilla-extract plugin — `*.css.ts` coexistence only. */
  unstableMode?: VaneCompilerMode
}

/** `*.style.ts` (and variants) — vane-dux's authoring file extension. */
const styleFileFilter = /\.style\.(?:js|cjs|mjs|jsx|ts|tsx)(?:\?used)?$/

/** The virtual stylesheet a compiled style module imports; CSS rides the query. */
const virtualCssFileFilter = /\.vane\.css\?source=/

export function vaneDuxPlugin(options: VaneViteOptions = {}): PluginOption[] {
  let config: ResolvedConfig

  const identOption = () =>
    options.identifiers ?? (config.mode === 'production' ? 'short' : 'debug')

  const styleTsPlugin: Plugin = {
    name: 'vane-dux-style-ts',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    async transform(_code, id) {
      const [validId] = id.split('?')

      if (!styleFileFilter.test(validId))
        return null

      const root = config.root
      const filePath = normalizePath(validId)

      const { source, watchFiles } = await bundleStyleModule({
        filePath,
        root,
        alias: viteAliasToEsbuild(config),
      })

      for (const file of watchFiles) {
        if (!file.includes('node_modules') && normalizePath(file) !== filePath)
          this.addWatchFile(file)
      }

      const { exports, cssByFileScope, unusedCompositionRegex }
        = evaluateStyleModule(source, filePath, identOption())

      const cssImports: string[] = []

      for (const [serializedFileScope, css] of cssByFileScope) {
        const fileScope = parseFileScope(serializedFileScope)
        const virtualId = `${normalizePath(join(root, fileScope.filePath))}.vane.css?source=${await serializeCss(css)}`
        cssImports.push(`import '${virtualId}';`)
      }

      return {
        code: serializeVanillaModule(cssImports, exports, unusedCompositionRegex),
        map: { mappings: '' },
      }
    },

    resolveId(source) {
      if (!virtualCssFileFilter.test(source))
        return null

      return source
    },

    async load(id) {
      if (!virtualCssFileFilter.test(id))
        return null

      const { source } = await getSourceFromVirtualCssFile(id)
      return source
    },
  }

  return [
    styleTsPlugin,
    ...vanillaExtractPlugin({
      identifiers: options.identifiers,
      unstable_mode: options.unstableMode,
    }),
  ]
}

// ─── Bundling ────────────────────────────────────────────────────────────────

/** Resolves the substrate from vane-dux's own context — see the module docstring. */
const substrateRequire = createRequire(import.meta.url)

interface BundleStyleModuleParams {
  filePath: string
  root: string
  alias: Record<string, string>
}

/**
 * Bundle one style module for evaluation: esbuild inlines its import graph,
 * every `*.style.ts` file gets port labels and a file scope, and the
 * substrate stays external (as absolute paths) so the evaluated bundle shares
 * the css adapter instance with this plugin. vane-dux itself is bundled in —
 * it ships ESM-only, and the evaluation sandbox is CommonJS.
 */
async function bundleStyleModule({ filePath, root, alias }: BundleStyleModuleParams): Promise<{
  source: string
  watchFiles: string[]
}> {
  const packageName = getPackageInfo(root).name

  const result = await esbuild({
    entryPoints: [filePath],
    metafile: true,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    absWorkingDir: root,
    alias,
    plugins: [
      {
        name: 'vane-dux-substrate-externals',
        setup(build) {
          build.onResolve({ filter: /^(?:@vanilla-extract\/|lightningcss$)/ }, args => ({
            path: substrateRequire.resolve(args.path),
            external: true,
          }))
        },
      },
      {
        name: 'vane-dux-filescope',
        setup(build) {
          build.onLoad({ filter: /\.style\.(js|cjs|mjs|jsx|ts|tsx)$/ }, async ({ path }) => {
            const { readFile } = await import('node:fs/promises')
            const original = await readFile(path, 'utf-8')

            const source = addFileScope({
              source: applyPortLabels(original),
              filePath: path,
              rootPath: root,
              packageName,
            })

            return {
              contents: source,
              loader: /\.tsx?$/i.test(path) ? 'ts' : undefined,
              resolveDir: dirname(path),
            }
          })
        },
      },
    ],
  })

  const { outputFiles, metafile } = result

  if (!outputFiles || outputFiles.length !== 1)
    throw new Error(`Invalid style-module compilation for ${filePath}`)

  return {
    source: outputFiles[0].text,
    watchFiles: Object.keys(metafile.inputs).map(file => join(root, file)),
  }
}

/** The string-keyed subset of the resolved Vite aliases, for esbuild's resolver. */
function viteAliasToEsbuild(config: ResolvedConfig): Record<string, string> {
  const entries = config.resolve.alias
    .filter(entry => typeof entry.find === 'string' && typeof entry.replacement === 'string')
    .map(entry => [entry.find, entry.replacement])

  return Object.fromEntries(entries)
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

interface EvaluatedStyleModule {
  exports: Record<string, unknown>
  /** Serialized file scope → transformed CSS, in evaluation order. */
  cssByFileScope: Map<string, string>
  unusedCompositionRegex: RegExp | null
}

/**
 * Run the bundle against the css adapter and transform what it emitted —
 * the same collection contract as the substrate's `processVanillaFile`,
 * evaluated in-process. The adapter is module-global substrate state, but
 * evaluation and transformation are fully synchronous, so concurrent
 * `transform` hooks cannot interleave inside the bound window.
 */
function evaluateStyleModule(source: string, filePath: string, identOption: VaneIdentifierMode): EvaluatedStyleModule {
  type Css = Parameters<Adapter['appendCss']>[0]
  type Composition = Parameters<Adapter['registerComposition']>[0]

  const cssObjsByFileScope = new Map<string, Css[]>()
  const localClassNames = new Set<string>()
  const composedClassLists: Composition[] = []
  const usedCompositions = new Set<string>()

  const adapter: Adapter = {
    appendCss: (css, fileScope) => {
      const serializedFileScope = stringifyFileScope(fileScope)
      const cssObjs = cssObjsByFileScope.get(serializedFileScope) ?? []
      cssObjs.push(css)
      cssObjsByFileScope.set(serializedFileScope, cssObjs)
    },
    registerClassName: className => void localClassNames.add(className),
    registerComposition: composition => void composedClassLists.push(composition),
    markCompositionUsed: identifier => void usedCompositions.add(identifier),
    onEndFileScope: () => {},
    getIdentOption: () => identOption,
  }

  setAdapter(adapter)

  const cssByFileScope = new Map<string, string>()

  try {
    const exports = executeBundle(source, filePath)

    for (const [serializedFileScope, cssObjs] of cssObjsByFileScope) {
      const css = transformCss({
        localClassNames: [...localClassNames],
        composedClassLists,
        cssObjs,
      }).join('\n')

      cssByFileScope.set(serializedFileScope, css)
    }

    const unusedCompositions = composedClassLists
      .filter(({ identifier }) => !usedCompositions.has(identifier))
      .map(({ identifier }) => identifier)

    return {
      exports,
      cssByFileScope,
      unusedCompositionRegex: unusedCompositions.length > 0
        ? new RegExp(`(${unusedCompositions.join('|')})\\s`, 'g')
        : null,
    }
  }
  finally {
    removeAdapter()
  }
}

/** Execute the CommonJS bundle; externals are absolute paths, so any `require` works. */
function executeBundle(source: string, filePath: string): Record<string, unknown> {
  const module = { exports: {} as Record<string, unknown> }

  // eslint-disable-next-line no-new-func
  const run = new Function('require', 'module', 'exports', '__filename', '__dirname', source)
  run(createRequire(filePath), module, module.exports, filePath, dirname(filePath))

  return module.exports
}

// ─── The port label transform ────────────────────────────────────────────────

/**
 * Inject export names as `{ label: 'X' }` in `port()` calls, so the emitted
 * variable's debug label follows the export — rename-symbol renames everything
 * ([dux-spec-ports.md §1]). A light bracket-matching pass, not a Babel plugin:
 * `port()` is the one function that needs it, and the common form is one line.
 * When the pass can't parse a call, it leaves it alone — the port still works
 * with a hash-only label.
 *
 * Handles:
 * - `export const X = port(value)` → `export const X = port(value, { label: 'X' })`
 * - `export const X = port(value, { as: 'deg' })` → adds `label` to the options
 * - `export const X = IDENT.port(...)` — the system-bound form
 *
 * Skips calls that already have a `label` option.
 */
export function applyPortLabels(source: string): string {
  let output = source
  let offset = 0

  const pattern = /export\s+const\s+(\w+)\s*=\s*(?:\w+\.)?port\s*\(/g

  for (const match of source.matchAll(pattern)) {
    const exportName = match[1]
    const callStart = match.index! + match[0].lastIndexOf('(')
    const callEnd = findMatchingParen(source, callStart)

    if (callEnd === -1)
      continue

    const args = source.slice(callStart + 1, callEnd)
    const { hasLabel, commaIndex } = analyzeArgs(args)

    if (hasLabel)
      continue

    const replacement = buildReplacement(args, commaIndex, exportName)
    const before = output.slice(0, callStart + 1 + offset)
    const after = output.slice(callEnd + offset)
    output = before + replacement + after
    offset += replacement.length - args.length
  }

  return output
}

/** Find the closing paren that matches the opening paren at `start`. */
function findMatchingParen(text: string, start: number): number {
  let depth = 0
  let quote: string | undefined

  for (let i = start; i < text.length; i++) {
    const char = text[i]

    if (quote !== undefined) {
      if (char === quote && text[i - 1] !== '\\')
        quote = undefined
      continue
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char
    }
    else if (char === '(') {
      depth++
    }
    else if (char === ')') {
      depth--
      if (depth === 0)
        return i
    }
  }

  return -1
}

/** Whether the arguments already contain a `label` key, and where the top-level comma is. */
function analyzeArgs(args: string): { hasLabel: boolean, commaIndex: number } {
  let depth = 0
  let quote: string | undefined
  let commaIndex = -1

  for (let i = 0; i < args.length; i++) {
    const char = args[i]

    if (quote !== undefined) {
      if (char === quote && args[i - 1] !== '\\')
        quote = undefined
      continue
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char
    }
    else if (char === '(' || char === '[' || char === '{') {
      depth++
    }
    else if (char === ')' || char === ']' || char === '}') {
      depth--
    }
    else if (char === ',' && depth === 0) {
      commaIndex = i
      break
    }
  }

  const hasLabel = /\blabel\s*:/.test(args)
  return { hasLabel, commaIndex }
}

/** Build the replacement arguments with the `label` option injected. */
function buildReplacement(args: string, commaIndex: number, exportName: string): string {
  const trimmed = args.trim()

  if (trimmed === '')
    return `{ label: '${exportName}' }`

  // One argument — append the label option.
  if (commaIndex === -1)
    return `${args}, { label: '${exportName}' }`

  // Two arguments — inject `label` into the existing options object.
  const before = args.slice(0, commaIndex)
  const after = args.slice(commaIndex + 1)
  const optionsTrimmed = after.trim()

  if (optionsTrimmed.startsWith('{')) {
    // Add `label` as the first key in the object.
    const inner = optionsTrimmed.replace(/^\{\s*/, `{ label: '${exportName}', `)
    return `${before}, ${inner}`
  }

  // The second argument is not an object literal — wrap it.
  return `${before}, { label: '${exportName}' }`
}

export const vanePlugin = vaneDuxPlugin
export default vaneDuxPlugin
