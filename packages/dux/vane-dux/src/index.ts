// Exports are ordered by source module. Each heading names the public domain;
// the order itself stays alphabetical so lint makes accidental drift visible.

// ─── Atoms: the strict utility lane (phase 7) ────────────────────────────────

export { unsafe } from './atoms/handle'

export type {
  VaneAtomInput,
  VaneAtomKey,
  VaneAtoms,
  VaneAtomsFactory,
  VaneAtomsOptions,
  VaneAtomsProps,
  VaneAtomValue,
  VaneAtomValues,
  VaneUnsafeValue,
} from './atoms/types'

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

// ─── Diagnostics: the error contract every domain shares ────────────────────

export { didYouMean, VaneError } from './diagnostics'
export type { VaneDiagnostic, VaneDiagnosticCode } from './diagnostics'

// ─── Introspection: the audit config the system carries (phase 8) ────────────

export type { VaneAuditConfig, VaneAuditKind, VaneAuditLevel } from './internal/inspect'

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

// ─── Recipes: variants, toggles, anatomy, published ports (phase 4) ──────────

export type {
  VaneAnatomy,
  VaneAnatomyArms,
  VaneAnatomyCompoundEntry,
  VaneAnatomyFactory,
  VaneAnatomyOptions,
  VaneAnatomyRule,
  VaneCompoundEntry,
  VaneProps,
  VaneRecipe,
  VaneRecipeArm,
  VaneRecipeFactory,
  VaneRecipeOptions,
  VaneRecipeProps,
  VaneRecipeSelection,
} from './recipes/types'

// ─── The system: createSystem, conditions, layers (phase 2) ──────────────────

export { aria, container, data, media, schemeIs, supports } from './system/conditions'
export type { VaneBaseConditionName, VaneCondition, VaneConditionArm, VaneConditionInput } from './system/conditions'

export { createSystem, VANE_DEFAULT_LAYERS } from './system/createSystem'

export type {
  VaneDefaultLayers,
  VaneSystem,
  VaneSystemConditionName,
  VaneSystemOptions,
  VaneSystemTokens,
} from './system/createSystem'

// ─── Tokens: the graph, liveness, schemes, checks, themes (phase 1) ──────────

export { check } from './tokens/checks'
export {
  alpha,
  channel,
  color,
  darken,
  desaturate,
  displayP3,
  hsl,
  lab,
  lch,
  legibleOn,
  lighten,
  mix,
  oklab,
  oklch,
  rgb,
  rotate,
  saturate,
  scheme,
} from './tokens/color'
export type { VaneChannelOperation, VaneLegibleOptions, VaneOklchChannels, VaneOklchFunction } from './tokens/color'
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
  VaneDerived,
  VaneGraphInput,
  VaneLiveOverrides,
  VaneModeOf,
  VaneResolvedTokens,
  VaneThemeOverrides,
  VaneTokenBuilder,
  VaneTokenMode,
  VaneTokens,
  VaneTokensOptions,
  VaneTokenStage,
  VaneValueToken,
} from './tokens/types'

// ─── CSS values: config-agnostic math and layout composition ─────────────────

export { grid } from './values/grid'
export { calc, clamp, max, min } from './values/math'
export type { VaneCalc, VaneDimensionOf, VaneMathDimension, VaneMathValue } from './values/math'
export type { VaneCssInput, VaneCssReference, VaneCssValue } from './values/types'
