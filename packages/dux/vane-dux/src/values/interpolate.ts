/** Typed linear interpolation and its viewport-fluid lowering. */

import type { VaneCalc, VaneDimensionOf, VaneMathDimension, VaneSumDimension } from './math'
import type { VaneCssInput } from './types'
import { calc, clamp } from './math'
import { length } from './units'

export type VaneInterpolationDimension<From extends VaneCssInput, To extends VaneCssInput>
  = VaneSumDimension<VaneDimensionOf<From>, VaneDimensionOf<To>>

/**
 * Interpolate two compatible CSS numeric values at a unitless progress value.
 * Progress is intentionally not clamped: extrapolation is a valid primitive;
 * higher-level helpers such as `fluid()` own bounds.
 */
export function interpolate<
  const From extends VaneCssInput,
  const To extends VaneCssInput,
  const Progress extends VaneCssInput,
>(
  from: From,
  to: To & (VaneInterpolationDimension<From, To> extends never ? never : unknown),
  progress: Progress & (VaneDimensionOf<Progress> extends 'number' ? unknown : never),
): VaneCalc<VaneInterpolationDimension<From, To> & VaneMathDimension> {
  if (typeof progress === 'number')
    finite(progress, 'interpolate progress')
  return calc(from).add(calc(to).subtract(from as any).multiply(progress) as any) as never
}

export interface VaneFluidOptions {
  /** Lower value in CSS pixels. */
  readonly min: number
  /** Upper value in CSS pixels. */
  readonly max: number
  /** Viewport width at which `min` is reached; defaults to 320px. */
  readonly minVw?: number
  /** Viewport width at which `max` is reached; defaults to 1280px. */
  readonly maxVw?: number
}

/** Utopia-style bounded viewport interpolation, emitted as ordinary clamp/calc CSS. */
export function fluid(options: VaneFluidOptions): ReturnType<typeof clamp> {
  const { min, max, minVw = 320, maxVw = 1280 } = options
  finite(min, 'fluid min')
  finite(max, 'fluid max')
  finite(minVw, 'fluid minVw')
  finite(maxVw, 'fluid maxVw')
  if (max < min)
    throw new RangeError(`[vane] fluid max must be greater than or equal to min; received ${min} → ${max}`)
  if (maxVw <= minVw)
    throw new RangeError(`[vane] fluid maxVw must be greater than minVw; received ${minVw} → ${maxVw}`)

  const slope = (max - min) / (maxVw - minVw)
  const intercept = min - slope * minVw
  const preferred = calc(length.px(round(intercept))).add(`${round(slope * 100)}vw`)
  return clamp(length.px(min), preferred, length.px(max))
}

function finite(value: number, role: string): void {
  if (!Number.isFinite(value))
    throw new RangeError(`[vane] ${role} must be finite; received ${value}`)
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6
}
