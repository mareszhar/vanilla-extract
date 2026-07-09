/**
 * The vane-dux Vite plugin — evaluates `*.style.ts` at build time and emits
 * static CSS ([dux-patterns.md §1], [dux-workspace.md §3]). App code never
 * sees an authoring call: a style module's exports arrive as serialized
 * classes, ports, recipes, and metadata, and its CSS arrives as a virtual
 * `.vane.css` module the bundler treats like any stylesheet.
 *
 * The pipeline is the substrate's proven integration model (the one its
 * webpack/esbuild/next plugins ship on): esbuild bundles the style module
 * with debug names and file scopes injected, and the bundle is evaluated
 * in-process against the css adapter. The substrate's newer vite-node
 * compiler is not reusable here — its file filter is hardcoded to `*.css.ts`
 * at every level. If that filter ever becomes configurable upstream, this
 * plugin can move over without a public change.
 *
 * **HMR is in-place, never stacked.** Each style file's CSS lives behind a
 * stable* virtual id (`/path/File.style.ts.vane.css`) whose content is
 * served from an in-memory store — so when a save changes the CSS, the same
 * id delivers the new text and Vite's client replaces the existing style tag
 * instead of appending a second one. Style modules self-accept in dev (an
 * edit that only moves declarations swaps CSS with no reload); when the
 * export shape* changes, importers hold stale bindings, so the plugin sends
 * one full reload instead. Files a style module bundles in (tokens, shared
 * styles) are watched and mapped back to their dependents, so editing a
 * token file hot-updates every style module built on it.
 *
 * **The manifest rides the same evaluation** ([dux-spec-introspection.md §2]):
 * each pass drains the inspection channel, and the projection lands in
 * `.vane/manifest.json` — debounced in dev, once per build — plus the live
 * `/__vane/` endpoints (`manifest.json`, and the DevTools view over it).
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
 *   instance ([bundling section] on how instance identity is pinned).
 *
 * The plugin composes two layers:
 * 1. The `*.style.ts` processor described above.
 * 2. The vanilla-extract plugin itself, for any `*.css.ts` files that coexist.
 */

import type { Adapter } from '@vanilla-extract/css'
import type { Plugin, PluginOption, ResolvedConfig, ViteDevServer } from 'vite'
import type { VaneInspectRecord } from './internal/inspect'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join } from 'node:path'
import { transformCss } from '@vanilla-extract/css/transformCss'
import {
  addFileScope,
  getPackageInfo,
  normalizePath,
  parseFileScope,
  serializeVanillaModule,
  stringifyFileScope,
} from '@vanilla-extract/integration'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { build as esbuild } from 'esbuild'
import { collectInspection } from './internal/inspect'
import { devtoolsPage } from './introspect/devtools'
import { buildManifest } from './introspect/manifest'

export type VaneIdentifierMode = 'debug' | 'short'
export type VaneCompilerMode = 'transform' | 'emitCss' | 'inlineCssInDev'

export interface VaneAutoImports {
  /** The module the names come from — an absolute path to the system style module. */
  from: string
  /** The exported names to auto-import; detected from the file when omitted. */
  names?: readonly string[]
}

export interface VaneViteOptions {
  /** Emitted class/variable naming; defaults to `debug` in dev, `short` in production. */
  identifiers?: VaneIdentifierMode
  /** Forwarded to the composed vanilla-extract plugin — `*.css.ts` coexistence only. */
  unstableMode?: VaneCompilerMode
  /**
   * Auto-import the system's bound functions inside evaluated style modules
   * ([dux-spec-vue.md §4]): an unbound `css` or `t` resolves to the system
   * module; explicit imports stay untouched and always remain valid. The Nuxt
   * module wires this from its `system` option; plain-Vite users pass it here.
   */
  autoImports?: VaneAutoImports
}

/** `*.style.ts` (and variants) — vane-dux's authoring file extension. */
const styleFileFilter = /\.style\.(?:js|cjs|mjs|jsx|ts|tsx)(?:\?used)?$/

/** The stable virtual stylesheet a compiled style module imports; content lives in the store. */
const virtualExt = '.vane.css'

/** In dev a style module accepts itself: a CSS-only edit swaps styles in place, no reload. */
const selfAcceptFooter = '\nif (import.meta.hot) { import.meta.hot.accept() }\n'

export function vaneDuxPlugin(options: VaneViteOptions = {}): PluginOption[] {
  let config: ResolvedConfig
  let server: ViteDevServer | undefined

  /** Stable virtual id → the CSS it currently serves. */
  const cssByVirtualId = new Map<string, string>()
  /** Style module → its last serialized code, for export-shape comparison. */
  const serializedModules = new Map<string, string>()
  /** Bundled dependency → the style modules built on it, for HMR fan-out. */
  const dependentsByFile = new Map<string, Set<string>>()
  /** Root-relative style module → what it recorded, replaced per evaluation. */
  const recordsByFile = new Map<string, VaneInspectRecord[]>()

  /** The manifest as last written, so unchanged builds skip the write. */
  let writtenManifest: string | undefined
  let manifestTimer: ReturnType<typeof setTimeout> | undefined

  const manifestJson = (): string => {
    const records = [...recordsByFile.keys()].sort().flatMap(file => recordsByFile.get(file)!)
    const css = [...cssByVirtualId.values()].join('\n')
    return `${JSON.stringify(buildManifest(records, css), null, 2)}\n`
  }

  const writeManifest = async (): Promise<void> => {
    const json = manifestJson()

    if (json === writtenManifest)
      return

    writtenManifest = json
    const path = join(config.root, '.vane', 'manifest.json')
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, json)
  }

  /** Dev regenerates on change, debounced across a save's fan-out of transforms. */
  const scheduleManifest = (): void => {
    clearTimeout(manifestTimer)
    manifestTimer = setTimeout(() => void writeManifest().catch(() => {}), 50)
  }

  const identOption = () =>
    options.identifiers ?? (config.mode === 'production' ? 'short' : 'debug')

  /** The auto-import shim's last written content, so unchanged runs skip the write. */
  let shimContent: string | undefined
  /** The system module's own source and import graph — files upstream of the system never get the shim. */
  let systemSource: string | undefined
  let systemDeps = new Set<string>()

  /**
   * Resolve the auto-import inject shim ([dux-spec-vue.md §4]): a one-line
   * module re-exporting the system's names, handed to esbuild's `inject` so
   * unbound identifiers resolve to the system while explicit imports stay
   * untouched. Re-detected per transform, so a new system export is picked up
   * by the next save. The system module and everything it imports are skipped:
   * a file upstream of the system cannot use the system's bindings — injecting
   * there would only manufacture a cycle.
   */
  const injectShimFor = async (filePath: string): Promise<string | undefined> => {
    const autoImports = options.autoImports

    if (!autoImports)
      return undefined

    const from = normalizePath(isAbsolute(autoImports.from) ? autoImports.from : join(config.root, autoImports.from))
    const source = await readFile(from, 'utf-8')

    if (source !== systemSource) {
      const { watchFiles } = await bundleStyleModule({
        filePath: from,
        root: config.root,
        alias: viteAliasToEsbuild(config),
      })

      systemSource = source
      systemDeps = new Set([from, ...watchFiles.map(normalizePath)])
    }

    if (systemDeps.has(filePath))
      return undefined

    const names = autoImports.names ?? styleExportNames(source)

    if (names.length === 0)
      return undefined

    const shim = join(config.root, 'node_modules', '.vane-dux', 'auto-imports.mjs')
    const content = `export { ${names.join(', ')} } from '${from}'\n`

    if (content !== shimContent) {
      await mkdir(dirname(shim), { recursive: true })
      await writeFile(shim, content)
      shimContent = content
    }

    return shim
  }

  const styleTsPlugin: Plugin = {
    name: 'vane-dux-style-ts',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    configureServer(devServer) {
      server = devServer

      // The manifest, live — what the DevTools tab (and any tool) reads.
      devServer.middlewares.use('/__vane', (req, res, next) => {
        const [path] = (req.url ?? '/').split('?')

        if (path === '/manifest.json') {
          res.setHeader('Content-Type', 'application/json')
          res.end(manifestJson())
          return
        }

        if (path === '/' || path === '/index.html') {
          res.setHeader('Content-Type', 'text/html')
          res.end(devtoolsPage(config.root))
          return
        }

        next()
      })
    },

    // Builds write the manifest once, beside the emitted CSS.
    async buildEnd() {
      if (!server)
        await writeManifest()
    },

    async transform(_code, id, transformOptions) {
      const [validId] = id.split('?')

      if (!styleFileFilter.test(validId))
        return null

      const root = config.root
      const filePath = normalizePath(validId)

      const { source, watchFiles } = await bundleStyleModule({
        filePath,
        root,
        alias: viteAliasToEsbuild(config),
        inject: await injectShimFor(filePath),
      })

      for (const file of watchFiles) {
        const watched = normalizePath(file)

        if (watched.includes('node_modules') || watched === filePath)
          continue

        this.addWatchFile(watched)

        const dependents = dependentsByFile.get(watched) ?? new Set()
        dependents.add(filePath)
        dependentsByFile.set(watched, dependents)
      }

      const { exports, cssByFileScope, unusedCompositionRegex, records }
        = evaluateStyleModule(source, filePath, identOption())

      // Replace each evaluated file's inspection records — the bundle carries
      // its whole import graph, so records for dependencies arrive here too.
      const recordedFiles = new Set<string>()

      for (const record of records)
        recordedFiles.add(record.file ?? normalizePath(filePath))

      for (const file of recordedFiles)
        recordsByFile.set(file, records.filter(record => (record.file ?? normalizePath(filePath)) === file))

      const cssImports: string[] = []

      for (const [serializedFileScope, css] of cssByFileScope) {
        const fileScope = parseFileScope(serializedFileScope)
        const virtualId = `${normalizePath(join(root, fileScope.filePath))}${virtualExt}`
        // Provenance in dev: the stylesheet names its style module up front.
        const served = server ? `/* ${fileScope.filePath} · vane-dux */\n${css}` : css
        const changed = cssByVirtualId.get(virtualId) !== served

        cssByVirtualId.set(virtualId, served)
        cssImports.push(`import '${virtualId}';`)

        // The id is stable, so the module graph must learn the content moved —
        // import analysis then stamps a fresh timestamp on the import and the
        // client replaces the existing style tag in place.
        if (changed && server) {
          for (const virtualModule of server.moduleGraph.getModulesByFile(virtualId) ?? [])
            server.moduleGraph.invalidateModule(virtualModule)
        }
      }

      if (server)
        scheduleManifest()

      let code = serializeVanillaModule(cssImports, exports, unusedCompositionRegex)

      if (server && !transformOptions?.ssr) {
        const previous = serializedModules.get(filePath)
        serializedModules.set(filePath, code)

        // Same exports → the accepted update is sound. New export shape →
        // importers hold stale bindings; one full reload restores truth.
        if (previous !== undefined && previous !== code)
          server.hot.send({ type: 'full-reload' })

        code += selfAcceptFooter
      }

      return { code, map: { mappings: '' } }
    },

    handleHotUpdate({ file, server: devServer, modules }) {
      const dependents = dependentsByFile.get(normalizePath(file))

      if (!dependents?.size)
        return

      // A bundled dependency changed: every style module built on it
      // re-evaluates, so its fresh CSS lands under the same stable ids.
      const affected = new Set(modules)

      for (const dependent of dependents) {
        for (const dependentModule of devServer.moduleGraph.getModulesByFile(dependent) ?? [])
          affected.add(dependentModule)
      }

      return [...affected]
    },

    resolveId(source) {
      const [validId, query] = source.split('?')

      if (!validId.endsWith(virtualExt) || !cssByVirtualId.has(validId))
        return null

      // Keep the query — Vite's HMR timestamps ride it.
      return query ? `${validId}?${query}` : validId
    },

    load(id) {
      const [validId] = id.split('?')

      if (!validId.endsWith(virtualExt))
        return null

      return cssByVirtualId.get(validId) ?? null
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

/**
 * The substrate state the sandbox shares with this plugin — the adapter above
 * all — must be one instance, or evaluation silently collects nothing. Two
 * things break instance identity: a host's static `import` can land on a
 * different build than the sandbox's `require`, and each substrate CJS entry
 * picks its dev/prod flavor from `NODE_ENV` *at its own first load* — which
 * `vite build` mutates after plugins load. Requiring every shared entry here,
 * in one breath through the same `require` the bundle uses, pins one flavor
 * family by construction; the sandbox then hits the cache.
 */
const { removeAdapter, setAdapter }
  = substrateRequire('@vanilla-extract/css/adapter') as typeof import('@vanilla-extract/css/adapter')

for (const entry of ['@vanilla-extract/css', '@vanilla-extract/css/fileScope', '@vanilla-extract/css/functionSerializer'])
  substrateRequire(entry)

interface BundleStyleModuleParams {
  filePath: string
  root: string
  alias: Record<string, string>
  /** The auto-import shim module, if the system option is configured. */
  inject?: string
}

/**
 * Bundle one style module for evaluation: esbuild inlines its import graph,
 * every `*.style.ts` file gets port labels and a file scope, and the
 * substrate stays external (as absolute paths) so the evaluated bundle shares
 * the css adapter instance with this plugin. vane-dux itself is bundled in —
 * it ships ESM-only, and the evaluation sandbox is CommonJS.
 */
async function bundleStyleModule({ filePath, root, alias, inject }: BundleStyleModuleParams): Promise<{
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
    inject: inject === undefined ? [] : [inject],
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
            const original = await readFile(path, 'utf-8')

            const source = addFileScope({
              source: applyDebugNames(original),
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
  /** What the evaluation recorded for the manifest ([internal/inspect.ts]). */
  records: VaneInspectRecord[]
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
    const { result: exports, records } = collectInspection(() => executeBundle(source, filePath))

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
      records,
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

// ─── Export-name detection ───────────────────────────────────────────────────

/**
 * The value exports of a style module, for auto-imports — the destructured
 * system form (`export const { t, css } = createSystem(…)`), plain named
 * declarations, and export lists. The same light regex posture as the
 * debug-name transform: when a form can't be read, it's skipped, and explicit
 * imports always remain valid.
 */
export function styleExportNames(source: string): string[] {
  const names = new Set<string>()

  // export const { t, css: style } = …
  for (const match of source.matchAll(/export\s+(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const entry of match[1].split(',')) {
      const name = entry.split(':').pop()?.split('=')[0]?.trim()

      if (name && /^\w+$/.test(name))
        names.add(name)
    }
  }

  // export const t = …, export function …
  for (const match of source.matchAll(/export\s+(?:const|let|var|function|class)\s+(\w+)/g))
    names.add(match[1])

  // export { a, b as c } [from '…'] — type-only entries skipped
  for (const match of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const entry of match[1].split(',')) {
      if (/^\s*type\s/.test(entry))
        continue

      const name = (entry.split(/\bas\b/).pop() ?? '').trim()

      if (name && /^\w+$/.test(name))
        names.add(name)
    }
  }

  return [...names]
}

// ─── The debug-name transform ────────────────────────────────────────────────

/**
 * Inject declaration names into authoring calls, so emitted identifiers
 * follow the code — rename-symbol renames everything, devtools rules trace
 * back to their export ([dux-spec-ports.md §1], [dux-spec-recipes.md §3]).
 * A light bracket-matching pass, not a Babel plugin; when it can't parse a
 * call it leaves it alone — everything still works with hash-only names.
 *
 * Handles module-scope `const` declarations, exported or not (published
 * ports are typically module-local):
 * - `const X = port(value)` → `port(value, { label: 'X' })`;
 *   an existing options object gains the `label` key, an explicit label wins
 * - `const X = css(rule)` / `recipe(…)` / `anatomy(…)` / `keyframes(…)` /
 *   `fontFace(…)` → the call gains `'X'` as its debug id; an explicit id wins
 * - `IDENT.port(...)` and friends — the system-bound forms
 */
export function applyDebugNames(source: string): string {
  let output = source
  let offset = 0

  const pattern = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:\w+\.)?(port|css|recipe|anatomy|keyframes|fontFace|defineAtoms)\s*\(/g

  for (const match of source.matchAll(pattern)) {
    const [, name, callee] = match
    const callStart = match.index! + match[0].lastIndexOf('(')
    const callEnd = findMatchingParen(source, callStart)

    if (callEnd === -1)
      continue

    const args = source.slice(callStart + 1, callEnd)
    const { hasLabel, commaIndex } = analyzeArgs(args)

    const replacement = callee === 'port'
      ? hasLabel ? undefined : buildPortReplacement(args, commaIndex, name)
      : buildDebugIdReplacement(args, commaIndex, name)

    if (replacement === undefined)
      continue

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

/** Build a `port()` call's replacement arguments with the `label` option injected. */
function buildPortReplacement(args: string, commaIndex: number, exportName: string): string {
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

/**
 * Append the declaration name as a debug id — only to single-argument calls,
 * so an explicit id (or any extra argument) always wins.
 */
function buildDebugIdReplacement(args: string, commaIndex: number, exportName: string): string | undefined {
  if (args.trim() === '' || commaIndex !== -1)
    return undefined

  return `${args}, '${exportName}'`
}

// ─── Introspection: the manifest and the audits ride the build plane ─────────

export { audit, formatAuditFindings } from './introspect/audit'
export type { VaneAuditFinding } from './introspect/audit'
export { buildManifest } from './introspect/manifest'
export type {
  VaneManifest,
  VaneManifestContrast,
  VaneManifestEscape,
  VaneManifestPort,
  VaneManifestRecipe,
  VaneManifestToken,
} from './introspect/manifest'

export const vanePlugin = vaneDuxPlugin
export default vaneDuxPlugin
