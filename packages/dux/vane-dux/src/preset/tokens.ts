/**
 * Preset tokens ([dux-spec-preset.md §1]): a serious default palette, scale,
 * and motion set, so the first component looks good in both schemes before any
 * design decision has been made. The output is a plain token subtree —
 * inspectable, spreadable, partially adoptable; later keys win, so preset
 * tokens are defaults you extend or override, with no hidden merge logic.
 *
 * The seed options are hail-styl-style controls: one knob retunes a family of
 * tokens without editing them individually.
 */

import type {
  VaneAuthoredColor,
  VaneAxisDefinitions,
  VaneCanonicalCoreConstructors,
  VaneConfiguredToken,
  VaneContrast,
  VaneCoreEngine,
  VaneDerived,
  VaneTokenModule,
  VaneTokenPolicy,
} from '@mszr/vane-dux'

// ─── The controls ────────────────────────────────────────────────────────────

export type VanePresetRadius = 'sharp' | 'calm' | 'round'
export type VanePresetDensity = 'compact' | 'comfortable' | 'spacious'
export type VanePresetContrast = 'soft' | 'balanced' | 'high'

/** A brand seed: a CSS color literal or an engine-authored color value. */
export type VanePresetBrandInput = string | VaneAuthoredColor

export interface VanePresetTokensOptions<
  B extends VanePresetBrandInput = string,
  R extends VanePresetRadius = 'calm',
> {
  /** The brand seed the color ramp derives from. `#635bff` by default. */
  brand?: B
  /** How rounded the radius family is. `calm` by default. */
  radius?: R
  /** How tight the spacing scale sits. `comfortable` by default. */
  density?: VanePresetDensity
  /** How far inks and borders rise off the surfaces. `balanced` by default. */
  contrast?: VanePresetContrast
}

export interface VanePresetElevationOptions {
  /** How strongly the base color tints the neutral plane. `0.04` by default. */
  tint?: number
  /** Position → oklch lightness per scheme. Replaces the default curve. */
  curve?: (position: number, scheme: 'light' | 'dark') => number
}

const radiusFamilies = {
  sharp: { sm: '2px', md: '4px', lg: '8px', pill: '999px' },
  calm: { sm: '4px', md: '8px', lg: '16px', pill: '999px' },
  round: { sm: '8px', md: '14px', lg: '24px', pill: '999px' },
} as const

/** The spacing unit, in px — the linear scale multiplies it per step. */
const densityUnits: Record<VanePresetDensity, number> = {
  compact: 3,
  comfortable: 4,
  spacious: 5,
}

/** Elevation plane positions ([dux-spec-tokens.md §4]) for the non-surface roles. */
const contrastPlanes: Record<VanePresetContrast, { border: number, inkMuted: number, ink: number }> = {
  soft: { border: 0.16, inkMuted: 0.56, ink: 0.88 },
  balanced: { border: 0.22, inkMuted: 0.62, ink: 0.94 },
  high: { border: 0.32, inkMuted: 0.72, ink: 1 },
}

const spaceSteps = { '2xs': 0.5, 'xs': 1, 'sm': 2, 'md': 4, 'lg': 6, 'xl': 10, '2xl': 16 } as const

// ─── The knob-free families ──────────────────────────────────────────────────
// Module-scope `as const` tables: their literal values reach hovers untouched,
// and the generic return type below stays a pure function of the controls.

const textStyles = {
  small: { fontSize: '0.875rem', lineHeight: 1.45, fontWeight: 400 },
  body: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 400 },
  label: { fontSize: '0.875rem', lineHeight: 1.3, fontWeight: 500 },
  title: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 600 },
  heading: { fontSize: '1.75rem', lineHeight: 1.2, fontWeight: 700 },
  display: { fontSize: '2.5rem', lineHeight: 1.1, fontWeight: 700 },
} as const

const fontFamilies = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const

const shadows = {
  sm: '0 1px 2px oklch(0 0 0 / 0.08)',
  md: '0 2px 8px oklch(0 0 0 / 0.1), 0 1px 2px oklch(0 0 0 / 0.08)',
  lg: '0 8px 24px oklch(0 0 0 / 0.14), 0 2px 6px oklch(0 0 0 / 0.08)',
} as const

const zLayers = {
  dropdown: 1000,
  sticky: 1100,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  toast: 1600,
  tooltip: 1700,
} as const

const durations = { instant: '50ms', fast: '120ms', normal: '200ms', slow: '320ms' } as const

const easings = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  enter: 'cubic-bezier(0.1, 0, 0, 1)',
  exit: 'cubic-bezier(0.5, 0, 1, 1)',
  spring: springLinear(),
} as const

export type VanePresetBrand<_B extends VanePresetBrandInput> = VaneAuthoredColor

/** The preset's definition graph — public because the builder carries it. */
export interface VanePresetTokenGraph<B extends VanePresetBrandInput, R extends VanePresetRadius> {
  color: {
    brand: VaneConfiguredToken<{ readonly val: VanePresetBrand<B>, readonly mutable: true }, 'color'>
    brandSoft: VaneDerived<VaneAuthoredColor>
    onBrand: VaneDerived<VaneContrast>
    canvas: VaneDerived<VaneAuthoredColor>
    surface: VaneDerived<VaneAuthoredColor>
    surfaceRaised: VaneDerived<VaneAuthoredColor>
    border: VaneDerived<VaneAuthoredColor>
    inkMuted: VaneDerived<VaneAuthoredColor>
    ink: VaneDerived<VaneAuthoredColor>
    brandHover: VaneDerived<VaneAuthoredColor>
    brandActive: VaneDerived<VaneAuthoredColor>
  }
  space: { [K in keyof typeof spaceSteps]: `${number}px` }
  text: typeof textStyles
  font: typeof fontFamilies
  radius: (typeof radiusFamilies)[R]
  shadow: typeof shadows
  z: typeof zLayers
  duration: typeof durations
  ease: typeof easings
}

// ─── presetTokens ────────────────────────────────────────────────────────────

/**
 * The furnished room: brand ramp, elevation surfaces, type, spacing, radii,
 * shadows, z order, and motion. The result is the same public topological
 * builder userland authors: pass it straight to `createSystem({ tokens: … })`,
 * extend it with another `.derive()` stage, or call `.build()` standalone.
 */
export function presetTokens<
  B extends VanePresetBrandInput = string,
  R extends VanePresetRadius = 'calm',
  Policy extends VaneTokenPolicy = VaneTokenPolicy,
  Axes extends VaneAxisDefinitions = VaneAxisDefinitions,
>(
  engine: VaneCoreEngine<any, Policy, Axes>,
  options: VanePresetTokensOptions<B, R> = {},
): VaneTokenModule<VanePresetTokenGraph<B, R>, Policy> {
  const { alpha, defineTokens, legibleOn, mix, rawValue, scale, token } = engine
  const seed = options.brand ?? '#635bff'
  const brand = (typeof seed === 'string' ? rawValue.color(seed) : seed) as VanePresetBrand<B>
  const unit = densityUnits[options.density ?? 'comfortable']
  const plane = contrastPlanes[options.contrast ?? 'balanced']

  // The preset is a real composition of independently buildable public token
  // modules. It exercises the same foundation userland receives; there is no
  // private preset merge path or privileged graph operation.
  const foundations = defineTokens({
    space: scale.linear({ unit, steps: spaceSteps }).tokens(),
    text: textStyles,
    font: fontFamilies,
    radius: radiusFamilies[(options.radius ?? 'calm') as R],
    shadow: shadows,
    z: zLayers,
    duration: durations,
    ease: easings,
  })
  const palette = defineTokens({ color: { brand: token({ val: brand, mutable: true }) } })
    .derive(({ color }) => ({
      color: {
        brandSoft: alpha(color.brand, 0.12),
        onBrand: legibleOn(color.brand),
        // The relationship is explicit: every plane composes over the brand
        // seed. A live seed therefore retints the entire system in CSS.
        canvas: elevation(engine, color.brand, 0),
        surface: elevation(engine, color.brand, 0.03),
        surfaceRaised: elevation(engine, color.brand, 0.08),
        border: elevation(engine, color.brand, plane.border),
        inkMuted: elevation(engine, color.brand, plane.inkMuted),
        ink: elevation(engine, color.brand, plane.ink),
      },
    }))
    .derive(({ color }) => ({
      color: {
        // Ink is scheme-aware, so interactions deepen toward the reader in
        // either scheme without a parallel dark palette.
        brandHover: mix(color.brand, color.ink, 0.12),
        brandActive: mix(color.brand, color.ink, 0.2),
      },
    }))
  const builder = defineTokens()
    .compose(palette)
    .compose(foundations)

  return builder as unknown as VaneTokenModule<VanePresetTokenGraph<B, R>, Policy>
}

/**
 * The hail-styl elevation opinion, built only from public core color
 * primitives. The base is explicit, so the dependency graph reads honestly:
 * `surface: ({ color }) => elevation(color.brand, 0.03)`. Replace this helper
 * with any palette logic without changing the token engine.
 */
function elevation(
  engine: Pick<VaneCanonicalCoreConstructors, 'mix' | 'oklch' | 'scheme'>,
  base: Parameters<VaneCanonicalCoreConstructors['mix']>[1],
  position: number,
  options: VanePresetElevationOptions = {},
): VaneAuthoredColor {
  const { mix, oklch, scheme } = engine
  expectFactor('position', position)
  const tint = options.tint ?? 0.04
  expectFactor('tint', tint)
  const curve = options.curve ?? defaultElevationCurve
  const neutral = scheme({
    light: oklch(curve(position, 'light'), 0, 0),
    dark: oklch(curve(position, 'dark'), 0, 0),
  })

  return mix(neutral, base, tint)
}

function defaultElevationCurve(position: number, scheme: 'light' | 'dark'): number {
  return scheme === 'light' ? 0.99 - 0.91 * position : 0.13 + 0.86 * position
}

function expectFactor(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new RangeError(`[vane] elevation ${name} must be between 0 and 1; received ${value}`)
}

/**
 * An underdamped spring (ζ 0.72, ω 9 — ~4% overshoot, settled within one
 * duration), sampled into a CSS `linear()` easing. Computed, not hardcoded,
 * so the physics stays readable and retunable.
 */
function springLinear(): string {
  const zeta = 0.72
  const omega = 9
  const damped = omega * Math.sqrt(1 - zeta ** 2)
  const stops: string[] = []

  for (let i = 0; i <= 25; i++) {
    const t = i / 25
    const decay = Math.exp(-zeta * omega * t)
    const x = 1 - decay * (Math.cos(damped * t) + (zeta * omega / damped) * Math.sin(damped * t))
    const value = roundTo(i === 25 ? 1 : x, 4)

    stops.push(i === 0 ? '0' : i === 25 ? '1' : `${value} ${roundTo(t * 100, 1)}%`)
  }

  return `linear(${stops.join(', ')})`
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
