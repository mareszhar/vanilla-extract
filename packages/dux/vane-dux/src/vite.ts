/**
 * The vane-dux Vite plugin — wires the vanilla-extract compiler to `*.style.ts`
 * ([dux-spec-ports.md §1], [dux-workspace.md §3]): adds the `*.style.ts` file
 * filter the substrate doesn't ship, and applies the port debug-id transform
 * so export names reach the emitted variable labels.
 *
 * The plugin composes two layers:
 * 1. A `*.style.ts` processor that adds file scope and debug IDs (via the
 *    integration's `transform`), then lets the substrate's adapter emit CSS.
 * 2. The vanilla-extract plugin itself, for any `*.css.ts` files that coexist.
 *
 * The port label transform is a light, bracket-matching pass — not a Babel
 * plugin — because `port()` is the one vane-dux function that needs it, and
 * the common form (`export const X = port(value)`) is a single line.
 */

import type { Plugin, PluginOption, ResolvedConfig } from 'vite'
import process from 'node:process'
import { getPackageInfo, normalizePath, transform } from '@vanilla-extract/integration'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

export type VaneIdentifierMode = 'debug' | 'short'
export type VaneCompilerMode = 'transform' | 'emitCss' | 'inlineCssInDev'

export interface VaneViteOptions {
  identifiers?: VaneIdentifierMode
  unstableMode?: VaneCompilerMode
}

/** `*.style.ts` (and variants) — vane-dux's authoring file extension. */
const styleFileFilter = /\.style\.(?:js|cjs|mjs|jsx|ts|tsx)(?:\?used)?$/

export function vaneDuxPlugin(options: VaneViteOptions = {}): PluginOption[] {
  const identOption = options.identifiers ?? 'debug'
  let resolvedConfig: ResolvedConfig | undefined

  const styleTsPlugin: Plugin = {
    name: 'vane-dux-style-ts',
    enforce: 'pre',
    configResolved(config: ResolvedConfig) {
      resolvedConfig = config
    },

    async transform(code, id) {
      const [validId] = id.split('?')

      if (!styleFileFilter.test(validId))
        return null

      const root = resolvedConfig?.root ?? process.cwd()
      const packageName = getPackageInfo(root).name
      const filePath = normalizePath(validId)

      // 1. Inject port export names as `label` options, then 2. add file scope
      //    and substrate debug IDs via the integration transform.
      const labeled = applyPortLabels(code)
      const transformed = await transform({
        source: labeled,
        filePath,
        rootPath: root,
        packageName,
        identOption: identOption === 'debug' ? 'debug' : 'short',
      })

      return { code: transformed, map: { mappings: '' } }
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

// ─── The port label transform ────────────────────────────────────────────────

/**
 * Inject export names as `{ label: 'X' }` in `port()` calls, so the emitted
 * variable's debug label follows the export — rename-symbol renames everything
 * ([dux-spec-ports.md §1]). A light bracket-matching pass, not a Babel plugin:
 * `port()` is the one function that needs it, and the common form is one line.
 *
 * Handles:
 * - `export const X = port(value)` → `export const X = port(value, { label: 'X' })`
 * - `export const X = port(value, { as: 'deg' })` → adds `label` to the options
 * - `export const X = IDENT.port(...)` — the system-bound form
 *
 * Skips calls that already have a `label` option.
 */
function applyPortLabels(source: string): string {
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

    if (char === '\'' || char === '"') {
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

    if (char === '\'' || char === '"') {
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
    const inner = optionsTrimmed.replace(/^\{/, `{ label: '${exportName}', `)
    return `${before},${inner}`
  }

  // The second argument is not an object literal — wrap it.
  return `${before}, { label: '${exportName}' }`
}

export const vanePlugin = vaneDuxPlugin
export default vaneDuxPlugin
