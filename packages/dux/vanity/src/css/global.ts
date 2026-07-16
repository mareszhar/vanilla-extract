/**
 * `globalCss` ([vanity-spec-css.md §7]): the explicit global lane — same rule
 * shape as `css()` including conditions, no class generated, `reset` layer by
 * default, and just as validated as the scoped lane.
 */

import type { VanitySystemContext } from './css'
import type { VanityGlobalCssFunction } from './types'
import { VanityError } from '../diagnostics'
import { checkSelector } from '../internal/cssParser'
import { record } from '../internal/inspect'
import { requireStyleModule } from '../internal/styleModule'
import { emitGlobal } from './emit'
import { compileRule } from './rule'

export function bindGlobalCss(system: VanitySystemContext): VanityGlobalCssFunction<string, string> {
  return (selector, rule) => {
    const file = requireStyleModule('globalCss')
    const reason = checkSelector(selector)

    if (reason !== undefined) {
      throw new VanityError({
        code: 'VANITY_CSS_INVALID_SELECTOR',
        message: `the globalCss selector '${selector}' does not parse: ${reason}`,
        file,
        fix: 'fix the selector — the same text must hold as CSS',
      })
    }

    const compiled = compileRule(rule, {
      ...system,
      defaultLayer: system.globalDefaultLayer,
      file,
    })

    record({ kind: 'escape', form: 'globalCss', file, detail: selector, layer: compiled.layer })

    emitGlobal(selector, compiled)
  }
}
