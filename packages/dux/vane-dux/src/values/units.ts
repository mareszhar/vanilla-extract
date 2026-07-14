/** CSS units are constructors of data types, not data types themselves. */

import type { VaneCssDataType, VaneCssValue } from './types'
import { defineCssValue } from './extensions'
import { ExpressionValue, literalNode } from './protocol'

export type VaneLengthUnit
  = | 'cap' | 'ch' | 'cm' | 'cqb' | 'cqh' | 'cqi' | 'cqmax' | 'cqmin' | 'cqw'
    | 'dvb' | 'dvh' | 'dvi' | 'dvmax' | 'dvmin' | 'dvw' | 'em' | 'ex' | 'ic'
    | 'in' | 'lh' | 'lvb' | 'lvh' | 'lvi' | 'lvmax' | 'lvmin' | 'lvw' | 'mm'
    | 'pc' | 'pt' | 'px' | 'q' | 'rcap' | 'rch' | 'rem' | 'rex' | 'ric' | 'rlh'
    | 'svb' | 'svh' | 'svi' | 'svmax' | 'svmin' | 'svw' | 'vb' | 'vh' | 'vi'
    | 'vmax' | 'vmin' | 'vw'
export type VaneAngleUnit = 'deg' | 'grad' | 'rad' | 'turn'
export type VaneTimeUnit = 'ms' | 's'
export type VaneFrequencyUnit = 'Hz' | 'kHz'
export type VaneResolutionUnit = 'dpcm' | 'dpi' | 'dppx' | 'x'
export type VaneFlexUnit = 'fr'

export type VaneUnitValue<
  Type extends VaneCssDataType,
  Unit extends string,
  Value extends number = number,
> = VaneCssValue<`${Value}${Unit}`, Type>

type UnitMethods<Type extends VaneCssDataType, Unit extends string> = {
  readonly [K in Unit]: <const Value extends number>(value: Value) => VaneUnitValue<Type, K, Value>
}

export type VaneLengthConstructor<DefaultUnit extends VaneLengthUnit = 'px'> = {
  <const Value extends number>(value: Value): VaneUnitValue<'length', DefaultUnit, Value>
} & UnitMethods<'length', VaneLengthUnit>

export type VaneAngleConstructor = UnitMethods<'angle', VaneAngleUnit>
export type VaneTimeConstructor = UnitMethods<'time', VaneTimeUnit>
export type VaneFrequencyConstructor = UnitMethods<'frequency', VaneFrequencyUnit>
export type VaneResolutionConstructor = UnitMethods<'resolution', VaneResolutionUnit>
export type VaneFlexConstructor = UnitMethods<'flex', VaneFlexUnit>

const lengthUnits: readonly VaneLengthUnit[] = [
  'cap',
  'ch',
  'cm',
  'cqb',
  'cqh',
  'cqi',
  'cqmax',
  'cqmin',
  'cqw',
  'dvb',
  'dvh',
  'dvi',
  'dvmax',
  'dvmin',
  'dvw',
  'em',
  'ex',
  'ic',
  'in',
  'lh',
  'lvb',
  'lvh',
  'lvi',
  'lvmax',
  'lvmin',
  'lvw',
  'mm',
  'pc',
  'pt',
  'px',
  'q',
  'rcap',
  'rch',
  'rem',
  'rex',
  'ric',
  'rlh',
  'svb',
  'svh',
  'svi',
  'svmax',
  'svmin',
  'svw',
  'vb',
  'vh',
  'vi',
  'vmax',
  'vmin',
  'vw',
]

function unitFactory<Type extends VaneCssDataType, Unit extends string>(type: Type, unit: Unit) {
  // This simple built-in intentionally dogfoods the public lowering contract:
  // `defineCssValue` sees only another public value, so no opaque identity is
  // required and extension authors have the same route.
  return defineCssValue({
    type,
    create(value: number) {
      finite(value, `${type}.${unit}`)
      return new ExpressionValue(literalNode(type, `${format(value)}${unit}`, { helper: `${type}.${unit}` }))
    },
  }) as <const Value extends number>(value: Value) => VaneUnitValue<Type, Unit, Value>
}

function unitGroup<Type extends VaneCssDataType, Unit extends string>(
  type: Type,
  units: readonly Unit[],
): UnitMethods<Type, Unit> {
  return Object.freeze(Object.fromEntries(units.map(unit => [unit, unitFactory(type, unit)]))) as UnitMethods<Type, Unit>
}

const explicitLength = unitGroup('length', lengthUnits)
export function createLengthConstructor<const DefaultUnit extends VaneLengthUnit>(
  defaultUnit: DefaultUnit,
): VaneLengthConstructor<DefaultUnit> {
  const defaultLength = explicitLength[defaultUnit]

  return Object.freeze(Object.assign(
    <const Value extends number>(value: Value) => defaultLength(value),
    explicitLength,
  )) as VaneLengthConstructor<DefaultUnit>
}

export const length = createLengthConstructor('px')
export const angle: VaneAngleConstructor = unitGroup('angle', ['deg', 'grad', 'rad', 'turn'])
export const time: VaneTimeConstructor = unitGroup('time', ['ms', 's'])
export const frequency: VaneFrequencyConstructor = unitGroup('frequency', ['Hz', 'kHz'])
export const resolution: VaneResolutionConstructor = unitGroup('resolution', ['dpcm', 'dpi', 'dppx', 'x'])
export const flex: VaneFlexConstructor = unitGroup('flex', ['fr'])

export function percent<const Value extends number>(value: Value): VaneUnitValue<'percentage', '%', Value> {
  finite(value, 'percent')
  return new ExpressionValue(literalNode('percentage', `${format(value)}%`, { helper: 'percent' })) as VaneUnitValue<'percentage', '%', Value>
}

export function cssNumber<const Value extends number>(value: Value): VaneCssValue<`${Value}`, 'number'> {
  finite(value, 'number')
  return new ExpressionValue(literalNode('number', value, { helper: 'number' })) as VaneCssValue<`${Value}`, 'number'>
}

export function integer<const Value extends number>(value: Value): VaneCssValue<`${Value}`, 'integer'> {
  finite(value, 'integer')
  if (!Number.isInteger(value))
    throw new TypeError(`[vane] integer() needs an integer; received ${value}`)
  return new ExpressionValue(literalNode('integer', value, { helper: 'integer' })) as VaneCssValue<`${Value}`, 'integer'>
}

function finite(value: number, helper: string): void {
  if (!Number.isFinite(value))
    throw new RangeError(`[vane] ${helper}() needs a finite number; received ${value}`)
}

function format(value: number): string {
  return String(Object.is(value, -0) ? 0 : value)
}
