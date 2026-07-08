// Exports are ordered by source module. Each group below is one domain:
// css types → diagnostics → ports → system → tokens.

// ─── CSS authoring: the style-rule types (phase 2) ───────────────────────────

export type {
  VaneAtRules,
  VaneCssFunction,
  VaneCssPropertyName,
  VaneCustomProperties,
  VaneDeclarations,
  VaneFontFaceFunction,
  VaneFontFaceRule,
  VaneGlobalCssFunction,
  VaneKeyframesFunction,
  VaneKeyframesRule,
  VaneKeyframeStep,
  VaneKeyframeTime,
  VaneNestedRule,
  VanePropertyArms,
  VaneRawValue,
  VaneRuleEntry,
  VaneSelectorRules,
  VaneStyleRule,
  VaneStyleValue,
  VaneVarReference,
} from './css/types'

// ─── Diagnostics: the error contract every domain shares ─────────────────────

export { didYouMean, VaneError, VaneNotImplementedError } from './diagnostics'
export type { VaneDiagnostic, VaneDiagnosticCode } from './diagnostics'

// ─── Ports: the typed runtime boundary (phase 3) ─────────────────────────────

export { ports } from './ports/ports'
export type {
  VanePort,
  VanePortDefault,
  VanePortInput,
  VanePortKind,
  VanePortMeta,
  VanePortOptions,
  VanePortSetValue,
  VanePortStyle,
  VanePortValue,
  VanePortWiden,
} from './ports/types'

// ─── The system: createSystem, conditions, layers (phase 2) ──────────────────

export { aria, container, data, media, schemeIs, supports } from './system/conditions'
export type { VaneBaseConditionName, VaneCondition, VaneConditionArm, VaneConditionInput } from './system/conditions'
export { createSystem, VANE_DEFAULT_LAYERS } from './system/createSystem'
export type {
  VaneDefaultLayers,
  VaneProps,
  VaneRecipeFunction,
  VaneSystem,
  VaneSystemConditionName,
  VaneSystemOptions,
  VaneSystemTokens,
} from './system/createSystem'

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
