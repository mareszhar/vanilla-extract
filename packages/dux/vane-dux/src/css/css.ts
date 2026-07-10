/**
 * `css()` — the style unit ([dux-spec-css.md §2]): CSS with an index. The
 * factory closes over the system's compiled conditions and layers; each call
 * resolves the evaluating style module, compiles, validates,
 * and emits — returning a class string whose rules compiled away.
 */

import type { VaneConditionArm } from '../system/conditions'
import type { VaneCssFunction } from './types'
import { record } from '../internal/inspect'
import { requireStyleModule } from '../internal/styleModule'
import { emitStyle } from './emit'
import { bindRaw } from './raw'
import { compileRule } from './rule'

/** Everything a bound authoring function needs from its system. */
export interface VaneSystemContext {
  conditions: Map<string, readonly VaneConditionArm[]>
  layers: readonly string[]
  /** Where `css()` rules land by default — the first non-reserved authoring layer. */
  defaultLayer: string
  /** Where `globalCss()` rules land by default. */
  globalDefaultLayer: string
  /** The system's root layer (its prefix) — every emitted rule nests under it. */
  layerRoot: string
}

export function bindCss(system: VaneSystemContext): VaneCssFunction<string, string> {
  const css = (rule: object, debugId?: string): string => {
    const file = requireStyleModule('css')
    const compiled = compileRule(rule, { ...system, file })

    // An overrides-layer style is a deliberate exception by convention
    // ([dux-patterns.md §6/§8]) — inventoried, findable, removable.
    if (compiled.layer === 'overrides')
      record({ kind: 'escape', form: 'overrides', file, detail: debugId ?? 'css()', layer: compiled.layer })

    return emitStyle(compiled, debugId)
  }

  css.raw = bindRaw(system)
  return css as VaneCssFunction<string, string>
}
