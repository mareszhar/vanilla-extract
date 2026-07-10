/**
 * `css.raw` ([dux-spec-css.md §8]): the escape hatch is CSS itself. The block
 * is real CSS with real nesting semantics — lightningcss parses and flattens
 * it under the generated class — so stepping off the object syntax costs
 * nothing else: still scoped, still validated, still token-interpolating, and
 * deliberately allowed to target descendants.
 */

import type { VaneDiagnostic } from '../diagnostics'
import type { VaneFlatNode } from '../internal/cssBlocks'
import type { VaneSystemContext } from './css'
import type { VaneRawValue } from './types'
import { Buffer } from 'node:buffer'
import { style } from '@vanilla-extract/css'
import { Features, transform } from 'lightningcss'
import { VaneError } from '../diagnostics'
import { parseBlocks } from '../internal/cssBlocks'
import { checkDeclaration } from '../internal/cssParser'
import { record } from '../internal/inspect'
import { requireStyleModule } from '../internal/styleModule'
import { emitGlobal } from './emit'
import { serializeStyleValue } from './values'

const MARKER = '__vane_raw__'

export function bindRaw(system: VaneSystemContext): (strings: TemplateStringsArray, ...values: VaneRawValue[]) => string {
  return (strings, ...values) => {
    const file = requireStyleModule('css.raw')
    const text = interpolate(strings, values, file)
    const className = style({})
    const flattened = flatten(text, file)
    const nodes = parseBlocks(flattened)

    emitNodes(nodes, className, system, file)

    record({
      kind: 'escape',
      form: 'css.raw',
      file,
      detail: preview(text),
      layer: system.defaultLayer,
    })

    return className
  }
}

/** The block's first meaningful line, clipped — enough to find it in review. */
function preview(text: string): string {
  const line = text.split('\n').map(entry => entry.trim()).find(entry => entry.length > 0) ?? ''
  return line.length > 72 ? `${line.slice(0, 71)}…` : line
}

function interpolate(strings: TemplateStringsArray, values: VaneRawValue[], file: string): string {
  let text = strings[0]

  for (let index = 0; index < values.length; index++)
    text += String(serializeStyleValue(values[index], 'css.raw', { file })) + strings[index + 1]

  return text
}

function flatten(text: string, file: string): string {
  try {
    return transform({
      filename: file,
      code: Buffer.from(`.${MARKER}{${text}}`),
      include: Features.Nesting,
      errorRecovery: false,
    }).code.toString()
  }
  catch (error) {
    const message = (error as Error).message

    throw new VaneError({
      code: 'VANE_CSS_INVALID_RAW',
      message: `this raw block does not parse: ${message}`,
      file,
      fix: message.includes('@keyframes')
        ? 'an animation is a value — define it with keyframes() and interpolate the handle'
        : 'the block must hold as the body of a CSS rule',
    })
  }
}

// ─── Emission ────────────────────────────────────────────────────────────────

interface RawArm {
  media?: string
  supports?: string
  container?: string
  startingStyle?: boolean
}

function emitNodes(nodes: VaneFlatNode[], className: string, system: VaneSystemContext, file: string): void {
  const diagnostics: VaneDiagnostic[] = []
  walkNodes(nodes, {}, className, system, file, diagnostics)

  if (diagnostics.length > 0)
    throw new VaneError(diagnostics)
}

function walkNodes(nodes: VaneFlatNode[], arm: RawArm, className: string, system: VaneSystemContext, file: string, diagnostics: VaneDiagnostic[]): void {
  for (const node of nodes) {
    if (node.kind === 'at') {
      const merged = mergeRawArm(arm, node.prelude, file, diagnostics)

      if (merged)
        walkNodes(node.children, merged, className, system, file, diagnostics)

      continue
    }

    const declarations: Record<string, string> = {}

    for (const [property, value] of node.declarations) {
      const issue = checkDeclaration(property, value)

      if (issue !== undefined) {
        diagnostics.push({
          code: issue.kind === 'unknown-property' ? 'VANE_CSS_UNKNOWN_PROPERTY' : 'VANE_CSS_INVALID_VALUE',
          message: `css.raw ${node.selector.replaceAll(`.${MARKER}`, '&')} ${property}: ${issue.reason}${issue.suggestion ? ` — did you mean '${issue.suggestion}'?` : ''}`,
          file,
        })
        continue
      }

      declarations[property] = value
    }

    if (Object.keys(declarations).length === 0)
      continue

    emitGlobal(node.selector.replaceAll(`.${MARKER}`, className), {
      layer: system.defaultLayer,
      layerRoot: system.layerRoot,
      units: [{ arm: { ...arm }, declarations }],
    })
  }
}

function mergeRawArm(arm: RawArm, prelude: string, file: string, diagnostics: VaneDiagnostic[]): RawArm | undefined {
  if (prelude === '@starting-style')
    return { ...arm, startingStyle: true }

  for (const kind of ['media', 'supports', 'container'] as const) {
    if (!prelude.startsWith(`@${kind}`)) {
      continue
    }

    const params = prelude.slice(kind.length + 1).trim()

    if (kind === 'container' && arm.container !== undefined) {
      diagnostics.push({
        code: 'VANE_CSS_INVALID_RAW',
        message: 'css.raw nests two container queries — a rule queries one container',
        file,
        fix: 'restructure so each rule sits under a single @container',
      })
      return undefined
    }

    return {
      ...arm,
      [kind]: arm[kind] === undefined ? params : `${arm[kind]} and ${params}`,
    }
  }

  diagnostics.push({
    code: 'VANE_CSS_INVALID_RAW',
    message: `css.raw cannot hold ${prelude.split(/[\s{]/)[0]}`,
    file,
    fix: prelude.startsWith('@keyframes')
      ? 'an animation is a value — define it with keyframes() and interpolate the handle'
      : 'raw blocks nest @media, @supports, @container, and @starting-style',
  })

  return undefined
}
