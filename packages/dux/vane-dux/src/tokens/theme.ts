/**
 * `theme()` — a scoped set of token overrides, at build time
 * ([dux-spec-tokens.md §7]): a class that re-declares the overridden variables
 * plus every build-folded value downstream of them (re-folded under the
 * overrides — a legible pairing may flip its pick). Live derivations re-derive
 * in the cascade and need no re-declaration; that is the point of liveness.
 */

import type { VaneOverride } from './graph'
import type { VaneThemeOverrides } from './types'
import { style } from '@vanilla-extract/css'
import { didYouMean, VaneError } from '../diagnostics'
import { isHandle } from '../internal/handle'
import { isColorValue, isContrastValue } from './color'
import { graphOf, resolveGraph } from './graph'

export function theme<T extends object>(tokens: T, overrides: VaneThemeOverrides<T>, debugId?: string): string {
  const graph = graphOf(tokens)

  if (!graph) {
    throw new VaneError({
      code: 'VANE_TOKENS_INVALID_OVERRIDE',
      message: 'theme() needs the tokens returned by defineTokens',
      fix: 'pass the graph itself — theme(t, { … }) — from a style module',
    })
  }

  const substitutions = new Map<string, VaneOverride>()
  collectOverrides(overrides, tokens, [], substitutions, graph.file)

  const { results, diagnostics } = resolveGraph(graph, substitutions, debugId ? `theme ${debugId}` : 'theme')

  if (diagnostics.length > 0)
    throw new VaneError(diagnostics)

  const vars: Record<string, string> = {}

  for (const node of graph.nodes.values()) {
    const emitted = results.get(node.key)!.emitted

    if (emitted !== graph.results.get(node.key)!.emitted)
      vars[node.name] = emitted
  }

  return style({ vars }, debugId)
}

function collectOverrides(
  overrides: object,
  tokens: object,
  path: string[],
  substitutions: Map<string, VaneOverride>,
  file: string | undefined,
): void {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined)
      continue

    const target = (tokens as Record<string, unknown>)[key]
    const keyPath = [...path, key]

    if (target === undefined) {
      const suggestion = didYouMean(key, Object.keys(tokens))
      throw new VaneError({
        code: 'VANE_TOKENS_INVALID_OVERRIDE',
        message: `${keyPath.join('.')} is not a token in this graph${suggestion ? ` — did you mean '${suggestion}'?` : ''}`,
        path: keyPath.join('.'),
        file,
      })
    }

    if (isHandle(target)) {
      substitutions.set(keyPath.join('.'), toOverride(value, keyPath.join('.'), file))
      continue
    }

    if (typeof value !== 'object' || value === null || isColorValue(value) || isContrastValue(value)) {
      throw new VaneError({
        code: 'VANE_TOKENS_INVALID_OVERRIDE',
        message: `${keyPath.join('.')} is a token group — override its tokens individually`,
        path: keyPath.join('.'),
        file,
      })
    }

    collectOverrides(value, target as object, keyPath, substitutions, file)
  }
}

function toOverride(value: unknown, key: string, file: string | undefined): VaneOverride {
  if (isContrastValue(value))
    return { kind: 'contrast', expr: value.expr }

  if (isColorValue(value))
    return { kind: 'color', expr: value.expr, markedLive: value.markedLive }

  if (typeof value === 'string' || typeof value === 'number')
    return { kind: 'literal', value }

  throw new VaneError({
    code: 'VANE_TOKENS_INVALID_OVERRIDE',
    message: `${key} override is not a token value — expected a string, number, or color`,
    path: key,
    file,
  })
}
