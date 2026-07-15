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

// ─── Engine: the canonical authoring environment (phase 2) ──────────────────

export { createEngine, defineEnginePlugin } from './engine/createEngine'
export type {
  VaneCoreEngine,
  VaneEngine,
  VaneEngineMethods,
  VaneEngineOptions,
  VaneEnginePlugin,
  VaneEngineTokenPolicy,
  VaneSemanticPolicy,
} from './engine/createEngine'
export {
  VANE_BUILTIN_CONSTRUCTOR_NAMES,
  VANE_SYSTEM_MEMBERS,
  VANE_SYSTEM_SURFACE_VERSION,
} from './engine/reservations'
export type { VaneBuiltinConstructorName, VaneSystemMember } from './engine/reservations'
export type { VaneAuditConfig, VaneAuditKind, VaneAuditLevel } from './internal/inspect'
export { propertyAliases } from './plugins/propertyAliases'

// ─── Introspection: the audit config the system carries (phase 8) ────────────

export type {
  VanePropertyAliasConfig,
  VanePropertyAliasExposure,
  VanePropertyAliasOptions,
} from './plugins/propertyAliases'

// ─── Ports: the typed runtime boundary (phase 3) ─────────────────────────────

export { ports } from './ports/ports'
export type {
  VanePort,
  VanePortBindingOptions,
  VanePortDataTypeOf,
  VanePortDefault,
  VanePortDefinition,
  VanePortFactory,
  VanePortInput,
  VanePortKind,
  VanePortMeta,
  VanePortOptions,
  VanePortSetValue,
  VanePortStyle,
  VanePortTokenReference,
  VanePortValidation,
  VanePortValidationMeta,
  VanePortValue,
  VanePortWiden,
} from './ports/types'

// ─── Recipes: variants, toggles, anatomy, published ports (phase 4) ──────────

export { fromTokenGroup } from './recipes/fromTokenGroup'
export type { VaneTokenGroup } from './recipes/fromTokenGroup'

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

export type {
  VaneAbsoluteAxisConditionOptions,
  VaneAxisAuthoringHelpers,
  VaneAxisConditionOptions,
  VaneAxisConfig,
  VaneAxisDefinition,
  VaneAxisDefinitions,
  VaneAxisLocality,
  VaneAxisMechanism,
  VaneAxisModeInput,
  VaneAxisName,
  VaneAxisRegistry,
  VaneAxisRegistryDescription,
  VaneAxisTrigger,
  VaneAxisTriggerArm,
  VaneDefaultAxisMode,
  VaneNativeSchemePolicy,
  VaneSchemeAxisOptions,
} from './system/axes'
export { aria, container, data, media, schemeIs, supports } from './system/conditions'

export type { VaneBaseConditionName, VaneCondition, VaneConditionArm, VaneConditionInput } from './system/conditions'

export { createSystem, VANE_DEFAULT_LAYERS } from './system/createSystem'

export type {
  VaneBoundSystem,
  VaneDefaultLayers,
  VaneEngineSystemOptions,
  VaneSystem,
  VaneSystemConditionName,
  VaneSystemOptions,
  VaneSystemTokens,
} from './system/createSystem'

export type {
  VaneBoundRuntime,
  VaneCustomPropertyEntries,
  VaneCustomPropertyReference,
  VaneCustomPropertyTarget,
  VaneRuntimeBaseOverrides,
  VaneRuntimeDiagnostic,
  VaneRuntimeDiagnosticCode,
  VaneRuntimeFactory,
  VaneRuntimeInput,
  VaneRuntimeOptions,
  VaneRuntimeReconciliation,
  VaneRuntimeRootProps,
  VaneRuntimeSnapshotOverride,
  VaneRuntimeSnapshotV1,
  VaneRuntimeStyleDeclaration,
  VaneRuntimeTarget,
  VaneRuntimeTokens,
} from './system/live'

// ─── Tokens: the graph, liveness, schemes, checks, themes (phase 1) ──────────

export { check } from './tokens/checks'
export type {
  VaneChannelOperation,
  VaneColorChannel,
  VaneColorMixItem,
  VaneColorMixOptions,
  VaneColorMixPercentage,
  VaneCssColorSpace,
  VaneHueChannel,
  VaneLegibleOptions,
  VaneNumericColorChannel,
  VaneOklchChannels,
  VaneOklchFunction,
  VanePredefinedColorSpace,
} from './tokens/color'
export { defineTokens } from './tokens/graph'
export { scale } from './tokens/scale'
export type { VaneLinearScaleOptions, VaneModularScaleOptions, VaneScale } from './tokens/scale'
export { theme } from './tokens/theme'
export type {
  VaneAuthoredColor,
  VaneAuthoredInterpolatedColor,
  VaneCanonicalTokens,
  VaneCheck,
  VaneColor,
  VaneColorInterpolationSpace,
  VaneColorish,
  VaneColorMode,
  VaneColorToken,
  VaneColorTokenHandle,
  VaneConfiguredToken,
  VaneContrast,
  VaneContrastGuarantee,
  VaneContrastToken,
  VaneDefaultTokenPolicy,
  VaneDerived,
  VaneEngineRequirement,
  VaneGraphInput,
  VaneHueInterpolation,
  VaneInterpolatedColor,
  VaneInvalidRuntimeValuePolicy,
  VaneLiveOverrides,
  VaneModeOf,
  VaneNamesOf,
  VanePolarColorSpace,
  VaneResolvedTokens,
  VaneRuntimeValidationMode,
  VaneStandardSchemaIssue,
  VaneStandardSchemaV1,
  VaneThemeOverrides,
  VaneTokenBranchHandle,
  VaneTokenBuilder,
  VaneTokenCase,
  VaneTokenConfig,
  VaneTokenDeprecation,
  VaneTokenFactory,
  VaneTokenFallback,
  VaneTokenHandle,
  VaneTokenHandleAny,
  VaneTokenHandleOf,
  VaneTokenMetadata,
  VaneTokenMetadataValue,
  VaneTokenMode,
  VaneTokenModule,
  VaneTokenModuleOptions,
  VaneTokenOverrides,
  VaneTokenPolicy,
  VaneTokenReference,
  VaneTokenRegistration,
  VaneTokens,
  VaneTokensOptions,
  VaneTokenStage,
  VaneTokenValidation,
  VaneTypedNoDefaultTokenFactory,
  VaneValueToken,
  VaneVarsOf,
} from './tokens/types'

// ─── CSS values: the default internal engine's compatibility adapters ───────

export type { VaneCustomProperty, VaneCustomPropertyOptions } from './values/customProperty'
export {
  alpha,
  defaultAngle as angle,
  calc,
  defaultChannel as channel,
  clamp,
  color,
  colorMix,
  defaultCustomProperty as customProperty,
  darken,
  defaultDefineCssOperation as defineCssOperation,
  defaultDefineCssValue as defineCssValue,
  desaturate,
  displayP3,
  defaultFlex as flex,
  fluid,
  defaultFrequency as frequency,
  grid,
  hsl,
  hwb,
  defaultInteger as integer,
  interpolate,
  lab,
  lch,
  legibleOn,
  defaultLength as length,
  lighten,
  max,
  min,
  mix,
  defaultNumber as number,
  oklab,
  oklch,
  defaultPercent as percent,
  defaultRawValue as rawValue,
  defaultResolution as resolution,
  rgb,
  rotate,
  saturate,
  scheme,
  defaultTime as time,
} from './values/defaultEngine'
export type { VaneCanonicalCoreConstructors, VaneCoreConstructors } from './values/defaultEngine'
export type {
  VaneCssOperationDefinition,
  VaneCssValueDefinition,
  VaneCssValueRecipe,
  VaneExtensionInput,
} from './values/extensions'
export type { VaneFluidOptions, VaneInterpolationDimension } from './values/interpolate'
export type {
  VaneCalc,
  VaneDimensionOf,
  VaneMathDimension,
  VaneMathValue,
  VaneProductDimension,
  VaneQuotientDimension,
  VaneSumDimension,
} from './values/math'
export {
  createCssValueSerializer,
  defineCssSupportTarget,
  VANE_DEFAULT_CSS_SUPPORT,
} from './values/protocol'
export type {
  VaneCssFeature,
  VaneCssSupportTarget,
  VaneExpressionKind,
  VaneExtensionIdentity,
  VaneFoldContext,
  VaneFoldRefusal,
  VaneFoldResult,
  VaneReference,
  VaneSerializeContext,
  VaneSource,
} from './values/protocol'
export type { VaneRawValueConstructors } from './values/raw'
export type {
  VaneCssDataType,
  VaneCssInput,
  VaneCssReference,
  VaneCssValue,
  VaneDataTypeOf,
  VaneResolution,
  VaneSelfValue,
  VaneSystemValue,
  VaneTokenInput,
  VaneValue,
} from './values/types'
export type {
  VaneAngleConstructor,
  VaneAngleUnit,
  VaneFlexConstructor,
  VaneFlexUnit,
  VaneFrequencyConstructor,
  VaneFrequencyUnit,
  VaneLengthConstructor,
  VaneLengthUnit,
  VaneResolutionConstructor,
  VaneResolutionUnit,
  VaneTimeConstructor,
  VaneTimeUnit,
  VaneUnitValue,
} from './values/units'
