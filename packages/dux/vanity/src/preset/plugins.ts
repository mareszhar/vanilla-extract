/** Optional conventions expressed entirely through the public engine-plugin contract. */

import type {
  VanityAuthoredColor,
  VanityCanonicalCoreConstructors,
  VanityColorish,
  VanityEngine,
  VanityEnginePlugin,
  VanityUnitValue,
} from '@mszr/vanity'
import { defineEnginePlugin } from '@mszr/vanity'

export interface VanityBemOptions {
  /** Design-system base step in CSS pixels. */
  readonly base: number
  /** Browser root-size target used to express that step in rem; defaults to 16. */
  readonly targetPx?: number
}

export interface VanityBemPluginApi {
  /** Base-scale em: scale-relative like px, browser-font-sensitive like rem. */
  readonly bem: <const Step extends number>(step: Step) => VanityUnitValue<'length', 'rem'>
}

interface VanityBemRequirements {
  readonly length: {
    readonly rem: <const Value extends number>(value: Value) => VanityUnitValue<'length', 'rem'>
  }
}

export function bemPlugin(options: VanityBemOptions): VanityEnginePlugin<VanityBemPluginApi, object> {
  finitePositive(options.base, 'bem base')
  const targetPx = options.targetPx ?? 16
  finitePositive(targetPx, 'bem targetPx')
  const fingerprint = JSON.stringify({ base: options.base, targetPx })

  return defineEnginePlugin({
    id: 'org.vanity.plugin.bem',
    version: 1,
    fingerprint,
    setup: (engine) => {
      const core = engine as unknown as VanityEngine<VanityBemRequirements>
      return {
        bem: step => core.length.rem(round(step * options.base / targetPx)),
      }
    },
  })
}

export interface VanityElevationCurve {
  /** Stable semantic identity used in engine compatibility. */
  readonly id: string
  readonly resolve: (position: number, scheme: 'light' | 'dark') => number
}

export interface VanityElevationPluginOptions {
  readonly tint?: number
  readonly curve?: VanityElevationCurve
}

export interface VanityElevationPluginApi {
  readonly elevation: <Base extends VanityColorish>(base: Base, position: number) => VanityAuthoredColor
}

type VanityElevationRequirements = Pick<VanityCanonicalCoreConstructors, 'mix' | 'oklch' | 'scheme'>

const DEFAULT_ELEVATION_CURVE: VanityElevationCurve = Object.freeze({
  id: 'vanity-default-linear-v1',
  resolve: (position: number, scheme: 'light' | 'dark') => scheme === 'light' ? 0.99 - 0.91 * position : 0.13 + 0.86 * position,
})

export function elevationPlugin(options: VanityElevationPluginOptions = {}): VanityEnginePlugin<VanityElevationPluginApi, object> {
  const tint = options.tint ?? 0.04
  factor(tint, 'elevation tint')
  const curve = options.curve ?? DEFAULT_ELEVATION_CURVE
  if (curve.id.trim().length === 0)
    throw new TypeError('[vanity] an elevation curve needs a stable non-empty id')

  return defineEnginePlugin({
    id: 'org.vanity.plugin.elevation',
    version: 1,
    fingerprint: JSON.stringify({ tint, curve: curve.id }),
    setup: (engine) => {
      const core = engine as unknown as VanityEngine<VanityElevationRequirements>
      return {
        elevation: (base, position) => {
          factor(position, 'elevation position')
          const neutral = core.scheme({
            light: core.oklch(curve.resolve(position, 'light'), 0, 0),
            dark: core.oklch(curve.resolve(position, 'dark'), 0, 0),
          })
          return core.mix(neutral, base, tint)
        },
      }
    },
  })
}

function finitePositive(value: number, role: string): void {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`[vanity] ${role} must be finite and greater than zero; received ${value}`)
}

function factor(value: number, role: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new RangeError(`[vanity] ${role} must be between zero and one; received ${value}`)
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6
}
