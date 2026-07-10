/**
 * `@prism/domain` — the Prism design decisions and demo content, as data.
 *
 * The comparison lanes ([dux-workspace.md §2]) all implement the same
 * components from this one source, so the study compares *authoring models*,
 * never accidentally-different designs. The values mirror what the vane-dux
 * lane derives from its token graph (`demo-main/app/design/tokens.style.ts`):
 * vane computes them from a seed + elevation positions; every other lane gets
 * them precomputed, because that is exactly the difference under study.
 */

/** A scheme pair, precomputed — vane derives these from one `elevation()` number. */
export interface SchemePair {
  light: string
  dark: string
}

export const color = {
  /** The brand seed. vane marks it `.live()`; other lanes hard-code it. */
  brand: 'oklch(0.58 0.2 285)',
  /** `brand.lighten(0.06)` — precomputed for the lanes without color math. */
  brandHover: 'oklch(0.64 0.2 285)',
  /** `alpha(brand, 0.12)`. */
  brandSoft: 'oklch(0.58 0.2 285 / 0.12)',
  /** `legibleOn(brand)` — the APCA pick for the seed. */
  onBrand: 'white',
  /** Elevation 0 / 0.03 / 0.08 / 0.2 / 0.62 / 0.94 at hue 285, chroma 0.008. */
  canvas: { light: 'oklch(0.99 0.008 285)', dark: 'oklch(0.13 0.008 285)' } satisfies SchemePair,
  surface: { light: 'oklch(0.9627 0.008 285)', dark: 'oklch(0.1558 0.008 285)' } satisfies SchemePair,
  surfaceRaised: { light: 'oklch(0.9172 0.008 285)', dark: 'oklch(0.1988 0.008 285)' } satisfies SchemePair,
  border: { light: 'oklch(0.808 0.008 285)', dark: 'oklch(0.302 0.008 285)' } satisfies SchemePair,
  inkMuted: { light: 'oklch(0.4258 0.008 285)', dark: 'oklch(0.6632 0.008 285)' } satisfies SchemePair,
  ink: { light: 'oklch(0.1346 0.008 285)', dark: 'oklch(0.9384 0.008 285)' } satisfies SchemePair,
}

/** One `light-dark()` expression from a pair — the modern-CSS form most lanes reach for. */
export function lightDark(pair: SchemePair): string {
  return `light-dark(${pair.light}, ${pair.dark})`
}

/** The linear space scale: unit 4, steps xs–xl. */
export const space = { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' }

export const radius = { sm: '6px', md: '10px', pill: '999px' }

export const duration = { fast: '120ms', normal: '200ms' }

export const font = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}

export const text = {
  small: { fontSize: '0.875rem', lineHeight: 1.45, fontWeight: 400 },
  body: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 400 },
  title: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 600 },
}

// ─── The component contract every lane implements ────────────────────────────

export const buttonIntents = ['brand', 'ghost'] as const
export const buttonSizes = ['sm', 'md'] as const

export type ButtonIntent = (typeof buttonIntents)[number]
export type ButtonSize = (typeof buttonSizes)[number]

export interface ButtonProps {
  intent?: ButtonIntent
  size?: ButtonSize
  pill?: boolean
}

// ─── Demo content ────────────────────────────────────────────────────────────

export const card = {
  title: 'Prism refraction',
  body: 'One card, five authoring models. Same decisions, same pixels — different everything else.',
  action: 'Refract',
}

export const progress = {
  label: 'Dispersion',
  initial: 62,
}
