/** Public types for ports: component-owned, defaulted custom properties. */

import type {
  VaneInvalidRuntimeValuePolicy,
  VaneRuntimeValidationMode,
  VaneStandardSchemaV1,
} from '../tokens/types'
import type {
  VaneCssDataType,
  VaneDataTypeOf,
  VaneValue,
} from '../values/types'

export type VanePortValue = string | number
export type VanePortStyle = Record<`--${string}`, VanePortValue>

export interface VanePortTokenReference<Type extends VaneCssDataType = VaneCssDataType> {
  readonly $type: Type
  readonly $var: (fallback?: never) => `var(--${string})` | `var(--${string}, ${string})`
  toString: () => string
}

export interface VanePortLegacyReference {
  readonly var: `var(--${string})` | `var(--${string}, ${string})`
}

export type VanePortInput
  = | string
    | number
    | VaneValue
    | VanePortTokenReference
    | VanePortLegacyReference

export type VanePortDataTypeOf<Value>
  = Value extends VaneValue<infer Type> ? Type
    : Value extends VanePortTokenReference<infer Type> ? Type
      : Value extends { readonly type: infer Type extends VaneCssDataType, readonly var: `var(--${string}, ${string})` } ? Type
        : Value extends number ? 'number'
          : Value extends string
            ? VaneDataTypeOf<Value> extends 'unknown' ? 'declaration' : VaneDataTypeOf<Value>
            : 'unknown'

/** Kept as coarse compatibility metadata; `type` is the canonical data type. */
export type VanePortKind = 'number' | 'string' | 'color'

export type VanePortDefault<Value extends VanePortInput>
  = Value extends number ? number : string

export type VanePortSetValue<Type extends VaneCssDataType>
  = (Type extends 'number' | 'integer' ? number : string)
    | VaneValue<Type>
    | VanePortTokenReference<Type>
    | VanePortLegacyReference

export interface VanePortValidation<Input = unknown, Output = Input> {
  /** Stable app-plane lookup key. */
  readonly id: string
  readonly schema?: VaneStandardSchemaV1<Input, Output>
  /** `dev` by default; `false` is type-only, `always` includes production. */
  readonly runtime?: VaneRuntimeValidationMode
  /** Invalid input never becomes a declaration. */
  readonly onInvalid?: VaneInvalidRuntimeValuePolicy
  /** Required for `onInvalid: 'fallback'`. */
  readonly fallback?: Output
}

export interface VanePortOptions<Input = unknown, Output = Input> {
  readonly label?: string
  readonly validate?: VanePortValidation<Input, Output>
}

export interface VanePortDefinition<
  Value extends VanePortInput = VanePortInput,
  Output = Value,
> extends VanePortOptions<Value, Output> {
  readonly val: Value
}

export interface VanePortBindingOptions {
  readonly validators?: Readonly<Record<string, VaneStandardSchemaV1>>
  readonly dev?: boolean
}

export interface VanePortValidationMeta {
  readonly id: string
  readonly runtime: VaneRuntimeValidationMode
  readonly onInvalid: VaneInvalidRuntimeValuePolicy
  readonly fallback?: VanePortValue
}

export interface VanePortMeta {
  readonly name: string
  readonly defaultValue: VanePortValue
  readonly type: VaneCssDataType
  /** Compatibility metadata for current manifest consumers. */
  readonly kind: VanePortKind
  readonly validation?: VanePortValidationMeta
  description?: string
  deprecated?: string
}

export interface VanePort<
  Value extends VanePortInput = VanePortInput,
  Type extends VaneCssDataType = VanePortDataTypeOf<Value>,
> {
  readonly name: `--${string}`
  readonly defaultValue: VanePortDefault<Value>
  readonly type: Type
  readonly kind: VanePortKind
  readonly var: `var(--${string}, ${string})`
  readonly meta: VanePortMeta
  set: (value: VanePortSetValue<Type>) => VanePortStyle
  /** Bind app/SSR validator implementations without global mutable state. */
  bind: (options: VanePortBindingOptions) => VanePort<Value, Type>
  describe: (text: string) => VanePort<Value, Type>
  deprecated: (reason: string) => VanePort<Value, Type>
  toString: () => `var(--${string}, ${string})`
}

export interface VanePortFactory {
  <const Value extends VanePortInput>(
    defaultValue: Value,
    options?: VanePortOptions<Value>,
  ): VanePort<VanePortWiden<Value>, VanePortDataTypeOf<Value>>
  <const Value extends VanePortInput, Output = Value>(
    definition: VanePortDefinition<Value, Output>,
  ): VanePort<VanePortWiden<Value>, VanePortDataTypeOf<Value>>
}

/** Literal widening for the default carrier; the data type remains exact. */
export type VanePortWiden<T> = T extends number ? number : T extends string ? string : T
