/**
 * The build-side machinery `recipe()` and `anatomy()` share: arm compilation
 * (diagnostics aggregated across every arm, not thrown at the first),
 * selection validation for `defaults` and compound `when`, port publication
 * checks, and the defaults fold — the pieces that keep the two factories one
 * grammar ([dux-spec-recipes.md §3], principle 5).
 */

import type { VaneSystemContext } from '../css/css'
import type { VaneCompiled, VaneRuleContext } from '../css/rule'
import type { VaneDiagnostic } from '../diagnostics'
import type { VanePort } from '../ports/types'
import { armKey, checkLayer, compileRule, isPlainObject } from '../css/rule'
import { didYouMean, VaneError } from '../diagnostics'
import { isPort } from '../ports/port'

/** The rolling state one factory call accumulates. */
export interface VaneRecipeBuild {
  ctx: VaneRuleContext
  diagnostics: VaneDiagnostic[]
  layer: string
}

/** Resolve the recipe-level layer and seed the build state. */
export function startBuild(
  options: { layer?: unknown },
  system: VaneSystemContext,
  file: string,
  scopedConditions?: VaneRuleContext['scopedConditions'],
): VaneRecipeBuild {
  const diagnostics: VaneDiagnostic[] = []
  let layer = system.defaultLayer

  if (typeof options.layer === 'string') {
    const diagnostic = checkLayer(options.layer, system.layers)

    if (diagnostic === undefined)
      layer = options.layer
    else
      diagnostics.push({ ...diagnostic, file })
  }

  return {
    ctx: { ...system, file, scopedConditions },
    diagnostics,
    layer,
  }
}

/**
 * Compile one arm, reporting into the build instead of throwing — every
 * mistake across every arm surfaces in one pass. A `layer` key inside an arm
 * is refused: a recipe lives in one layer, declared at its root.
 */
export function compileArm(build: VaneRecipeBuild, arm: unknown, path: string[]): VaneCompiled {
  const empty: VaneCompiled = { layer: build.layer, units: [] }

  if (arm === undefined || arm === null)
    return empty

  if (!isPlainObject(arm)) {
    build.diagnostics.push({
      code: 'VANE_RECIPE_INVALID_KEY',
      message: `${path.join('.')} takes a style rule`,
      path: path.join('.'),
      file: build.ctx.file,
    })
    return empty
  }

  let rule = arm

  if ('layer' in arm) {
    build.diagnostics.push({
      code: 'VANE_RECIPE_INVALID_KEY',
      message: `${path.join('.')}.layer — a recipe lives in one layer; 'layer' applies to the whole recipe`,
      path: `${path.join('.')}.layer`,
      file: build.ctx.file,
      fix: 'move layer to the top level of the recipe options',
    })
    const { layer: _stripped, ...rest } = arm
    rule = rest
  }

  try {
    const compiled = compileRule(rule, { ...build.ctx, rootPath: path })
    return { layer: build.layer, units: compiled.units }
  }
  catch (error) {
    if (error instanceof VaneError) {
      build.diagnostics.push(...error.diagnostics)
      return empty
    }

    throw error
  }
}

/**
 * Validate a `defaults` or compound `when` map against the declared variant
 * space — an unknown axis or value is a diagnostic naming the valid set.
 */
export function checkSelection(
  build: VaneRecipeBuild,
  selection: unknown,
  variants: Record<string, Record<string, unknown>>,
  toggles: Record<string, unknown>,
  path: string,
): Record<string, string | boolean> {
  const checked: Record<string, string | boolean> = {}

  if (selection === undefined || selection === null)
    return checked

  for (const [key, value] of Object.entries(selection)) {
    if (value === undefined)
      continue

    const at = `${path}.${key}`

    if (key in variants) {
      const values = Object.keys(variants[key])

      if (typeof value === 'string' && values.includes(value)) {
        checked[key] = value
      }
      else {
        build.diagnostics.push({
          code: 'VANE_RECIPE_UNKNOWN_VALUE',
          message: `${at} is ${JSON.stringify(value)}, which ${key} does not declare — valid values: ${values.join(', ')}`,
          path: at,
          file: build.ctx.file,
        })
      }
      continue
    }

    if (key in toggles) {
      if (typeof value === 'boolean') {
        checked[key] = value
      }
      else {
        build.diagnostics.push({
          code: 'VANE_RECIPE_UNKNOWN_VALUE',
          message: `${at} is ${JSON.stringify(value)}, but ${key} is a toggle — it takes true or false`,
          path: at,
          file: build.ctx.file,
        })
      }
      continue
    }

    const suggestion = didYouMean(key, [...Object.keys(variants), ...Object.keys(toggles)])
    build.diagnostics.push({
      code: 'VANE_RECIPE_UNKNOWN_VARIANT',
      message: `${at} names no declared variant or toggle${suggestion ? ` — did you mean '${suggestion}'?` : ''}`,
      path: at,
      file: build.ctx.file,
      fix: suggestion ? `use '${suggestion}', or declare the variant` : 'declare it under variants or toggles',
    })
  }

  return checked
}

/** Publication is port handles only — anything else gets one clear diagnostic. */
export function checkPorts(build: VaneRecipeBuild, ports: unknown): Record<string, VanePort> {
  const checked: Record<string, VanePort> = {}

  if (ports === undefined || ports === null)
    return checked

  for (const [name, value] of Object.entries(ports)) {
    if (isPort(value)) {
      checked[name] = value
    }
    else {
      build.diagnostics.push({
        code: 'VANE_RECIPE_INVALID_KEY',
        message: `ports.${name} is not a port — the ports key publishes handles declared with port()`,
        path: `ports.${name}`,
        file: build.ctx.file,
        fix: 'declare it in module scope — const gap = port(t.space.xs) — and publish that handle',
      })
    }
  }

  return checked
}

/** Throw once with everything the build collected — never a diagnostic drip. */
export function finishBuild(build: VaneRecipeBuild): void {
  if (build.diagnostics.length > 0)
    throw new VaneError(build.diagnostics)
}

// ─── The defaults fold ───────────────────────────────────────────────────────

/**
 * Whether `sibling` declares everything `target` declares, arm for arm —
 * the soundness condition for folding a default value into base: any other
 * choice must overwrite every folded declaration, or the fold would leak.
 */
export function covers(sibling: VaneCompiled, target: VaneCompiled): boolean {
  for (const unit of target.units) {
    const key = armKey(unit.arm)
    const match = sibling.units.find(candidate => armKey(candidate.arm) === key)

    if (match === undefined)
      return false

    for (const property of Object.keys(unit.declarations)) {
      if (!(property in match.declarations))
        return false
    }
  }

  return true
}

/** Merge compiled rules, later declarations winning per arm — the fold's mechanics. */
export function mergeCompiled(into: VaneCompiled, from: VaneCompiled): VaneCompiled {
  const units = new Map(
    into.units.map(unit => [armKey(unit.arm), { arm: unit.arm, declarations: { ...unit.declarations } }]),
  )

  for (const unit of from.units) {
    const key = armKey(unit.arm)
    const existing = units.get(key)

    if (existing)
      Object.assign(existing.declarations, unit.declarations)
    else
      units.set(key, { arm: unit.arm, declarations: { ...unit.declarations } })
  }

  return { layer: into.layer, units: [...units.values()] }
}

/** Join a debug id with an arm suffix; without one, the suffix still names the arm. */
export function debugName(debugId: string | undefined, ...suffix: string[]): string {
  return [debugId, ...suffix].filter(Boolean).join('_')
}
