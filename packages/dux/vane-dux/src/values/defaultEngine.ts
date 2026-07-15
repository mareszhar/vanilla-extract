/** The default configured internal engine and package-root compatibility adapters. */

import type { VaneAuthoredColor, VaneAuthoredInterpolatedColor, VaneColor, VaneInterpolatedColor } from '../tokens/types'
import type { VaneLengthConstructor, VaneLengthUnit } from './units'
import { createEngineKernel } from '../internal/engineKernel'
import {
  alpha as alphaImplementation,
  channel,
  color as colorImplementation,
  colorMix as colorMixImplementation,
  darken as darkenImplementation,
  desaturate as desaturateImplementation,
  displayP3 as displayP3Implementation,
  hsl as hslImplementation,
  hwb as hwbImplementation,
  lab as labImplementation,
  lch as lchImplementation,
  legibleOn as legibleOnImplementation,
  lighten as lightenImplementation,
  mix as mixImplementation,
  oklab as oklabImplementation,
  oklch as oklchImplementation,
  rgb as rgbImplementation,
  rotate as rotateImplementation,
  saturate as saturateImplementation,
  scheme as schemeImplementation,
} from '../tokens/color'
import { customProperty } from './customProperty'
import { defineCssOperation, defineCssValue } from './extensions'
import { grid as gridImplementation } from './grid'
import { fluid as fluidImplementation, interpolate as interpolateImplementation } from './interpolate'
import { calc as calcImplementation, clamp as clampImplementation, max as maxImplementation, min as minImplementation } from './math'
import { rawValue } from './raw'
import { angle, createLengthConstructor, cssNumber, flex, frequency, integer, percent, resolution, time } from './units'

export const VANE_CORE_EXTENSION_IDENTITIES = Object.freeze([
  { id: 'org.vane-dux.core.color', version: 1 },
  { id: 'org.vane-dux.core.color-function', version: 1 },
  { id: 'org.vane-dux.core.color-mix', version: 1 },
  { id: 'org.vane-dux.core.grid', version: 1 },
] as const)

const STATIC_CORE_CONSTRUCTORS = Object.freeze({
  alpha: alphaImplementation,
  angle,
  calc: calcImplementation,
  channel,
  clamp: clampImplementation,
  color: colorImplementation,
  colorMix: colorMixImplementation,
  customProperty,
  darken: darkenImplementation,
  desaturate: desaturateImplementation,
  displayP3: displayP3Implementation,
  flex,
  frequency,
  fluid: fluidImplementation,
  grid: gridImplementation,
  hsl: hslImplementation,
  hwb: hwbImplementation,
  integer,
  interpolate: interpolateImplementation,
  lab: labImplementation,
  lch: lchImplementation,
  legibleOn: legibleOnImplementation,
  lighten: lightenImplementation,
  max: maxImplementation,
  min: minImplementation,
  mix: mixImplementation,
  number: cssNumber,
  oklab: oklabImplementation,
  oklch: oklchImplementation,
  percent,
  rawValue,
  resolution,
  rgb: rgbImplementation,
  rotate: rotateImplementation,
  saturate: saturateImplementation,
  scheme: schemeImplementation,
  time,
} as const)

/** Compact public name for the constructor surface carried by every core engine. */
export interface VaneCoreConstructors<DefaultLengthUnit extends VaneLengthUnit = 'px'>
  extends Readonly<typeof STATIC_CORE_CONSTRUCTORS> {
  readonly length: VaneLengthConstructor<DefaultLengthUnit>
}

type VaneCanonicalResult<Result>
  = Result extends VaneInterpolatedColor<any> ? VaneAuthoredInterpolatedColor
    : Result extends VaneColor<any> ? VaneAuthoredColor
      : Result

/** Preserve callable namespaces such as `oklch.from` while erasing legacy color modes. */
type VaneCanonicalConstructor<Constructor>
  = Constructor extends (...args: infer Args) => infer Result
    ? ((...args: Args) => VaneCanonicalResult<Result>) & {
      readonly [Key in keyof Constructor]: VaneCanonicalConstructor<Constructor[Key]>
    }
    : Constructor

type VaneColorConstructorName
  = | 'alpha'
    | 'color'
    | 'colorMix'
    | 'darken'
    | 'desaturate'
    | 'displayP3'
    | 'hsl'
    | 'hwb'
    | 'lab'
    | 'lch'
    | 'lighten'
    | 'mix'
    | 'oklab'
    | 'oklch'
    | 'rgb'
    | 'rotate'
    | 'saturate'
    | 'scheme'

/** Core constructors as seen from a canonical engine/system. */
export type VaneCanonicalCoreConstructors<DefaultLengthUnit extends VaneLengthUnit = 'px'>
  = Omit<VaneCoreConstructors<DefaultLengthUnit>, VaneColorConstructorName> & {
    readonly [Key in VaneColorConstructorName]: VaneCanonicalConstructor<VaneCoreConstructors<DefaultLengthUnit>[Key]>
  }

/** Construct the core environment once per configured engine revision. */
export function createCoreConstructors<const DefaultLengthUnit extends VaneLengthUnit>(
  defaultLengthUnit: DefaultLengthUnit,
): VaneCoreConstructors<DefaultLengthUnit> {
  return Object.freeze({
    ...STATIC_CORE_CONSTRUCTORS,
    length: createLengthConstructor(defaultLengthUnit),
  })
}

export const defaultEngine = createEngineKernel(createCoreConstructors('px'), {
  extensions: VANE_CORE_EXTENSION_IDENTITIES,
})

export const {
  alpha,
  angle: defaultAngle,
  calc,
  channel: defaultChannel,
  clamp,
  color,
  colorMix,
  customProperty: defaultCustomProperty,
  darken,
  desaturate,
  displayP3,
  flex: defaultFlex,
  frequency: defaultFrequency,
  fluid,
  grid,
  hsl,
  hwb,
  integer: defaultInteger,
  interpolate,
  lab,
  lch,
  legibleOn,
  length: defaultLength,
  lighten,
  max,
  min,
  mix,
  number: defaultNumber,
  oklab,
  oklch,
  percent: defaultPercent,
  rawValue: defaultRawValue,
  resolution: defaultResolution,
  rgb,
  rotate,
  saturate,
  scheme,
  time: defaultTime,
} = defaultEngine.constructors

export const defaultDefineCssOperation = defineCssOperation
export const defaultDefineCssValue = defineCssValue
