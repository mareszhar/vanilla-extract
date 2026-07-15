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
import type { Loader } from 'esbuild'
import type { CallExpression, Expression, ObjectExpression, ObjectProperty } from 'oxc-parser'
import type { Plugin, PluginOption, ResolvedConfig, ViteDevServer } from 'vite'
import type { VaneInspectRecord } from './internal/inspect'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, posix } from 'node:path'
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
import { parseSync, Visitor } from 'oxc-parser'
import { resetDiagnosticSources } from './diagnostics'
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
const styleSourceFilter = /\.style\.(?:js|cjs|mjs|jsx|ts|tsx)$/
const authoringSourceFilter = /\.[cm]?[jt]sx?$/

/** The stable virtual stylesheet a compiled style module imports; content lives in the store. */
const virtualExt = '.vane.css'

/** In dev a style module accepts itself: a CSS-only edit swaps styles in place, no reload. */
const selfAcceptFooter = '\nif (import.meta.hot) { import.meta.hot.accept() }\n'

export function vaneDuxPlugin(options: VaneViteOptions = {}): PluginOption[] {
  let config: ResolvedConfig
  let server: ViteDevServer | undefined
  let clientServer: ViteDevServer | undefined

  /** Stable virtual id → the CSS it currently serves. */
  const cssByVirtualId = new Map<string, string>()
  /** Style module → its sorted top-level exports, for shape comparison. */
  const exportSignatures = new Map<string, string>()
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

      // Nuxt creates distinct browser and SSR Vite servers from the same
      // plugin instance. The latter configures last, so a single `server`
      // reference silently routes CSS updates/full reloads to an HMR channel
      // no browser listens to. Plain Vite's consumer is `client` too.
      if (devServer.config.build.ssr !== true)
        clientServer = devServer

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
        const previousCss = cssByVirtualId.get(virtualId)
        const changed = previousCss !== undefined && previousCss !== served

        cssByVirtualId.set(virtualId, served)
        cssImports.push(`import '${virtualId}';`)

        // The id is stable, so update both halves of the HMR contract: mark
        // Vite's file-change walk already invalidated this virtual module via
        // its importer before the style transform runs. At that point its
        // self-accepting metadata is intentionally blank, so `reloadModule`
        // cannot rediscover an update boundary. Notify the client of the
        // known-safe CSS module directly; fetching its stable URL re-runs
        // Vite's CSS wrapper and replaces the existing style tag in place.
        // Dependency fan-out otherwise refreshes the in-memory bytes without
        // ever asking the browser to fetch them.
        if (changed && clientServer) {
          const url = `/${posix.relative(normalizePath(root), virtualId)}`

          for (const virtualModule of clientServer.moduleGraph.getModulesByFile(virtualId) ?? [])
            clientServer.moduleGraph.invalidateModule(virtualModule)

          sendCssUpdate(clientServer, url, Date.now())
        }
      }

      if (server)
        scheduleManifest()

      let code = serializeVanillaModule(cssImports, exports, unusedCompositionRegex)

      if (server && !transformOptions?.ssr) {
        const signature = Object.keys(exports).sort().join('\0')
        const previous = exportSignatures.get(filePath)
        exportSignatures.set(filePath, signature)

        // Stable export names → values are serialized contracts whose CSS can
        // update in place. Added/removed/renamed exports leave importers with
        // stale bindings, so exactly one full reload restores truth.
        if (previous !== undefined && previous !== signature) {
          const hotServer = clientServer ?? server
          hotServer.hot.send({ type: 'full-reload' })
        }

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

      if (!validId.endsWith(virtualExt))
        return null

      const absoluteId = getAbsoluteVirtualId(validId, config.root)

      if (!cssByVirtualId.has(absoluteId))
        return null

      // Keep the query — Vite's HMR timestamps ride it.
      return query ? `${absoluteId}?${query}` : absoluteId
    },

    load(id) {
      const [validId] = id.split('?')

      if (!validId.endsWith(virtualExt))
        return null

      return cssByVirtualId.get(getAbsoluteVirtualId(validId, config.root)) ?? null
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

function sendCssUpdate(server: ViteDevServer, url: string, timestamp: number): void {
  server.hot.send({
    type: 'update',
    updates: [{
      type: 'js-update',
      timestamp,
      path: url,
      acceptedPath: url,
      explicitImportRequired: false,
      isWithinCircularImport: false,
    }],
  })
}

// Vite rewrites absolute module ids to root-relative browser URLs in dev and
// Nuxt serves those URLs beneath its `/_nuxt/` base. Resolve both spellings to
// the one absolute key used by the CSS store. This mirrors the substrate Vite
// plugin's id normalization; without it SSR can render valid-looking
// `<link>`s whose browser requests miss the store and 404, causing a FOUC.
const viteIdPrefix = /^\/?@id\//
const slashPrefixedDrive = /^\/([a-z]:\/)/i
const windowsAbsolutePath = /^[a-z]:\//i

function getAbsoluteVirtualId(filePath: string, root: string): string {
  const unwrapped = filePath
    .replace(viteIdPrefix, '')
    .replace(slashPrefixedDrive, '$1')
  const resolved = posix.isAbsolute(unwrapped) || windowsAbsolutePath.test(unwrapped)
    ? unwrapped
    : filePath

  if (
    windowsAbsolutePath.test(resolved)
    || resolved.startsWith(root)
    || (posix.isAbsolute(resolved) && resolved.split(posix.sep)[1] === root.split(posix.sep)[1])
  ) {
    return normalizePath(resolved)
  }

  return normalizePath(posix.join(root, resolved))
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
        name: 'vane-dux-authoring-source',
        setup(build) {
          build.onLoad({ filter: authoringSourceFilter }, async ({ path }) => {
            const normalizedPath = normalizePath(path)
            const normalizedRoot = `${normalizePath(root).replace(/\/$/, '')}/`

            // Only compiler-owned app source receives provenance metadata.
            // Dependencies keep their native loader/transform pipeline and
            // cannot pollute the app's diagnostic source universe.
            if (!normalizedPath.startsWith(normalizedRoot))
              return undefined

            const original = await readFile(path, 'utf-8')
            const isStyleModule = styleSourceFilter.test(path)
            const named = isStyleModule ? applyDebugNames(original, path) : original
            const located = applySourceLocations(named, path, root)

            const source = isStyleModule
              ? addFileScope({
                  source: located,
                  filePath: path,
                  rootPath: root,
                  packageName,
                })
              : located

            return {
              contents: source,
              loader: sourceLoader(path),
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

function sourceLoader(path: string): Loader {
  if (/\.tsx$/i.test(path))
    return 'tsx'
  if (/\.(?:ts|mts|cts)$/i.test(path))
    return 'ts'
  if (/\.jsx$/i.test(path))
    return 'jsx'
  return 'js'
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
  resetDiagnosticSources()
  const module = { exports: {} as Record<string, unknown> }

  // eslint-disable-next-line no-new-func
  const run = new Function('require', 'module', 'exports', '__filename', '__dirname', source)
  run(createRequire(filePath), module, module.exports, filePath, dirname(filePath))

  return module.exports
}

// ─── Export-name detection ───────────────────────────────────────────────────

/**
 * Every statically enumerable value export, read from Oxc's module record.
 * Destructuring, aliases, re-exports, comments, and TypeScript-only exports
 * follow parser semantics instead of source-text guesses.
 */
export function styleExportNames(source: string, fileName = 'system.style.ts'): string[] {
  const parsed = parseSync(fileName, source)

  if (parsed.errors.some(error => error.severity === 'Error'))
    return []

  const names = new Set<string>()

  for (const declaration of parsed.module.staticExports) {
    for (const entry of declaration.entries) {
      const name = entry.exportName.name

      if (!entry.isType && name !== null && entry.exportName.kind === 'Name')
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
 * Oxc identifies declarations and call arguments; edits are insertion-only,
 * so formatting and comments remain byte-for-byte intact around them.
 *
 * Handles module-scope `const` declarations, exported or not (published
 * ports are typically module-local):
 * - `const X = port(value)` → `port(value, { label: 'X' })`;
 *   an existing options object gains the `label` key, an explicit label wins
 * - `const X = css(rule)` / `recipe(…)` / `anatomy(…)` / `keyframes(…)` /
 *   `fontFace(…)` → the call gains `'X'` as its debug id; an explicit id wins
 * - `IDENT.port(...)` and friends — the system-bound forms
 */
export function applyDebugNames(source: string, fileName = 'module.style.ts'): string {
  const parsed = parseSync(fileName, source, { range: true })

  if (parsed.errors.some(error => error.severity === 'Error'))
    return source

  const aliases = authoringAliases(parsed.program)
  const edits: Array<{ at: number, text: string }> = []

  new Visitor({
    VariableDeclarator(node) {
      if (node.id.type !== 'Identifier' || node.init?.type !== 'CallExpression')
        return

      const callee = authoringCallee(node.init.callee, aliases)

      if (callee === undefined)
        return

      const name = node.id.name
      const args = node.init.arguments

      if (callee === 'port') {
        if (args.length === 1) {
          edits.push({ at: node.init.end - 1, text: `, { label: '${name}' }` })
        }
        else if (args.length >= 2 && args[1].type === 'ObjectExpression' && !hasObjectKey(args[1], 'label')) {
          edits.push({ at: args[1].start + 1, text: ` label: '${name}',` })
        }

        return
      }

      if (args.length === 1)
        edits.push({ at: node.init.end - 1, text: `, '${name}'` })
    },
  }).visit(parsed.program)

  return applyInsertions(source, edits)
}

const authoringNames = new Set(['port', 'css', 'recipe', 'anatomy', 'keyframes', 'fontFace', 'defineAtoms'])
const sourceAuthoringNames = new Set([
  ...authoringNames,
  'globalCss',
  'createSystem',
  'defineTokens',
  'theme',
  'tokenOverride',
  'derive',
  'compose',
  'build',
])
const tokenBuilderMethodNames = new Set(['derive', 'compose', 'build'])

function authoringAliases(program: Parameters<Visitor['visit']>[0], names = authoringNames): Map<string, string> {
  const aliases = new Map([...names].map(name => [name, name]))

  new Visitor({
    ImportSpecifier(node) {
      const imported = node.imported.type === 'Identifier' ? node.imported.name : String(node.imported.value)

      if (names.has(imported))
        aliases.set(node.local.name, imported)
    },
    VariableDeclarator(node) {
      if (node.id.type !== 'ObjectPattern')
        return

      for (const property of node.id.properties) {
        if (property.type !== 'Property' || property.key.type !== 'Identifier')
          continue

        const imported = property.key.name
        const local = property.value.type === 'Identifier' ? property.value.name : undefined

        if (local !== undefined && names.has(imported))
          aliases.set(local, imported)
      }
    },
  }).visit(program)

  return aliases
}

function authoringCallee(callee: Expression, aliases: Map<string, string>, names = authoringNames): string | undefined {
  if (callee.type === 'Identifier')
    return aliases.get(callee.name)

  if (callee.type === 'MemberExpression') {
    const property = callee.property
    const name = property.type === 'Identifier'
      ? property.name
      : property.type === 'Literal' && typeof property.value === 'string' ? property.value : undefined
    return name !== undefined && names.has(name) ? name : undefined
  }

  return undefined
}

/**
 * Wrap compiler-owned authoring calls with source metadata. The wrapper is a
 * comma expression, so runtime semantics and return types are unchanged; a
 * VaneError raised synchronously can recover the exact authored property.
 * Token-builder chains register all seed/stage paths as one source context.
 */
function applySourceLocations(source: string, fileName: string, root: string): string {
  const parsed = parseSync(fileName, source, { range: true })

  if (parsed.errors.some(error => error.severity === 'Error'))
    return source

  const aliases = authoringAliases(parsed.program, sourceAuthoringNames)
  const calls: Array<{ node: CallExpression, name: string }> = []

  new Visitor({
    CallExpression(node) {
      const name = authoringCallee(node.callee, aliases, sourceAuthoringNames)
      if (name !== undefined && (!tokenBuilderMethodNames.has(name) || isTokenBuilderChain(node, aliases)))
        calls.push({ node, name })
    },
  }).visit(parsed.program)

  const outermost = calls.filter(({ node }) => !calls.some(({ node: other }) =>
    other !== node && other.start === node.start && other.end > node.end))
  const relativeFile = normalizePath(posix.relative(normalizePath(root), normalizePath(fileName)))
  const file = relativeFile.startsWith('..') ? normalizePath(fileName) : relativeFile
  const pointAt = sourcePointFactory(source)
  const edits: Array<{ at: number, text: string }> = []

  for (const { node, name } of outermost) {
    const locations: Record<string, Array<{ line: number, column: number }>> = {}
    collectCallLocations(node, name, aliases, locations, pointAt)
    const meta = { file, call: pointAt(node.start), locations }
    const key = `${file}:${node.start}`
    const json = JSON.stringify(meta)

    edits.push({
      at: node.start,
      text: `globalThis[Symbol.for('vane.withSource')](${json},${JSON.stringify(key)},()=>`,
    })
    edits.push({ at: node.end, text: ')' })
  }

  return applyInsertions(source, edits)
}

function isTokenBuilderChain(call: CallExpression, aliases: Map<string, string>): boolean {
  const name = authoringCallee(call.callee, aliases, sourceAuthoringNames)

  if (name === 'defineTokens')
    return true

  return name !== undefined
    && tokenBuilderMethodNames.has(name)
    && call.callee.type === 'MemberExpression'
    && call.callee.object.type === 'CallExpression'
    && isTokenBuilderChain(call.callee.object, aliases)
}

function collectCallLocations(
  call: CallExpression,
  name: string,
  aliases: Map<string, string>,
  locations: Record<string, Array<{ line: number, column: number }>>,
  pointAt: (offset: number) => { line: number, column: number },
): void {
  if (call.callee.type === 'MemberExpression' && call.callee.object.type === 'CallExpression') {
    const base = call.callee.object
    const baseName = authoringCallee(base.callee, aliases, sourceAuthoringNames)
    if (baseName !== undefined)
      collectCallLocations(base, baseName, aliases, locations, pointAt)
  }

  const expression = sourceObjectForCall(call, name)
  if (expression !== undefined)
    collectObjectLocations(expression, [], locations, pointAt)
}

function sourceObjectForCall(call: CallExpression, name: string): ObjectExpression | undefined {
  const argumentIndex = name === 'globalCss' ? 1 : 0
  const argument = call.arguments[argumentIndex]

  if (argument === undefined || argument.type === 'SpreadElement')
    return undefined

  const expression = unwrapSource(argument)

  if (expression.type === 'ObjectExpression')
    return expression

  if (name === 'derive' && (expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression')) {
    if (expression.body !== null && expression.body.type !== 'BlockStatement') {
      const body = unwrapSource(expression.body)
      return body.type === 'ObjectExpression' ? body : undefined
    }

    if (expression.body === null)
      return undefined

    for (const statement of expression.body.body) {
      if (statement.type === 'ReturnStatement' && statement.argument !== null) {
        const returned = unwrapSource(statement.argument)
        if (returned.type === 'ObjectExpression')
          return returned
      }
    }
  }

  return undefined
}

function collectObjectLocations(
  object: ObjectExpression,
  prefix: string[],
  locations: Record<string, Array<{ line: number, column: number }>>,
  pointAt: (offset: number) => { line: number, column: number },
): void {
  for (const property of object.properties) {
    if (property.type !== 'Property')
      continue

    const key = sourcePropertyName(property)
    if (key === undefined)
      continue

    const path = [...prefix, key]
    const joined = path.join('.')
    const points = locations[joined] ?? []
    points.push(pointAt(property.key.start))
    locations[joined] = points

    const value = unwrapSource(property.value)
    if (value.type === 'ObjectExpression')
      collectObjectLocations(value, path, locations, pointAt)
  }
}

function sourcePropertyName(property: ObjectProperty): string | undefined {
  const { key } = property

  if (key.type === 'Identifier')
    return key.name

  if (key.type === 'Literal' && (typeof key.value === 'string' || typeof key.value === 'number'))
    return String(key.value)

  return undefined
}

function unwrapSource(expression: Expression): Expression {
  let value = expression
  const wrappers = new Set(['ParenthesizedExpression', 'TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSInstantiationExpression'])

  while (wrappers.has(value.type) && 'expression' in value)
    value = value.expression as Expression

  return value
}

function sourcePointFactory(source: string): (offset: number) => { line: number, column: number } {
  const starts = [0]

  for (let index = 0; index < source.length; index++) {
    if (source.charCodeAt(index) === 10)
      starts.push(index + 1)
  }

  return (offset) => {
    let low = 0
    let high = starts.length - 1

    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (starts[middle] <= offset)
        low = middle
      else high = middle - 1
    }

    return { line: low + 1, column: offset - starts[low] + 1 }
  }
}

function hasObjectKey(object: ObjectExpression, key: string): boolean {
  return object.properties.some((property) => {
    if (property.type !== 'Property')
      return false

    return property.key.type === 'Identifier'
      ? property.key.name === key
      : property.key.type === 'Literal' && property.key.value === key
  })
}

function applyInsertions(source: string, edits: Array<{ at: number, text: string }>): string {
  let output = source

  for (const edit of edits.sort((a, b) => b.at - a.at))
    output = `${output.slice(0, edit.at)}${edit.text}${output.slice(edit.at)}`

  return output
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
  VaneManifestSource,
  VaneManifestStyle,
  VaneManifestToken,
} from './introspect/manifest'

export const vanePlugin = vaneDuxPlugin
export default vaneDuxPlugin
