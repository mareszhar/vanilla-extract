// ─── Diagnostics: the error contract every domain shares ─────────────────────

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
export { didYouMean, VaneError, VaneNotImplementedError } from './diagnostics'

// ─── Tokens: the graph, liveness, schemes, checks, themes (phase 1) ──────────

export type { VaneDiagnostic, VaneDiagnosticCode } from './diagnostics'
export { ports } from './ports/ports'
export type {
  VanePort,
  VanePortInput,
  VanePortKind,
  VanePortOptions,
  VanePortSetValue,
  VanePortStyle,
  VanePortValue,
  VanePortWiden,
} from './ports/types'
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
export { check } from './tokens/checks'

// ─── The authoring core: the system and its bound functions (phase 2) ────────

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

// ─── Ports: the typed runtime boundary (phase 3) ─────────────────────────────

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
