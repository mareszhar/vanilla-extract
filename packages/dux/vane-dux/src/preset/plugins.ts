/** Optional conventions expressed entirely through the public engine-plugin contract. */

import type {
  VaneAuthoredColor,
  VaneCanonicalCoreConstructors,
  VaneColorish,
  VaneEngine,
  VaneEnginePlugin,
  VaneUnitValue,
} from '@mszr/vane-dux'
import { defineEnginePlugin } from '@mszr/vane-dux'

export interface VaneBemOptions {
  /** Design-system base step in CSS pixels. */
  readonly base: number
  /** Browser root-size target used to express that step in rem; defaults to 16. */
  readonly targetPx?: number
}

export interface VaneBemPluginApi {
  /** Base-scale em: scale-relative like px, browser-font-sensitive like rem. */
  readonly bem: <const Step extends number>(step: Step) => VaneUnitValue<'length', 'rem'>
}

interface VaneBemRequirements {
  readonly length: {
    readonly rem: <const Value extends number>(value: Value) => VaneUnitValue<'length', 'rem'>
  }
}

export function bemPlugin(options: VaneBemOptions): VaneEnginePlugin<VaneBemPluginApi, object> {
  finitePositive(options.base, 'bem base')
  const targetPx = options.targetPx ?? 16
  finitePositive(targetPx, 'bem targetPx')
  const fingerprint = JSON.stringify({ base: options.base, targetPx })

  return defineEnginePlugin({
    id: 'org.vane-dux.plugin.bem',
    version: 1,
    fingerprint,
    setup: (engine) => {
      const core = engine as unknown as VaneEngine<VaneBemRequirements>
      return {
        bem: step => core.length.rem(round(step * options.base / targetPx)),
      }
    },
  })
}

export interface VaneElevationCurve {
  /** Stable semantic identity used in engine compatibility. */
  readonly id: string
  readonly resolve: (position: number, scheme: 'light' | 'dark') => number
}

export interface VaneElevationPluginOptions {
  readonly tint?: number
  readonly curve?: VaneElevationCurve
}

export interface VaneElevationPluginApi {
  readonly elevation: <Base extends VaneColorish>(base: Base, position: number) => VaneAuthoredColor
}

type VaneElevationRequirements = Pick<VaneCanonicalCoreConstructors, 'mix' | 'oklch' | 'scheme'>

const DEFAULT_ELEVATION_CURVE: VaneElevationCurve = Object.freeze({
  id: 'vane-default-linear-v1',
  resolve: (position: number, scheme: 'light' | 'dark') => scheme === 'light' ? 0.99 - 0.91 * position : 0.13 + 0.86 * position,
})

export function elevationPlugin(options: VaneElevationPluginOptions = {}): VaneEnginePlugin<VaneElevationPluginApi, object> {
  const tint = options.tint ?? 0.04
  factor(tint, 'elevation tint')
  const curve = options.curve ?? DEFAULT_ELEVATION_CURVE
  if (curve.id.trim().length === 0)
    throw new TypeError('[vane] an elevation curve needs a stable non-empty id')

  return defineEnginePlugin({
    id: 'org.vane-dux.plugin.elevation',
    version: 1,
    fingerprint: JSON.stringify({ tint, curve: curve.id }),
    setup: (engine) => {
      const core = engine as unknown as VaneEngine<VaneElevationRequirements>
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
    throw new RangeError(`[vane] ${role} must be finite and greater than zero; received ${value}`)
}

function factor(value: number, role: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new RangeError(`[vane] ${role} must be between zero and one; received ${value}`)
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6
}
