/**
 * `globalCss` ([dux-spec-css.md §7]): the explicit global lane — same rule
 * shape as `css()` including conditions, no class generated, `reset` layer by
 * default, and just as validated as the scoped lane.
 */

import type { VaneSystemContext } from './css'
import type { VaneGlobalCssFunction } from './types'
import { VaneError } from '../diagnostics'
import { checkSelector } from '../internal/cssParser'
import { requireStyleModule } from '../internal/styleModule'
import { emitGlobal } from './emit'
import { compileRule } from './rule'

export function bindGlobalCss(system: VaneSystemContext): VaneGlobalCssFunction<string, string> {
  return (selector, rule) => {
    const file = requireStyleModule('globalCss')
    const reason = checkSelector(selector)

    if (reason !== undefined) {
      throw new VaneError({
        code: 'VANE_CSS_INVALID_SELECTOR',
        message: `the globalCss selector '${selector}' does not parse: ${reason}`,
        file,
        fix: 'fix the selector — the same text must hold as CSS',
      })
    }

    emitGlobal(selector, compileRule(rule, {
      ...system,
      defaultLayer: system.globalDefaultLayer,
      file,
    }))
  }
}
