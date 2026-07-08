/**
 * `keyframes` and `fontFace` ([dux-spec-css.md §6]): anonymous at-rules whose
 * identity is the export that holds them. Steps are declaration-only rule
 * objects — a condition or selector inside one is semantically meaningless,
 * so the grammar refuses it rather than silently ignoring it.
 */

import type { VaneDiagnostic } from '../diagnostics'
import type { VaneSystemContext } from './css'
import type { VaneFontFaceFunction, VaneKeyframesFunction } from './types'
import { fontFace as substrateFontFace, keyframes as substrateKeyframes } from '@vanilla-extract/css'
import { VaneError } from '../diagnostics'
import { checkDeclaration } from '../internal/cssParser'
import { requireStyleModule } from '../internal/styleModule'
import { kebab } from '../tokens/names'
import { toSubstrateRule } from './emit'
import { isPlainObject, isSelectorKey } from './rule'
import { serializeStyleValue } from './values'

const TIME = /^(?:from|to|\d+(?:\.\d+)?%)(?:\s*,\s*(?:from|to|\d+(?:\.\d+)?%))*$/

export function bindKeyframes(system: VaneSystemContext): VaneKeyframesFunction {
  return (steps, debugId?) => {
    const file = requireStyleModule('keyframes')
    const diagnostics: VaneDiagnostic[] = []
    const compiled: Record<string, Record<string, string | number | Array<string | number>>> = {}

    for (const [time, step] of Object.entries(steps as Record<string, unknown>)) {
      if (step === undefined || step === null)
        continue

      if (!TIME.test(time)) {
        diagnostics.push({
          code: 'VANE_CSS_INVALID_KEY',
          message: `'${time}' is not a keyframe step — steps are 'from', 'to', or percentages`,
          path: time,
          file,
        })
        continue
      }

      if (!isPlainObject(step)) {
        diagnostics.push({
          code: 'VANE_CSS_INVALID_KEY',
          message: `the '${time}' step must be a declarations object`,
          path: time,
          file,
        })
        continue
      }

      const declarations: Record<string, string | number | Array<string | number>> = {}

      for (const [property, value] of Object.entries(step)) {
        if (value === undefined || value === null)
          continue

        const path = `${time}.${property}`

        if (system.conditions.has(property) || isSelectorKey(property) || property.startsWith('@') || (isPlainObject(value) && !property.startsWith('--'))) {
          diagnostics.push({
            code: 'VANE_CSS_INVALID_KEY',
            message: `${path} — conditions and selectors are meaningless inside a keyframe step`,
            path,
            file,
            fix: 'put the condition around the animation declaration in the style that plays it',
          })
          continue
        }

        try {
          const serialized = Array.isArray(value)
            ? value.map(entry => serializeStyleValue(entry, path, { elevation: system.elevation, file }))
            : serializeStyleValue(value, path, { elevation: system.elevation, file })

          for (const entry of Array.isArray(serialized) ? serialized : [serialized]) {
            if (typeof entry !== 'string')
              continue

            const issue = checkDeclaration(kebab(property), entry)

            if (issue !== undefined) {
              diagnostics.push({
                code: issue.kind === 'unknown-property' ? 'VANE_CSS_UNKNOWN_PROPERTY' : 'VANE_CSS_INVALID_VALUE',
                message: `${path}: ${issue.reason}`,
                path,
                file,
              })
            }
          }

          declarations[property] = serialized
        }
        catch (error) {
          if (!(error instanceof VaneError))
            throw error

          diagnostics.push(...error.diagnostics)
        }
      }

      compiled[time] = declarations
    }

    if (diagnostics.length > 0)
      throw new VaneError(diagnostics)

    const substrateSteps = Object.fromEntries(
      Object.entries(compiled).map(([time, declarations]) => [time, toSubstrateRule(declarations)]),
    )

    return substrateKeyframes(substrateSteps as Parameters<typeof substrateKeyframes>[0], debugId)
  }
}

export function bindFontFace(): VaneFontFaceFunction {
  return (rule, debugId?) => {
    requireStyleModule('fontFace')
    return substrateFontFace(rule as Parameters<typeof substrateFontFace>[0], debugId)
  }
}
