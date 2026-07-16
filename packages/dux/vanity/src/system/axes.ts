/** Engine-defined environmental axes and their root-anchored condition IR. */

import type { VanityCondition, VanityConditionArm, VanityConditionInput } from './conditions'
import { checkQuery, checkSelector } from '../internal/cssParser'
import { kebab } from '../tokens/names'

export type VanityAxisLocality = 'element' | 'root' | 'subtree' | 'document' | 'absolute'
export type VanityAxisMechanism = 'selector' | 'media' | 'supports' | 'container' | 'native'

export interface VanityAxisTriggerArm extends VanityConditionArm {
  readonly mechanism: Exclude<VanityAxisMechanism, 'native'>
  readonly locality: Exclude<VanityAxisLocality, 'element'>
  readonly priority: number
  readonly placement: 'root' | 'ancestor' | 'descendant' | 'absolute' | 'query'
  readonly degraded?: true
  /** Query-free DOM mutation that selects this mode on a bound runtime root. */
  readonly runtime?: {
    readonly kind: 'attribute'
    readonly name: string
    readonly value: string
  }
}

export const VANITY_AXIS_TRIGGER = Symbol.for('vanity.axisTrigger')

export interface VanityAxisTrigger {
  readonly [VANITY_AXIS_TRIGGER]: true
  readonly arms: readonly VanityAxisTriggerArm[]
}

export const VANITY_DEFAULT_MODE = Symbol.for('vanity.defaultAxisMode')

export interface VanityDefaultAxisMode extends VanityAxisTrigger {
  readonly [VANITY_DEFAULT_MODE]: true
}

export type VanityAxisModeInput = VanityAxisTrigger | VanityDefaultAxisMode

export interface VanityNativeSchemePolicy {
  readonly kind: 'scheme'
  /** Element-local preserves nested used `color-scheme`; root computes once at the token root. */
  readonly locality: 'element' | 'root'
  /** Explicit acknowledgement when an element-local target lacks native `light-dark()`. */
  readonly fallback: 'diagnose' | 'document'
  readonly light: string
  readonly dark: string
}

export interface VanityAxisConfig<
  Modes extends Readonly<Record<string, VanityAxisModeInput>>,
  Derive extends Partial<Record<keyof Modes & string, (
    modes: Readonly<Record<keyof Modes & string, any>>,
  ) => unknown>> = Record<never, never>,
> {
  readonly modes: Modes
  /** The base relationship; `defaultMode()` is equivalent and may carry a trigger. */
  readonly default?: keyof Modes & string
  /** Tie-breaker for overlapping mode arms; must list every mode exactly once. */
  readonly modeOrder?: readonly (keyof Modes & string)[]
  /** Missing mode values may be derived from authored sibling values at token-finalization time. */
  readonly derive?: Derive
  readonly native?: VanityNativeSchemePolicy
  readonly description?: string
}

export const VANITY_AXIS_DEFINITION = Symbol.for('vanity.axisDefinition')

export interface VanityAxisDefinition<
  Modes extends Readonly<Record<string, VanityAxisModeInput>> = Readonly<Record<string, VanityAxisModeInput>>,
  Derive extends Partial<Record<keyof Modes & string, (
    modes: Readonly<Record<keyof Modes & string, any>>,
  ) => unknown>> = Record<never, never>,
> {
  readonly [VANITY_AXIS_DEFINITION]: true
  readonly modes: Modes
  readonly defaultMode?: keyof Modes & string
  readonly modeOrder: readonly (keyof Modes & string)[]
  readonly derive: Readonly<Derive>
  readonly native?: VanityNativeSchemePolicy
  readonly description?: string
}

export type VanityAxisDefinitions = Readonly<Record<string, VanityAxisDefinition<any, any>>>
export type VanityAxisName<Axes extends VanityAxisDefinitions> = keyof Axes & string
export type VanityAxisModeName<Axis> = Axis extends { readonly modes: infer Modes } ? keyof Modes & string : never

export interface VanityAxisRegistry<Axes extends VanityAxisDefinitions = VanityAxisDefinitions> {
  readonly definitions: Axes
  readonly order: readonly VanityAxisName<Axes>[]
}

/** Stable, JSON-safe environmental contract projected into inspection manifests. */
export interface VanityAxisRegistryDescription {
  readonly order: readonly string[]
  readonly definitions: Readonly<Record<string, {
    readonly defaultMode?: string
    readonly modeOrder: readonly string[]
    readonly description?: string
    readonly native?: VanityNativeSchemePolicy
    readonly modes: Readonly<Record<string, {
      readonly derived: boolean
      readonly arms: readonly {
        readonly when: string
        readonly mechanism: Exclude<VanityAxisMechanism, 'native'>
        readonly locality: Exclude<VanityAxisLocality, 'element'>
        readonly placement: VanityAxisTriggerArm['placement']
        readonly priority: number
        readonly degraded?: true
        readonly runtime?: VanityAxisTriggerArm['runtime']
      }[]
    }>>
  }>>
}

export interface VanityAxisConditionOptions {
  readonly on?: 'root' | 'ancestor' | 'descendant'
  readonly priority?: number
}

export interface VanityAbsoluteAxisConditionOptions {
  readonly priority?: number
}

export interface VanitySchemeAxisOptions {
  readonly locality?: 'element' | 'root'
  readonly fallback?: 'diagnose' | 'document'
  readonly description?: string
}

export interface VanityAxisAuthoringHelpers {
  readonly axis: <
    const Modes extends Readonly<Record<string, VanityAxisModeInput>>,
    const Derive extends Partial<Record<keyof Modes & string, (
      modes: Readonly<Record<keyof Modes & string, any>>,
    ) => unknown>> = Record<never, never>,
  >(
    config: VanityAxisConfig<Modes, Derive> & {
      readonly derive?: Derive & Partial<Record<keyof Modes & string, (
        modes: Readonly<Record<keyof Modes & string, any>>,
      ) => unknown>>
    },
  ) => VanityAxisDefinition<Modes, Derive>
  readonly defaultMode: (trigger?: VanityConditionInput | VanityAxisTrigger) => VanityDefaultAxisMode
  readonly condition: (
    input: VanityConditionInput,
    options?: VanityAxisConditionOptions,
  ) => VanityAxisTrigger
  readonly absoluteCondition: (
    selector: string,
    options?: VanityAbsoluteAxisConditionOptions,
  ) => VanityAxisTrigger
  readonly data: (
    attribute: string,
    value?: string,
    options?: VanityAxisConditionOptions,
  ) => VanityAxisTrigger
  readonly schemeIs: (mode: 'light' | 'dark') => VanityAxisTrigger
  readonly scheme: (options?: VanitySchemeAxisOptions) => VanityAxisDefinition<{
    readonly light: VanityAxisTrigger
    readonly dark: VanityAxisTrigger
  }>
}

type TupleDuplicates<Values extends readonly string[], Seen extends string = never>
  = Values extends readonly [infer Head extends string, ...infer Tail extends readonly string[]]
    ? Head extends Seen ? Head | TupleDuplicates<Tail, Seen> : TupleDuplicates<Tail, Seen | Head>
    : never

export type VanityAxisOrderGuard<
  Axes extends VanityAxisDefinitions,
  Order extends readonly VanityAxisName<Axes>[],
> = Exclude<VanityAxisName<Axes>, Order[number]> extends never
  ? TupleDuplicates<Order> extends never ? Order : never
  : never

export type VanityAxisOrderRestGuard<
  Axes extends VanityAxisDefinitions,
  First extends VanityAxisName<Axes>,
  Rest extends readonly VanityAxisName<Axes>[],
> = VanityAxisOrderGuard<Axes, readonly [First, ...Rest]> extends never ? never : Rest

export const EMPTY_AXIS_REGISTRY: VanityAxisRegistry<Record<never, never>> = Object.freeze({
  definitions: Object.freeze({}),
  order: Object.freeze([]),
})

export const axisAuthoringHelpers: VanityAxisAuthoringHelpers = Object.freeze({
  axis: defineAxis,
  defaultMode,
  condition: axisCondition,
  absoluteCondition,
  data: axisData,
  schemeIs: axisSchemeIs,
  scheme: schemeAxis,
})

export function defineAxis<
  const Modes extends Readonly<Record<string, VanityAxisModeInput>>,
  const Derive extends Partial<Record<keyof Modes & string, (
    modes: Readonly<Record<keyof Modes & string, any>>,
  ) => unknown>> = Record<never, never>,
>(
  config: VanityAxisConfig<Modes, Derive> & {
    readonly derive?: Derive & Partial<Record<keyof Modes & string, (
      modes: Readonly<Record<keyof Modes & string, any>>,
    ) => unknown>>
  },
): VanityAxisDefinition<Modes, Derive> {
  if (!isPlainObject(config) || !isPlainObject(config.modes))
    throw new TypeError('[vanity] axis() needs a plain modes object')

  const names = Object.keys(config.modes)
  if (names.length === 0)
    throw new TypeError('[vanity] an axis needs at least one mode')

  let markedDefault: string | undefined
  const modes: Record<string, VanityAxisModeInput> = {}
  for (const [name, mode] of Object.entries(config.modes)) {
    if (!isAxisTrigger(mode))
      throw new TypeError(`[vanity] axis mode '${name}' needs a condition helper or defaultMode()`)
    if (VANITY_DEFAULT_MODE in mode) {
      if (markedDefault !== undefined)
        throw new TypeError(`[vanity] axis modes '${markedDefault}' and '${name}' are both marked as the default`)
      markedDefault = name
    }
    modes[name] = mode
  }

  const configuredDefault = config.default
  if (configuredDefault !== undefined && !names.includes(configuredDefault))
    throw new TypeError(`[vanity] axis default '${configuredDefault}' is not one of: ${names.join(', ')}`)
  if (configuredDefault !== undefined && markedDefault !== undefined && configuredDefault !== markedDefault)
    throw new TypeError(`[vanity] axis default '${configuredDefault}' conflicts with defaultMode() on '${markedDefault}'`)

  const modeOrder = config.modeOrder === undefined ? names : [...config.modeOrder]
  assertExactOrder('axis modeOrder', names, modeOrder)

  const armOwners = new Map<string, string>()
  for (const mode of names) {
    for (const arm of modes[mode]!.arms) {
      const address = JSON.stringify({
        media: arm.media,
        supports: arm.supports,
        container: arm.container,
        selector: arm.selector,
        priority: arm.priority,
      })
      const owner = armOwners.get(address)
      if (owner !== undefined) {
        throw new TypeError(
          `[vanity] axis modes '${owner}' and '${mode}' declare the same trigger at the same priority; `
          + 'use distinct conditions or an explicit priority to make overlap intentional',
        )
      }
      armOwners.set(address, mode)
    }
  }

  for (const mode of Object.keys(config.derive ?? {})) {
    if (!names.includes(mode))
      throw new TypeError(`[vanity] axis derives unknown mode '${mode}'`)
    if (typeof config.derive![mode] !== 'function')
      throw new TypeError(`[vanity] axis derivation for '${mode}' must be a function`)
  }

  if (config.native?.kind === 'scheme') {
    if (!names.includes(config.native.light) || !names.includes(config.native.dark))
      throw new TypeError('[vanity] native scheme modes must exist in the axis')
  }

  return Object.freeze({
    [VANITY_AXIS_DEFINITION]: true as const,
    modes: Object.freeze(modes) as Modes,
    ...((configuredDefault ?? markedDefault) === undefined ? {} : { defaultMode: configuredDefault ?? markedDefault }),
    modeOrder: Object.freeze(modeOrder) as readonly (keyof Modes & string)[],
    derive: Object.freeze({ ...(config.derive ?? {}) }),
    ...(config.native === undefined ? {} : { native: Object.freeze({ ...config.native }) }),
    ...(config.description === undefined ? {} : { description: config.description }),
  }) as unknown as VanityAxisDefinition<Modes, Derive>
}

export function defaultMode(trigger?: VanityConditionInput | VanityAxisTrigger): VanityDefaultAxisMode {
  const normalized = trigger === undefined
    ? createTrigger([])
    : isAxisTrigger(trigger) ? trigger : axisCondition(trigger)
  return Object.freeze({
    [VANITY_AXIS_TRIGGER]: true as const,
    [VANITY_DEFAULT_MODE]: true as const,
    arms: normalized.arms,
  })
}

export function axisCondition(
  input: VanityConditionInput,
  options: VanityAxisConditionOptions = {},
): VanityAxisTrigger {
  const condition = typeof input === 'string' ? parseCondition(input) : input
  const priority = normalizePriority(options.priority)
  return createTrigger(condition.arms.map((arm) => {
    const query = queryMechanism(arm)
    if (query) {
      return Object.freeze({
        ...arm,
        mechanism: query,
        locality: 'document' as const,
        priority,
        placement: 'query' as const,
      })
    }

    const inferredPlacement = inferPlacement(arm.selector!)
    if (options.on !== undefined && arm.selector!.includes('&') && options.on !== inferredPlacement) {
      throw new TypeError(
        `[vanity] axis condition '${arm.selector}' is anchored as '${inferredPlacement}' but declares on: '${options.on}'`,
      )
    }
    const placement = options.on ?? inferredPlacement
    const selector = placeSelector(arm.selector!, placement)
    const locality = placement === 'descendant' ? 'subtree' : 'root'
    return Object.freeze({
      ...arm,
      selector,
      mechanism: 'selector' as const,
      locality,
      priority,
      placement,
    })
  }))
}

export function absoluteCondition(
  selector: string,
  options: VanityAbsoluteAxisConditionOptions = {},
): VanityAxisTrigger {
  if (selector.includes('&') || checkSelector(selector))
    throw new TypeError(`[vanity] absoluteCondition('${selector}') needs a valid absolute selector without '&'`)
  return createTrigger([Object.freeze({
    selector,
    mechanism: 'selector' as const,
    locality: 'absolute' as const,
    priority: normalizePriority(options.priority),
    placement: 'absolute' as const,
  })])
}

export function axisData(
  attribute: string,
  value?: string,
  options: VanityAxisConditionOptions = {},
): VanityAxisTrigger {
  const name = `data-${kebab(attribute)}`
  const selector = value === undefined ? `[${name}]` : `[${name}='${value}']`
  const on = options.on ?? 'root'
  const trigger = axisCondition(selector, { ...options, on })
  if (on !== 'root')
    return trigger
  return createTrigger(trigger.arms.map(arm => Object.freeze({
    ...arm,
    runtime: Object.freeze({ kind: 'attribute' as const, name, value: value ?? '' }),
  })))
}

export function axisSchemeIs(mode: 'light' | 'dark'): VanityAxisTrigger {
  return createTrigger([
    Object.freeze({
      media: `(prefers-color-scheme: ${mode})`,
      mechanism: 'media' as const,
      locality: 'document' as const,
      priority: 0,
      placement: 'query' as const,
    }),
    Object.freeze({
      selector: `&[data-scheme='${mode}']`,
      mechanism: 'selector' as const,
      locality: 'root' as const,
      priority: 100,
      placement: 'root' as const,
      runtime: Object.freeze({ kind: 'attribute' as const, name: 'data-scheme', value: mode }),
    }),
  ])
}

export function schemeAxis(options: VanitySchemeAxisOptions = {}): VanityAxisDefinition<{
  readonly light: VanityAxisTrigger
  readonly dark: VanityAxisTrigger
}> {
  const locality = options.locality ?? 'element'
  return defineAxis({
    modes: { light: axisSchemeIs('light'), dark: axisSchemeIs('dark') },
    default: 'light',
    modeOrder: ['light', 'dark'],
    native: {
      kind: 'scheme',
      locality,
      fallback: options.fallback ?? 'diagnose',
      light: 'light',
      dark: 'dark',
    },
    ...(options.description === undefined ? {} : { description: options.description }),
  })
}

export function normalizeAxisAdditions<const Axes extends VanityAxisDefinitions>(
  existing: VanityAxisRegistry<any>,
  additions: Axes,
): VanityAxisRegistry<VanityAxisDefinitions & Axes> {
  if (!isPlainObject(additions))
    throw new TypeError('[vanity] axes() callback must return a plain axis record')

  const merged: Record<string, VanityAxisDefinition> = { ...existing.definitions }
  const order = [...existing.order]
  for (const [name, definition] of Object.entries(additions)) {
    if (isIntegerIndex(name))
      throw new TypeError(`[vanity] axis name '${name}' is integer-like; use a semantic non-integer name so declaration order stays stable`)
    if (name in merged)
      throw new TypeError(`[vanity] axis '${name}' is already defined on this engine`)
    if (!isAxisDefinition(definition))
      throw new TypeError(`[vanity] axis '${name}' must be created with axis() or scheme()`)
    merged[name] = definition
    order.push(name)
  }

  return Object.freeze({
    definitions: Object.freeze(merged),
    order: Object.freeze(order),
  }) as VanityAxisRegistry<VanityAxisDefinitions & Axes>
}

export function reorderAxes<Axes extends VanityAxisDefinitions>(
  registry: VanityAxisRegistry<Axes>,
  order: readonly VanityAxisName<Axes>[],
): VanityAxisRegistry<Axes> {
  assertExactOrder('axisOrder()', registry.order, order)
  return Object.freeze({ definitions: registry.definitions, order: Object.freeze([...order]) })
}

export function describeAxisRegistry(registry: VanityAxisRegistry<any>): VanityAxisRegistryDescription {
  return {
    order: [...registry.order],
    definitions: Object.fromEntries(registry.order.map((axis) => {
      const definition = registry.definitions[axis]!
      return [axis, {
        ...(definition.defaultMode === undefined ? {} : { defaultMode: definition.defaultMode }),
        modeOrder: [...definition.modeOrder],
        ...(definition.description === undefined ? {} : { description: definition.description }),
        ...(definition.native === undefined ? {} : { native: { ...definition.native } }),
        modes: Object.fromEntries(definition.modeOrder.map((mode: string) => [mode, {
          derived: mode in definition.derive,
          arms: definition.modes[mode]!.arms.map((arm: VanityAxisTriggerArm) => ({
            when: describeArm(arm),
            mechanism: arm.mechanism,
            locality: arm.locality,
            placement: arm.placement,
            priority: arm.priority,
            ...(arm.degraded === undefined ? {} : { degraded: true as const }),
            ...(arm.runtime === undefined ? {} : { runtime: arm.runtime }),
          })),
        }])),
      }]
    })),
  }
}

function describeArm(arm: VanityAxisTriggerArm): string {
  return [
    arm.media === undefined ? undefined : `@media ${arm.media}`,
    arm.supports === undefined ? undefined : `@supports ${arm.supports}`,
    arm.container === undefined ? undefined : `@container ${arm.container}`,
    arm.selector,
  ].filter((part): part is string => part !== undefined).join(' ')
}

export function axisSemanticPolicy(registry: VanityAxisRegistry<any>): Readonly<Record<string, unknown>> {
  return Object.freeze({
    order: registry.order,
    definitions: Object.freeze(Object.fromEntries(registry.order.map((name) => {
      const definition = registry.definitions[name]!
      return [name, Object.freeze({
        modes: definition.modeOrder,
        ...(definition.defaultMode === undefined ? {} : { default: definition.defaultMode }),
        ...(definition.native === undefined ? {} : { native: definition.native }),
        triggers: Object.freeze(Object.fromEntries(definition.modeOrder.map((mode: string) => [
          mode,
          definition.modes[mode]!.arms,
        ]))),
      })]
    }))),
  })
}

export function isAxisDefinition(value: unknown): value is VanityAxisDefinition {
  return typeof value === 'object' && value !== null
    && (value as Partial<VanityAxisDefinition>)[VANITY_AXIS_DEFINITION] === true
}

export function isAxisTrigger(value: unknown): value is VanityAxisTrigger {
  return typeof value === 'object' && value !== null
    && (value as Partial<VanityAxisTrigger>)[VANITY_AXIS_TRIGGER] === true
}

function createTrigger(arms: readonly VanityAxisTriggerArm[]): VanityAxisTrigger {
  return Object.freeze({
    [VANITY_AXIS_TRIGGER]: true as const,
    arms: Object.freeze([...arms]),
  })
}

function parseCondition(input: string): VanityCondition {
  for (const [prefix, key] of [['@media ', 'media'], ['@supports ', 'supports'], ['@container ', 'container']] as const) {
    if (input.startsWith(prefix)) {
      const query = input.slice(prefix.length).trim()
      const reason = checkQuery(key, query)
      if (reason)
        throw new TypeError(`[vanity] axis condition '${input}' does not parse: ${reason}`)
      return { arms: [{ [key]: query }] }
    }
  }
  if (checkSelector(input))
    throw new TypeError(`[vanity] axis condition '${input}' is not a valid selector`)
  return { arms: [{ selector: input }] }
}

function queryMechanism(arm: VanityConditionArm): 'media' | 'supports' | 'container' | undefined {
  if (arm.media !== undefined)
    return 'media'
  if (arm.supports !== undefined)
    return 'supports'
  if (arm.container !== undefined)
    return 'container'
  return undefined
}

function inferPlacement(selector: string): 'root' | 'ancestor' | 'descendant' {
  if (selector.includes('&')) {
    const before = selector.slice(0, selector.indexOf('&')).trim()
    const authoredAfter = selector.slice(selector.indexOf('&') + 1)
    const after = authoredAfter.trimStart()
    if (before.length > 0)
      return 'ancestor'
    if (/^\s/.test(authoredAfter) || after.startsWith('>') || after.startsWith('+') || after.startsWith('~'))
      return 'descendant'
  }
  return 'root'
}

function placeSelector(selector: string, placement: 'root' | 'ancestor' | 'descendant'): string {
  if (selector.includes('&'))
    return selector
  if (placement === 'ancestor')
    return `${selector} &`
  if (placement === 'descendant')
    return `& ${selector}`
  return `&${selector}`
}

function normalizePriority(priority: number | undefined): number {
  const value = priority ?? 0
  if (!Number.isFinite(value))
    throw new TypeError('[vanity] axis condition priority must be a finite number')
  return value
}

function assertExactOrder(label: string, expected: readonly string[], actual: readonly string[]): void {
  const duplicates = actual.filter((value, index) => actual.indexOf(value) !== index)
  const missing = expected.filter(value => !actual.includes(value))
  const unknown = actual.filter(value => !expected.includes(value))
  if (duplicates.length || missing.length || unknown.length) {
    throw new TypeError(
      `[vanity] ${label} must list every name exactly once`
      + `${missing.length ? `; missing: ${missing.join(', ')}` : ''}`
      + `${duplicates.length ? `; duplicate: ${[...new Set(duplicates)].join(', ')}` : ''}`
      + `${unknown.length ? `; unknown: ${unknown.join(', ')}` : ''}`,
    )
  }
}

function isIntegerIndex(value: string): boolean {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 && number < 2 ** 32 - 1 && String(number) === value
}

function isPlainObject(value: unknown): value is Record<string, any> {
  if (typeof value !== 'object' || value === null)
    return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}
