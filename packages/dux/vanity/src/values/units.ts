/** CSS units are constructors of data types, not data types themselves. */

import type { VanityCssDataType, VanityCssValue } from './types'
import { defineCssValue } from './extensions'
import { ExpressionValue, literalNode } from './protocol'

export type VanityLengthUnit
  = | 'cap' | 'ch' | 'cm' | 'cqb' | 'cqh' | 'cqi' | 'cqmax' | 'cqmin' | 'cqw'
    | 'dvb' | 'dvh' | 'dvi' | 'dvmax' | 'dvmin' | 'dvw' | 'em' | 'ex' | 'ic'
    | 'in' | 'lh' | 'lvb' | 'lvh' | 'lvi' | 'lvmax' | 'lvmin' | 'lvw' | 'mm'
    | 'pc' | 'pt' | 'px' | 'q' | 'rcap' | 'rch' | 'rem' | 'rex' | 'ric' | 'rlh'
    | 'svb' | 'svh' | 'svi' | 'svmax' | 'svmin' | 'svw' | 'vb' | 'vh' | 'vi'
    | 'vmax' | 'vmin' | 'vw'
export type VanityAngleUnit = 'deg' | 'grad' | 'rad' | 'turn'
export type VanityTimeUnit = 'ms' | 's'
export type VanityFrequencyUnit = 'Hz' | 'kHz'
export type VanityResolutionUnit = 'dpcm' | 'dpi' | 'dppx' | 'x'
export type VanityFlexUnit = 'fr'

export type VanityUnitValue<
  Type extends VanityCssDataType,
  Unit extends string,
  Value extends number = number,
> = VanityCssValue<`${Value}${Unit}`, Type>

type UnitMethods<Type extends VanityCssDataType, Unit extends string> = {
  readonly [K in Unit]: <const Value extends number>(value: Value) => VanityUnitValue<Type, K, Value>
}

export type VanityLengthConstructor<DefaultUnit extends VanityLengthUnit = 'px'> = {
  <const Value extends number>(value: Value): VanityUnitValue<'length', DefaultUnit, Value>
} & UnitMethods<'length', VanityLengthUnit>

export type VanityAngleConstructor = UnitMethods<'angle', VanityAngleUnit>
export type VanityTimeConstructor = UnitMethods<'time', VanityTimeUnit>
export type VanityFrequencyConstructor = UnitMethods<'frequency', VanityFrequencyUnit>
export type VanityResolutionConstructor = UnitMethods<'resolution', VanityResolutionUnit>
export type VanityFlexConstructor = UnitMethods<'flex', VanityFlexUnit>

const lengthUnits: readonly VanityLengthUnit[] = [
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

function unitFactory<Type extends VanityCssDataType, Unit extends string>(type: Type, unit: Unit) {
  // This simple built-in intentionally dogfoods the public lowering contract:
  // `defineCssValue` sees only another public value, so no opaque identity is
  // required and extension authors have the same route.
  return defineCssValue({
    type,
    create(value: number) {
      finite(value, `${type}.${unit}`)
      return new ExpressionValue(literalNode(type, `${format(value)}${unit}`, { helper: `${type}.${unit}` }))
    },
  }) as <const Value extends number>(value: Value) => VanityUnitValue<Type, Unit, Value>
}

function unitGroup<Type extends VanityCssDataType, Unit extends string>(
  type: Type,
  units: readonly Unit[],
): UnitMethods<Type, Unit> {
  return Object.freeze(Object.fromEntries(units.map(unit => [unit, unitFactory(type, unit)]))) as UnitMethods<Type, Unit>
}

const explicitLength = unitGroup('length', lengthUnits)
export function createLengthConstructor<const DefaultUnit extends VanityLengthUnit>(
  defaultUnit: DefaultUnit,
): VanityLengthConstructor<DefaultUnit> {
  const defaultLength = explicitLength[defaultUnit]

  return Object.freeze(Object.assign(
    <const Value extends number>(value: Value) => defaultLength(value),
    explicitLength,
  )) as VanityLengthConstructor<DefaultUnit>
}

export const length = createLengthConstructor('px')
export const angle: VanityAngleConstructor = unitGroup('angle', ['deg', 'grad', 'rad', 'turn'])
export const time: VanityTimeConstructor = unitGroup('time', ['ms', 's'])
export const frequency: VanityFrequencyConstructor = unitGroup('frequency', ['Hz', 'kHz'])
export const resolution: VanityResolutionConstructor = unitGroup('resolution', ['dpcm', 'dpi', 'dppx', 'x'])
export const flex: VanityFlexConstructor = unitGroup('flex', ['fr'])

export function percent<const Value extends number>(value: Value): VanityUnitValue<'percentage', '%', Value> {
  finite(value, 'percent')
  return new ExpressionValue(literalNode('percentage', `${format(value)}%`, { helper: 'percent' })) as VanityUnitValue<'percentage', '%', Value>
}

export function cssNumber<const Value extends number>(value: Value): VanityCssValue<`${Value}`, 'number'> {
  finite(value, 'number')
  return new ExpressionValue(literalNode('number', value, { helper: 'number' })) as VanityCssValue<`${Value}`, 'number'>
}

export function integer<const Value extends number>(value: Value): VanityCssValue<`${Value}`, 'integer'> {
  finite(value, 'integer')
  if (!Number.isInteger(value))
    throw new TypeError(`[vanity] integer() needs an integer; received ${value}`)
  return new ExpressionValue(literalNode('integer', value, { helper: 'integer' })) as VanityCssValue<`${Value}`, 'integer'>
}

function finite(value: number, helper: string): void {
  if (!Number.isFinite(value))
    throw new RangeError(`[vanity] ${helper}() needs a finite number; received ${value}`)
}

function format(value: number): string {
  return String(Object.is(value, -0) ? 0 : value)
}
