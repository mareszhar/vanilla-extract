/**
 * `css()` — the style unit ([dux-spec-css.md §2]): CSS with an index. The
 * factory closes over the system's compiled conditions and layers; each call
 * resolves the evaluating style module, compiles, validates,
 * and emits — returning a class string whose rules compiled away.
 */

import type { VaneConditionArm } from '../system/conditions'
import type { VanePropertyAliasCssFunction, VanePropertyAliasMap, VanePropertyAliasMode } from './types'
import { diagnosticSource } from '../diagnostics'
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
  /** Optional alias policy contributed by a public engine plugin. */
  propertyAliases?: {
    aliases: VanePropertyAliasMap
    expose: VanePropertyAliasMode
  }
}

export function bindCss(system: VaneSystemContext): VanePropertyAliasCssFunction<string, string, VanePropertyAliasMap> {
  const emit = (rule: object, debugId?: string, standard = false): string => {
    const file = requireStyleModule('css')
    if (standard && system.propertyAliases?.expose === 'aliases-only') {
      record({
        kind: 'escape',
        form: 'css.standard',
        file,
        detail: debugId ?? (Object.keys(rule).slice(0, 3).join(', ') || 'css.standard()'),
      })
    }
    const compiled = compileRule(rule, {
      ...system,
      ...(standard ? { propertyAliases: undefined } : {}),
      file,
    })

    // An overrides-layer style is a deliberate exception by convention
    // ([dux-patterns.md §6/§8]) — inventoried, findable, removable.
    if (compiled.layer === 'overrides')
      record({ kind: 'escape', form: 'overrides', file, detail: debugId ?? 'css()', layer: compiled.layer })

    const className = emitStyle(compiled, debugId)
    const source = diagnosticSource()

    record({
      kind: 'style',
      file,
      class: className,
      ...(debugId === undefined ? {} : { name: debugId }),
      vars: referencedVars(compiled.units.flatMap(unit => Object.values(unit.declarations))),
      ...(source === undefined ? {} : source),
    })

    return className
  }

  const css = (rule: object, debugId?: string): string => emit(rule, debugId)

  css.raw = bindRaw(system)
  css.standard = (rule: object, debugId?: string) => emit(rule, debugId, true)
  return css as VanePropertyAliasCssFunction<string, string, VanePropertyAliasMap>
}

function referencedVars(values: Array<string | number | Array<string | number>>): string[] {
  const vars = new Set<string>()

  for (const value of values.flat()) {
    for (const match of String(value).matchAll(/var\((--[\w-]+)/g))
      vars.add(match[1])
  }

  return [...vars]
}
