export class VaneNotImplementedError extends Error {
  constructor(surface: string, phase: string) {
    super(`${surface} is specified but not implemented yet; see ${phase} in docs/dux-vision.md.`)
    this.name = 'VaneNotImplementedError'
  }
}

// ─── Tokens: the graph, liveness, schemes, checks, themes (phase 1) ──────────

export { check } from './tokens/checks'
export {
  alpha,
  color,
  darken,
  desaturate,
  elevation,
  legibleOn,
  lighten,
  mix,
  oklch,
  rotate,
  saturate,
  scheme,
} from './tokens/color'
export type { VaneLegibleOptions } from './tokens/color'
export { didYouMean, VaneError } from './tokens/diagnostics'
export type { VaneDiagnostic, VaneDiagnosticCode } from './tokens/diagnostics'
export { defineTokens } from './tokens/graph'
export { scale } from './tokens/scale'
export type { VaneLinearScale, VaneModularScale } from './tokens/scale'
export { theme } from './tokens/theme'
export type {
  VaneCheck,
  VaneColor,
  VaneColorish,
  VaneColorMode,
  VaneColorToken,
  VaneContrast,
  VaneContrastGuarantee,
  VaneContrastToken,
  VaneDerivation,
  VaneElevationOptions,
  VaneGraphInput,
  VaneLiveOverrides,
  VaneRefs,
  VaneThemeOverrides,
  VaneTokenMode,
  VaneTokens,
  VaneTokensOptions,
  VaneValueToken,
} from './tokens/types'

// ─── Later phases: the specified surface, pending ────────────────────────────

export interface VaneSystemOptions<
  TTokens = unknown,
  TConditions = unknown,
  TLayers extends readonly string[] = readonly string[],
> {
  tokens: TTokens
  conditions?: TConditions
  layers?: TLayers
  prefix?: string
}

export type VaneStyleClass = string
export type VaneStyleRule = Record<string, unknown>
export type VaneStyleFunction = (rule: VaneStyleRule) => VaneStyleClass
export type VaneRecipeFunction<TProps extends object = Record<string, never>> = (props?: TProps) => string
export type VaneProps<TRecipe> = TRecipe extends VaneRecipeFunction<infer TProps> ? TProps : never
export type VanePortValue = string | number
export type VanePortStyle = Record<`--${string}`, VanePortValue>

export interface VanePort<TValue extends VanePortValue = VanePortValue> {
  readonly name: string
  readonly defaultValue: TValue
  readonly variable: `var(--${string})`
  set: (value: TValue) => VanePortStyle
  toString: () => `var(--${string})`
}

export interface VaneSystem<TTokens = unknown> {
  readonly t: TTokens
  readonly css: VaneStyleFunction
  readonly recipe: <TProps extends object = Record<string, never>>(config: unknown) => VaneRecipeFunction<TProps>
  readonly anatomy: (config: unknown) => unknown
  readonly keyframes: (steps: unknown) => string
  readonly globalCss: (selector: string, rule: VaneStyleRule) => void
  readonly port: <TValue extends VanePortValue>(defaultValue: TValue) => VanePort<TValue>
  readonly theme: (overrides: unknown) => string
}

function pending<T>(surface: string, phase: string): T {
  throw new VaneNotImplementedError(surface, phase)
}

export function createSystem<
  TTokens extends object,
  TConditions = unknown,
  TLayers extends readonly string[] = readonly string[],
>(options: VaneSystemOptions<TTokens, TConditions, TLayers>): VaneSystem<TTokens> {
  void options
  return pending('createSystem', 'phase 2')
}

export function css(rule: VaneStyleRule): VaneStyleClass {
  void rule
  return pending('css', 'phase 2')
}

export function recipe<TProps extends object = Record<string, never>>(config: unknown): VaneRecipeFunction<TProps> {
  void config
  return pending('recipe', 'phase 4')
}

export function anatomy(config: unknown): unknown {
  void config
  return pending('anatomy', 'phase 4')
}

export function keyframes(steps: unknown): string {
  void steps
  return pending('keyframes', 'phase 2')
}

export function globalCss(selector: string, rule: VaneStyleRule): void {
  void selector
  void rule
  pending('globalCss', 'phase 2')
}

export function port<TValue extends VanePortValue>(defaultValue: TValue): VanePort<TValue> {
  void defaultValue
  return pending('port', 'phase 3')
}
