/** CSS math on the shared value IR: immutable, typed, and precedence-safe. */

import type { VaneExpressionNode, VaneOperationNode } from './protocol'
import type { VaneCssDataType, VaneCssInput, VaneCssValue, VaneValue } from './types'
import {
  compositeNode,
  ExpressionValue,
  functionNode,
  inputNode,
  operationNode,
} from './protocol'

export type VaneMathDimension
  = | 'number'
    | 'none'
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
    | 'pc' | 'pt' | 'px' | 'q' | 'rcap' | 'rch' | 'rem' | 'rex' | 'ric' | 'rlh'
    | 'svb' | 'svh' | 'svi' | 'svmax' | 'svmin' | 'svw' | 'vb' | 'vh' | 'vi'
    | 'vmax' | 'vmin' | 'vw'
type AngleUnit = 'deg' | 'grad' | 'rad' | 'turn'
type TimeUnit = 'ms' | 's'
type FrequencyUnit = 'Hz' | 'kHz'
type ResolutionUnit = 'dpcm' | 'dpi' | 'dppx' | 'x'

type DimensionOfDataType<Type extends VaneCssDataType>
  = Type extends 'number' | 'integer' ? 'number'
    : Type extends VaneMathDimension ? Type
      : Type extends 'number-percentage' ? 'unknown'
        : 'unknown'

export type VaneDimensionOf<Value>
  = Value extends VaneMathValue<infer Dimension> ? Dimension
    : Value extends VaneValue<infer Type> ? DimensionOfDataType<Type>
      : Value extends { readonly value: infer Inner } ? VaneDimensionOf<Inner>
        : Value extends { readonly defaultValue: infer Inner } ? VaneDimensionOf<Inner>
          : Value extends 'none' ? 'none'
            : Value extends number ? 'number'
              : Value extends `${number}%` ? 'percentage'
                : Value extends `${number}${LengthUnit}` ? 'length'
                  : Value extends `${number}${AngleUnit}` ? 'angle'
                    : Value extends `${number}${TimeUnit}` ? 'time'
                      : Value extends `${number}${FrequencyUnit}` ? 'frequency'
                        : Value extends `${number}${ResolutionUnit}` ? 'resolution'
                          : Value extends `${number}fr` ? 'flex'
                            : 'unknown'

export type VaneSumDimension<
  A extends VaneMathDimension,
  B extends VaneMathDimension,
> = A extends 'none' ? B
  : B extends 'none' ? A
    : 'unknown' extends A | B ? 'unknown'
      : A extends B ? A
        : A extends 'length' | 'percentage' | 'length-percentage'
          ? B extends 'length' | 'percentage' | 'length-percentage' ? 'length-percentage' : never
          : never

export type VaneProductDimension<
  A extends VaneMathDimension,
  B extends VaneMathDimension,
> = 'unknown' extends A | B ? 'unknown'
  : A extends 'number' ? B
    : B extends 'number' ? A
      : 'unknown'

export type VaneQuotientDimension<
  A extends VaneMathDimension,
  B extends VaneMathDimension,
> = 'unknown' extends A | B ? 'unknown'
  : B extends 'number' ? A
    : A extends B ? 'number'
      : 'unknown'

type SumInput<Dimension extends VaneMathDimension, Input extends VaneCssInput>
  = Input & (VaneSumDimension<Dimension, VaneDimensionOf<Input>> extends never ? never : unknown)

type JoinDimensions<
  Inputs extends readonly VaneCssInput[],
  Accumulator extends VaneMathDimension | undefined = undefined,
> = Inputs extends readonly [infer Head extends VaneCssInput, ...infer Tail extends readonly VaneCssInput[]]
  ? Accumulator extends VaneMathDimension
    ? VaneSumDimension<Accumulator, VaneDimensionOf<Head>> extends infer Joined
      ? Joined extends VaneMathDimension ? JoinDimensions<Tail, Joined> : never
      : never
    : JoinDimensions<Tail, VaneDimensionOf<Head>>
  : Accumulator extends VaneMathDimension ? Accumulator : 'unknown'

type CompatibleMathInputs<Inputs extends readonly VaneCssInput[]> = JoinDimensions<Inputs> extends never ? never : Inputs

type DataTypeOfDimension<Dimension extends VaneMathDimension>
  = Dimension extends 'unknown' | 'none' ? 'unknown' : Dimension

export interface VaneMathValue<Dimension extends VaneMathDimension = VaneMathDimension>
  extends VaneCssValue<string, DataTypeOfDimension<Dimension>> {
  readonly dimension: Dimension
}

export interface VaneCalc<Dimension extends VaneMathDimension = VaneMathDimension> extends VaneMathValue<Dimension> {
  add: <const Input extends VaneCssInput>(value: SumInput<Dimension, Input>) => VaneCalc<VaneSumDimension<Dimension, VaneDimensionOf<Input>>>
  subtract: <const Input extends VaneCssInput>(value: SumInput<Dimension, Input>) => VaneCalc<VaneSumDimension<Dimension, VaneDimensionOf<Input>>>
  multiply: <const Input extends VaneCssInput>(value: Input) => VaneCalc<VaneProductDimension<Dimension, VaneDimensionOf<Input>>>
  divide: <const Input extends VaneCssInput>(value: Input) => VaneCalc<VaneQuotientDimension<Dimension, VaneDimensionOf<Input>>>
  negate: () => VaneCalc<Dimension>
}

class CalcValue<Dimension extends VaneMathDimension> extends ExpressionValue<DataTypeOfDimension<Dimension>> implements VaneCalc<Dimension> {
  constructor(
    readonly expression: VaneExpressionNode,
    readonly dimension: Dimension,
  ) {
    super(compositeNode({
      type: dataType(dimension),
      parts: ['calc(', expression, ')'],
      requirements: ['calc-basic'],
      source: { helper: 'calc' },
    }) as VaneExpressionNode<DataTypeOfDimension<Dimension>>)
  }

  add<const Input extends VaneCssInput>(value: SumInput<Dimension, Input>): VaneCalc<VaneSumDimension<Dimension, VaneDimensionOf<Input>>> {
    const other = dimensionOf(value)
    return binary(this.expression, '+', mathNode(value), sumRuntime(this.dimension, other)) as never
  }

  subtract<const Input extends VaneCssInput>(value: SumInput<Dimension, Input>): VaneCalc<VaneSumDimension<Dimension, VaneDimensionOf<Input>>> {
    const other = dimensionOf(value)
    return binary(this.expression, '-', mathNode(value), sumRuntime(this.dimension, other)) as never
  }

  multiply<const Input extends VaneCssInput>(value: Input): VaneCalc<VaneProductDimension<Dimension, VaneDimensionOf<Input>>> {
    finiteOperand('multiply', value)
    const other = dimensionOf(value)
    return binary(this.expression, '*', mathNode(value), productRuntime(this.dimension, other), typedArithmetic(this.dimension, other)) as never
  }

  divide<const Input extends VaneCssInput>(value: Input): VaneCalc<VaneQuotientDimension<Dimension, VaneDimensionOf<Input>>> {
    finiteOperand('divide', value)
    if (typeof value === 'number' && value === 0)
      throw new RangeError('[vane] calc().divide() cannot divide by zero')
    const other = dimensionOf(value)
    return binary(this.expression, '/', mathNode(value), quotientRuntime(this.dimension, other), typedArithmetic(this.dimension, other)) as never
  }

  negate(): VaneCalc<Dimension> {
    return binary(inputNode(-1, 'number'), '*', this.expression, this.dimension) as VaneCalc<Dimension>
  }
}

class FunctionValue<Dimension extends VaneMathDimension> extends ExpressionValue<DataTypeOfDimension<Dimension>> implements VaneMathValue<Dimension> {
  constructor(
    name: 'min' | 'max' | 'clamp',
    values: readonly VaneCssInput[],
    readonly dimension: Dimension,
  ) {
    super(functionNode({
      type: dataType(dimension),
      name,
      values: values.map(value => inputNode(value)),
      separator: ', ',
      requirements: ['calc-basic'],
      source: { helper: name, parents: values.map(sourceOf) },
    }) as VaneExpressionNode<DataTypeOfDimension<Dimension>>)
  }
}

/** Start an immutable CSS calculation. Nested calculations preserve precedence. */
export function calc<const Input extends VaneCssInput>(value: Input): VaneCalc<VaneDimensionOf<Input>> {
  return new CalcValue(mathNode(value), dimensionOf(value) as VaneDimensionOf<Input>)
}

/** The smallest of one or more compatible CSS numeric values. */
export function min<const Inputs extends readonly [VaneCssInput, ...VaneCssInput[]]>(
  ...values: Inputs & CompatibleMathInputs<Inputs>
): VaneMathValue<JoinDimensions<Inputs>> {
  return mathFunction('min', values) as VaneMathValue<JoinDimensions<Inputs>>
}

/** The largest of one or more compatible CSS numeric values. */
export function max<const Inputs extends readonly [VaneCssInput, ...VaneCssInput[]]>(
  ...values: Inputs & CompatibleMathInputs<Inputs>
): VaneMathValue<JoinDimensions<Inputs>> {
  return mathFunction('max', values) as VaneMathValue<JoinDimensions<Inputs>>
}

/** Clamp a preferred CSS numeric value between compatible minimum and maximum values. */
export function clamp<
  const Minimum extends VaneCssInput,
  const Preferred extends VaneCssInput,
  const Maximum extends VaneCssInput,
>(
  minimum: Minimum,
  preferred: Preferred & (JoinDimensions<[Minimum, Preferred, Maximum]> extends never ? never : unknown),
  maximum: Maximum,
): VaneMathValue<JoinDimensions<[Minimum, Preferred, Maximum]>> {
  const values = [minimum, preferred, maximum] as const
  return mathFunction('clamp', values) as VaneMathValue<JoinDimensions<[Minimum, Preferred, Maximum]>>
}

function mathFunction(name: 'min' | 'max' | 'clamp', values: readonly VaneCssInput[]): VaneMathValue {
  const dimension = commonRuntime(values)
  return new FunctionValue(name, values, dimension)
}

function binary(
  left: VaneExpressionNode,
  operator: VaneOperationNode['operator'],
  right: VaneExpressionNode,
  dimension: VaneMathDimension,
  needsTypedArithmetic = false,
): CalcValue<any> {
  const precedence = operationPrecedence(operator)
  const leftNode = parenthesizeFor(left, precedence, false, operator)
  const rightNode = parenthesizeFor(right, precedence, true, operator)
  return new CalcValue(operationNode({
    type: dataType(dimension),
    operator,
    left: leftNode,
    right: rightNode,
    requirements: needsTypedArithmetic ? ['calc-basic', 'calc-typed-arithmetic'] : ['calc-basic'],
    source: { helper: `calc.${operationName(operator)}`, parents: [left.source ?? {}, right.source ?? {}] },
  }), dimension) as CalcValue<any>
}

function mathNode(value: VaneCssInput): VaneExpressionNode {
  return value instanceof CalcValue ? value.expression : inputNode(value)
}

function parenthesizeFor(
  node: VaneExpressionNode,
  parentPrecedence: number,
  right: boolean,
  operator: VaneOperationNode['operator'],
): VaneExpressionNode {
  if (node.kind !== 'operation')
    return node
  const childPrecedence = operationPrecedence(node.operator)
  const required = childPrecedence < parentPrecedence
    || (right && childPrecedence === parentPrecedence && (operator === '-' || operator === '/'))
  return required ? { ...node, parenthesize: true } : node
}

function operationPrecedence(operator: VaneOperationNode['operator']): number {
  return operator === '+' || operator === '-' ? 1 : 2
}

function operationName(operator: VaneOperationNode['operator']): string {
  return operator === '+' ? 'add' : operator === '-' ? 'subtract' : operator === '*' ? 'multiply' : 'divide'
}

function dimensionOf(value: VaneCssInput): VaneMathDimension {
  if (typeof value === 'object' && value !== null) {
    if ('dimension' in value)
      return (value as VaneMathValue).dimension
    if ('type' in value)
      return dimensionFromType((value as VaneValue).type)
  }

  if (typeof value === 'number')
    return 'number'

  const text = typeof value === 'string' ? value : value.var
  if (text === 'none')
    return 'none'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)%$/.test(text))
    return 'percentage'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:px|rem|em|vh|vw|vmin|vmax|ch|ex|lh|rlh|cm|mm|in|pt|pc|q|cap|ic|vb|vi|svh|svw|lvh|lvw|dvh|dvw|cqw|cqh|cqi|cqb|cqmin|cqmax)$/.test(text))
    return 'length'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:deg|grad|rad|turn)$/.test(text))
    return 'angle'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:ms|s)$/.test(text))
    return 'time'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:Hz|kHz)$/.test(text))
    return 'frequency'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:dpcm|dpi|dppx|x)$/.test(text))
    return 'resolution'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)fr$/.test(text))
    return 'flex'
  return 'unknown'
}

function dimensionFromType(type: VaneCssDataType): VaneMathDimension {
  if (type === 'integer')
    return 'number'
  return ['number', 'length', 'percentage', 'length-percentage', 'angle', 'time', 'frequency', 'resolution', 'flex'].includes(type)
    ? type as VaneMathDimension
    : 'unknown'
}

function commonRuntime(values: readonly VaneCssInput[]): VaneMathDimension {
  let dimension = dimensionOf(values[0]!)
  for (const value of values.slice(1))
    dimension = sumRuntime(dimension, dimensionOf(value))
  return dimension
}

function sumRuntime(a: VaneMathDimension, b: VaneMathDimension): VaneMathDimension {
  if (a === 'none')
    return b
  if (b === 'none')
    return a
  if (a === 'unknown' || b === 'unknown')
    return 'unknown'
  if (a === b)
    return a
  if (isLengthPercentage(a) && isLengthPercentage(b))
    return 'length-percentage'
  throw new TypeError(`[vane] CSS math cannot combine ${a} and ${b} in an additive comparison`)
}

function productRuntime(a: VaneMathDimension, b: VaneMathDimension): VaneMathDimension {
  if (a === 'unknown' || b === 'unknown')
    return 'unknown'
  if (a === 'number')
    return b
  if (b === 'number')
    return a
  return 'unknown'
}

function quotientRuntime(a: VaneMathDimension, b: VaneMathDimension): VaneMathDimension {
  if (a === 'unknown' || b === 'unknown')
    return 'unknown'
  if (b === 'number')
    return a
  if (a === b)
    return 'number'
  return 'unknown'
}

function typedArithmetic(a: VaneMathDimension, b: VaneMathDimension): boolean {
  return a !== 'unknown' && b !== 'unknown' && a !== 'none' && b !== 'none' && a !== 'number' && b !== 'number'
}

function isLengthPercentage(value: VaneMathDimension): boolean {
  return value === 'length' || value === 'percentage' || value === 'length-percentage'
}

function dataType<Dimension extends VaneMathDimension>(dimension: Dimension): DataTypeOfDimension<Dimension> {
  return dimension as DataTypeOfDimension<Dimension>
}

function finiteOperand(operation: string, value: VaneCssInput): void {
  if (typeof value === 'number' && !Number.isFinite(value))
    throw new RangeError(`[vane] calc().${operation}() needs a finite number; received ${value}`)
}

function sourceOf(value: VaneCssInput) {
  try {
    return mathNode(value).source ?? {}
  }
  catch {
    return {}
  }
}
