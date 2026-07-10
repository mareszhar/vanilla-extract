/**
 * CSS math as immutable TypeScript expressions: no operator strings, safe
 * nesting, dimension-aware addition/subtraction, plain CSS out.
 */

import type { VaneCssInput, VaneCssValue } from './types'
import { cssText, CssValue, isCssValue } from './types'

export type VaneMathDimension
  = | 'number'
    | 'length'
    | 'percentage'
    | 'length-percentage'
    | 'angle'
    | 'time'
    | 'frequency'
    | 'resolution'
    | 'flex'
    | 'unknown'

type LengthUnit
  = | 'cap' | 'ch' | 'cm' | 'cqb' | 'cqh' | 'cqi' | 'cqmax' | 'cqmin' | 'cqw'
    | 'dvb' | 'dvh' | 'dvi' | 'dvmax' | 'dvmin' | 'dvw' | 'em' | 'ex' | 'ic'
    | 'in' | 'lh' | 'lvb' | 'lvh' | 'lvi' | 'lvmax' | 'lvmin' | 'lvw' | 'mm'
    | 'pc' | 'pt' | 'px' | 'qb' | 'qh' | 'qi' | 'qmax' | 'qmin' | 'qw' | 'rcap'
    | 'rch' | 'rem' | 'rex' | 'ric' | 'rlh' | 'svb' | 'svh' | 'svi' | 'svmax'
    | 'svmin' | 'svw' | 'vb' | 'vh' | 'vi' | 'vmax' | 'vmin' | 'vw'
type AngleUnit = 'deg' | 'grad' | 'rad' | 'turn'
type TimeUnit = 'ms' | 's'
type FrequencyUnit = 'Hz' | 'kHz'
type ResolutionUnit = 'dpcm' | 'dpi' | 'dppx' | 'x'

export type VaneDimensionOf<V>
  = V extends VaneMathValue<infer D> ? D
    : V extends { readonly value: infer Inner } ? VaneDimensionOf<Inner>
      : V extends { readonly defaultValue: infer Inner } ? VaneDimensionOf<Inner>
        : V extends number ? 'number'
          : V extends `${number}%` ? 'percentage'
            : V extends `${number}${LengthUnit}` ? 'length'
              : V extends `${number}${AngleUnit}` ? 'angle'
                : V extends `${number}${TimeUnit}` ? 'time'
                  : V extends `${number}${FrequencyUnit}` ? 'frequency'
                    : V extends `${number}${ResolutionUnit}` ? 'resolution'
                      : V extends `${number}fr` ? 'flex'
                        : 'unknown'

type SumDimension<A extends VaneMathDimension, B extends VaneMathDimension>
  = 'unknown' extends A | B ? 'unknown'
    : A extends B ? A
      : A extends 'length' | 'percentage' | 'length-percentage'
        ? B extends 'length' | 'percentage' | 'length-percentage' ? 'length-percentage' : never
        : never

type SumInput<D extends VaneMathDimension, I extends VaneCssInput>
  = I & (SumDimension<D, VaneDimensionOf<I>> extends never ? never : unknown)

type MathNode
  = | { kind: 'value', value: VaneCssInput }
    | { kind: 'binary', operator: '+' | '-' | '*' | '/', left: MathNode, right: MathNode }

export interface VaneMathValue<D extends VaneMathDimension = VaneMathDimension> extends VaneCssValue {
  readonly dimension: D
}

export interface VaneCalc<D extends VaneMathDimension = VaneMathDimension> extends VaneMathValue<D> {
  add: <const I extends VaneCssInput>(value: SumInput<D, I>) => VaneCalc<SumDimension<D, VaneDimensionOf<I>>>
  subtract: <const I extends VaneCssInput>(value: SumInput<D, I>) => VaneCalc<SumDimension<D, VaneDimensionOf<I>>>
  multiply: (factor: number) => VaneCalc<D>
  divide: (divisor: number) => VaneCalc<D>
  negate: () => VaneCalc<D>
}

class CalcValue<D extends VaneMathDimension> extends CssValue implements VaneCalc<D> {
  declare readonly dimension: D

  constructor(readonly node: MathNode, dimension: D) {
    super()
    this.dimension = dimension
  }

  get css(): string {
    return `calc(${renderNode(this.node)})`
  }

  add<const I extends VaneCssInput>(value: SumInput<D, I>): VaneCalc<SumDimension<D, VaneDimensionOf<I>>> {
    return binary(this, '+', value, sumRuntime(this.dimension, dimensionOf(value))) as never
  }

  subtract<const I extends VaneCssInput>(value: SumInput<D, I>): VaneCalc<SumDimension<D, VaneDimensionOf<I>>> {
    return binary(this, '-', value, sumRuntime(this.dimension, dimensionOf(value))) as never
  }

  multiply(factor: number): VaneCalc<D> {
    finiteFactor('multiply', factor)
    return binary(this, '*', factor, this.dimension) as VaneCalc<D>
  }

  divide(divisor: number): VaneCalc<D> {
    finiteFactor('divide', divisor)

    if (divisor === 0)
      throw new RangeError('[vane] calc().divide() cannot divide by zero')

    return binary(this, '/', divisor, this.dimension) as VaneCalc<D>
  }

  negate(): VaneCalc<D> {
    return binary(new CalcValue({ kind: 'value', value: -1 }, 'number'), '*', this, this.dimension) as VaneCalc<D>
  }
}

class FunctionValue<D extends VaneMathDimension> extends CssValue implements VaneMathValue<D> {
  constructor(readonly name: 'min' | 'max' | 'clamp', readonly values: readonly VaneCssInput[], readonly dimension: D) {
    super()
  }

  get css(): string {
    return `${this.name}(${this.values.map(cssText).join(', ')})`
  }
}

/** Start an immutable CSS calculation. Nested calculations are parenthesized automatically. */
export function calc<const I extends VaneCssInput>(value: I): VaneCalc<VaneDimensionOf<I>> {
  return new CalcValue(nodeOf(value), dimensionOf(value) as VaneDimensionOf<I>)
}

/** The smallest of two or more CSS numeric values. */
export function min<const I extends readonly [VaneCssInput, VaneCssInput, ...VaneCssInput[]]>(
  ...values: I
): VaneMathValue<VaneDimensionOf<I[number]>> {
  return new FunctionValue('min', values, dimensionOf(values[0]) as VaneDimensionOf<I[number]>)
}

/** The largest of two or more CSS numeric values. */
export function max<const I extends readonly [VaneCssInput, VaneCssInput, ...VaneCssInput[]]>(
  ...values: I
): VaneMathValue<VaneDimensionOf<I[number]>> {
  return new FunctionValue('max', values, dimensionOf(values[0]) as VaneDimensionOf<I[number]>)
}

/** Clamp a preferred CSS numeric value between a minimum and maximum. */
export function clamp<const Min extends VaneCssInput, const Preferred extends VaneCssInput, const Max extends VaneCssInput>(
  minimum: Min,
  preferred: Preferred,
  maximum: Max,
): VaneMathValue<VaneDimensionOf<Min | Preferred | Max>> {
  return new FunctionValue('clamp', [minimum, preferred, maximum], dimensionOf(preferred) as VaneDimensionOf<Min | Preferred | Max>)
}

function binary(
  left: VaneCssInput | CalcValue<any>,
  operator: '+' | '-' | '*' | '/',
  right: VaneCssInput,
  dimension: VaneMathDimension,
): CalcValue<any> {
  const leftNode = left instanceof CalcValue ? left.node : nodeOf(left)
  return new CalcValue({ kind: 'binary', operator, left: leftNode, right: nodeOf(right) }, dimension)
}

function nodeOf(value: VaneCssInput): MathNode {
  return value instanceof CalcValue ? value.node : { kind: 'value', value }
}

function renderNode(node: MathNode, parentPrecedence = 0): string {
  if (node.kind === 'value')
    return cssText(node.value)

  const precedence = node.operator === '+' || node.operator === '-' ? 1 : 2
  const left = renderNode(node.left, precedence)
  const right = renderNode(node.right, precedence + (node.operator === '-' || node.operator === '/' ? 1 : 0))
  const rendered = `${left} ${node.operator} ${right}`
  return precedence < parentPrecedence ? `(${rendered})` : rendered
}

function dimensionOf(value: VaneCssInput): VaneMathDimension {
  if (isCssValue(value) && 'dimension' in value)
    return (value as VaneMathValue).dimension

  if (typeof value === 'number')
    return 'number'

  const text = typeof value === 'string' ? value : 'var'

  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)%$/.test(text))
    return 'percentage'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:px|rem|em|vh|vw|vmin|vmax|ch|ex|lh|rlh|cm|mm|in|pt|pc|q|cap|ic|vb|vi|svh|svw|lvh|lvw|dvh|dvw|cqw|cqh|cqi|cqb|cqmin|cqmax)$/.test(text))
    return 'length'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:deg|grad|rad|turn)$/.test(text))
    return 'angle'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:ms|s)$/.test(text))
    return 'time'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)fr$/.test(text))
    return 'flex'

  return 'unknown'
}

function finiteFactor(operation: string, value: number): void {
  if (!Number.isFinite(value))
    throw new RangeError(`[vane] calc().${operation}() needs a finite number; received ${value}`)
}

function sumRuntime(a: VaneMathDimension, b: VaneMathDimension): VaneMathDimension {
  if (a === 'unknown' || b === 'unknown')
    return 'unknown'
  if (a === b)
    return a
  if (['length', 'percentage', 'length-percentage'].includes(a) && ['length', 'percentage', 'length-percentage'].includes(b))
    return 'length-percentage'

  throw new TypeError(`[vane] CSS math cannot add or subtract ${a} and ${b}`)
}
