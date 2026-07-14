/** Public value-extension contracts. Extension authors only use these types. */

import type {
  VaneCssFeature,
  VaneExtensionIdentity,
  VaneFoldContext,
  VaneFoldRefusal,
  VaneSerializeContext,
  VaneSource,
} from './protocol'
import type {
  VaneCssDataType,
  VaneCssInput,
  VaneCssValue,
  VaneValue,
} from './types'
import {
  ExpressionValue,
  inputNode,
  isNodeValue,
  nodeOf,
  pluginNode,
} from './protocol'

export type VaneExtensionInput<Type extends VaneCssDataType = VaneCssDataType>
  = Type extends 'number' | 'integer' ? number | VaneValue<Type>
    : VaneCssInput | VaneValue<Type>

export interface VaneCssValueRecipe<Type extends VaneCssDataType = VaneCssDataType> {
  /** Values whose references/resolution requirements this node carries. */
  readonly dependencies?: readonly (VaneValue | string | number)[]
  readonly requirements?: readonly VaneCssFeature[]
  readonly source?: VaneSource
  readonly fallback?: VaneValue<Type>
  serialize: (context: VaneSerializeContext) => string
  fold?: (context: VaneFoldContext) => VaneValue<Type> | { readonly preserve: VaneFoldRefusal }
}

export interface VaneCssValueDefinition<
  Type extends VaneCssDataType,
  Args extends readonly unknown[],
> {
  readonly type: Type
  /** Required only when `create` returns extension-owned opaque semantics. */
  readonly extension?: VaneExtensionIdentity
  create: (...args: Args) => VaneValue<Type> | VaneCssValueRecipe<Type>
}

/**
 * Define a value constructor without exposing the IR implementation classes.
 * Returning another vane value lowers fully to core IR and is portable;
 * returning a serializer recipe requires stable extension identity.
 */
export function defineCssValue<
  const Type extends VaneCssDataType,
  const Args extends readonly unknown[],
>(definition: VaneCssValueDefinition<Type, Args>): (...args: Args) => VaneCssValue<string, Type> {
  return (...args) => {
    const result = definition.create(...args)

    if (isNodeValue(result)) {
      const node = nodeOf(result)
      if (!compatibleType(definition.type, node.type))
        typeMismatch('value', definition.type, node.type)
      return new ExpressionValue(node as never)
    }

    if (!isRecipe(result))
      throw new TypeError('[vane] defineCssValue().create() must return a vane value or serializer recipe')

    if (!definition.extension) {
      throw new TypeError(
        '[vane] an anonymous CSS value extension cannot own opaque serialization; '
        + 'return a value lowered to core IR or provide a stable extension { id, version }',
      )
    }

    const dependencies = (result.dependencies ?? []).map(value => inputNode(value as VaneCssInput))
    const node = pluginNode({
      type: definition.type,
      extension: definition.extension,
      dependencies,
      requirements: result.requirements,
      source: result.source,
      serialize: result.serialize,
      fallback: result.fallback ? nodeOf(result.fallback) : undefined,
      fold: result.fold
        ? (context) => {
            const folded = result.fold!(context)
            return 'preserve' in folded
              ? { kind: 'preserve', reason: folded.preserve }
              : { kind: 'folded', node: nodeOf(folded) }
          }
        : undefined,
    })
    return new ExpressionValue(node)
  }
}

type OperationInputs<Types extends readonly VaneCssDataType[]> = {
  readonly [K in keyof Types]: Types[K] extends VaneCssDataType ? VaneExtensionInput<Types[K]> : never
}

export interface VaneCssOperationDefinition<
  Inputs extends readonly VaneCssDataType[],
  Output extends VaneCssDataType,
> {
  readonly inputs: Inputs
  readonly output: Output
  readonly extension: VaneExtensionIdentity
  readonly requirements?: readonly VaneCssFeature[]
  readonly source?: VaneSource
  readonly fallback?: (...inputs: OperationInputs<Inputs>) => VaneValue<Output>
  serialize: (context: VaneSerializeContext, ...inputs: OperationInputs<Inputs>) => string
  fold?: (context: VaneFoldContext, ...inputs: OperationInputs<Inputs>) => VaneValue<Output> | { readonly preserve: VaneFoldRefusal }
}

/** Define an operation whose typed inputs become dependencies automatically. */
export function defineCssOperation<
  const Inputs extends readonly VaneCssDataType[],
  const Output extends VaneCssDataType,
>(definition: VaneCssOperationDefinition<Inputs, Output>): (...inputs: OperationInputs<Inputs>) => VaneCssValue<string, Output> {
  return (...inputs) => {
    const dependencies = inputs.map((input, index) => {
      const node = inputNode(input as VaneCssInput, definition.inputs[index])
      const expected = definition.inputs[index]!
      if (!compatibleType(expected, node.type))
        typeMismatch(`operation input ${index + 1}`, expected, node.type)
      return node
    })

    return new ExpressionValue(pluginNode({
      type: definition.output,
      extension: definition.extension,
      dependencies,
      requirements: definition.requirements,
      source: definition.source,
      serialize: context => definition.serialize(context, ...inputs),
      fallback: definition.fallback ? nodeOf(definition.fallback(...inputs)) : undefined,
      fold: definition.fold
        ? (context) => {
            const folded = definition.fold!(context, ...inputs)
            return 'preserve' in folded
              ? { kind: 'preserve', reason: folded.preserve }
              : { kind: 'folded', node: nodeOf(folded) }
          }
        : undefined,
    }))
  }
}

function isRecipe(value: unknown): value is VaneCssValueRecipe {
  return typeof value === 'object' && value !== null && 'serialize' in value
    && typeof (value as VaneCssValueRecipe).serialize === 'function'
}

function compatibleType(expected: VaneCssDataType, actual: VaneCssDataType): boolean {
  if (expected === actual || expected === 'unknown' || actual === 'unknown')
    return true
  if (expected === 'number' && actual === 'integer')
    return true
  if (expected === 'number-percentage')
    return actual === 'number' || actual === 'integer' || actual === 'percentage'
  if (expected === 'length-percentage')
    return actual === 'length' || actual === 'percentage'
  return false
}

function typeMismatch(where: string, expected: VaneCssDataType, actual: VaneCssDataType): never {
  throw new TypeError(`[vane] ${where} expected <${expected}> but received <${actual}>`)
}
