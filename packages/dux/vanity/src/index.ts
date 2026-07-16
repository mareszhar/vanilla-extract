// Exports are ordered by source module. Each heading names the public domain;
// the order itself stays alphabetical so lint makes accidental drift visible.

// ─── Atoms: the strict utility lane ─────────────────────────────────────────

export { unsafe } from './atoms/handle'

export type {
  VanityAtomInput,
  VanityAtomKey,
  VanityAtoms,
  VanityAtomsFactory,
  VanityAtomsOptions,
  VanityAtomsProps,
  VanityAtomValue,
  VanityAtomValues,
  VanityUnsafeValue,
} from './atoms/types'

// ─── CSS authoring: the style-rule types ─────────────────────────────────────

export type {
  VanityAtRules,
  VanityCssFunction,
  VanityCssPropertyName,
  VanityCustomProperties,
  VanityDeclarations,
  VanityFontFaceFunction,
  VanityFontFaceRule,
  VanityGlobalCssFunction,
  VanityKeyframesFunction,
  VanityKeyframesRule,
  VanityKeyframeStep,
  VanityKeyframeTime,
  VanityNestedRule,
  VanityPropertyArms,
  VanityRawValue,
  VanityRuleEntry,
  VanitySelectorRules,
  VanityStyleRule,
  VanityStyleValue,
  VanityVarReference,
} from './css/types'

// ─── Diagnostics: the error contract every domain shares ────────────────────

export { didYouMean, VanityError } from './diagnostics'
export type { VanityDiagnostic, VanityDiagnosticCode } from './diagnostics'

// ─── Engine: the canonical authoring environment ─────────────────────────────

export { createEngine, defineEnginePlugin } from './engine/createEngine'
export type {
  VanityCoreEngine,
  VanityEngine,
  VanityEngineMethods,
  VanityEngineOptions,
  VanityEnginePlugin,
  VanityEngineTokenPolicy,
  VanitySemanticPolicy,
} from './engine/createEngine'
export {
  VANITY_BUILTIN_CONSTRUCTOR_NAMES,
  VANITY_SYSTEM_MEMBERS,
  VANITY_SYSTEM_SURFACE_VERSION,
} from './engine/reservations'
export type { VanityBuiltinConstructorName, VanitySystemMember } from './engine/reservations'
export type { VanityAuditConfig, VanityAuditKind, VanityAuditLevel } from './internal/inspect'
export type { VanityDtcgCodec, VanityJsonValue } from './internal/interchange'
export { exportDesignTokens, importDesignTokens, VANITY_DTCG_EXTENSION, VANITY_DTCG_EXTENSION_VERSION } from './introspect/dtcg'

// ─── Introspection and design-token interchange ─────────────────────────────

export type {
  VanityDtcgAuthoredExtension,
  VanityDtcgAuthoredToken,
  VanityDtcgDocument,
  VanityDtcgEncodedValue,
  VanityDtcgExportMode,
  VanityDtcgExportOptions,
  VanityDtcgImportOptions,
} from './introspect/dtcg'
export type { VanityTokenExplanation } from './introspect/explain'
export { propertyAliases } from './plugins/propertyAliases'

export type {
  VanityPropertyAliasConfig,
  VanityPropertyAliasExposure,
  VanityPropertyAliasOptions,
} from './plugins/propertyAliases'

// ─── Ports: the typed runtime boundary ───────────────────────────────────────

export { ports } from './ports/ports'
export type {
  VanityPort,
  VanityPortBindingOptions,
  VanityPortDataTypeOf,
  VanityPortDefault,
  VanityPortDefinition,
  VanityPortFactory,
  VanityPortInput,
  VanityPortKind,
  VanityPortMeta,
  VanityPortOptions,
  VanityPortSetValue,
  VanityPortStyle,
  VanityPortTokenReference,
  VanityPortValidation,
  VanityPortValidationMeta,
  VanityPortValue,
  VanityPortWiden,
} from './ports/types'

// ─── Recipes: variants, toggles, anatomy, published ports ────────────────────

export { fromTokenGroup } from './recipes/fromTokenGroup'
export type { VanityTokenGroup } from './recipes/fromTokenGroup'

export type {
  VanityAnatomy,
  VanityAnatomyArms,
  VanityAnatomyCompoundEntry,
  VanityAnatomyFactory,
  VanityAnatomyOptions,
  VanityAnatomyRule,
  VanityCompoundEntry,
  VanityProps,
  VanityRecipe,
  VanityRecipeArm,
  VanityRecipeFactory,
  VanityRecipeOptions,
  VanityRecipeProps,
  VanityRecipeSelection,
} from './recipes/types'

// ─── The system: createSystem, conditions, layers ────────────────────────────

export type {
  VanityAbsoluteAxisConditionOptions,
  VanityAxisAuthoringHelpers,
  VanityAxisConditionOptions,
  VanityAxisConfig,
  VanityAxisDefinition,
  VanityAxisDefinitions,
  VanityAxisLocality,
  VanityAxisMechanism,
  VanityAxisModeInput,
  VanityAxisName,
  VanityAxisRegistry,
  VanityAxisRegistryDescription,
  VanityAxisTrigger,
  VanityAxisTriggerArm,
  VanityDefaultAxisMode,
  VanityNativeSchemePolicy,
  VanitySchemeAxisOptions,
} from './system/axes'
export type { VanityBaseConditionName, VanityCondition, VanityConditionArm, VanityConditionInput } from './system/conditions'

export { VANITY_DEFAULT_LAYERS } from './system/createSystem'

export type {
  VanityBoundSystem,
  VanityDefaultLayers,
  VanityEngineSystemOptions,
  VanitySystem,
  VanitySystemConditionName,
  VanitySystemOptions,
  VanitySystemTokens,
} from './system/createSystem'

export type {
  VanityBoundRuntime,
  VanityCustomPropertyEntries,
  VanityCustomPropertyReference,
  VanityCustomPropertyTarget,
  VanityRuntimeBaseOverrides,
  VanityRuntimeDiagnostic,
  VanityRuntimeDiagnosticCode,
  VanityRuntimeFactory,
  VanityRuntimeInput,
  VanityRuntimeInspection,
  VanityRuntimeOptions,
  VanityRuntimeReconciliation,
  VanityRuntimeRootProps,
  VanityRuntimeSnapshotOverride,
  VanityRuntimeSnapshotV1,
  VanityRuntimeStyleDeclaration,
  VanityRuntimeTarget,
  VanityRuntimeTokens,
} from './system/live'

// ─── Tokens: graph, liveness, axes, checks, and overrides ────────────────────

export type {
  VanityChannelOperation,
  VanityColorChannel,
  VanityColorMixItem,
  VanityColorMixOptions,
  VanityColorMixPercentage,
  VanityCssColorSpace,
  VanityHueChannel,
  VanityLegibleOptions,
  VanityNumericColorChannel,
  VanityOklchChannels,
  VanityOklchFunction,
  VanityPredefinedColorSpace,
} from './tokens/color'
export type { VanityLinearScaleOptions, VanityModularScaleOptions, VanityScale } from './tokens/scale'
export type {
  VanityAuthoredColor,
  VanityAuthoredInterpolatedColor,
  VanityCanonicalTokens,
  VanityCheck,
  VanityColor,
  VanityColorInterpolationSpace,
  VanityColorish,
  VanityColorMode,
  VanityColorToken,
  VanityColorTokenHandle,
  VanityConfiguredToken,
  VanityContrast,
  VanityContrastGuarantee,
  VanityContrastToken,
  VanityDefaultTokenPolicy,
  VanityDerived,
  VanityEngineRequirement,
  VanityGraphInput,
  VanityHueInterpolation,
  VanityInterpolatedColor,
  VanityInvalidRuntimeValuePolicy,
  VanityModeOf,
  VanityNamesOf,
  VanityPolarColorSpace,
  VanityResolvedTokens,
  VanityRuntimeValidationMode,
  VanityStandardSchemaIssue,
  VanityStandardSchemaV1,
  VanityTokenBranchHandle,
  VanityTokenCase,
  VanityTokenConfig,
  VanityTokenDeprecation,
  VanityTokenFactory,
  VanityTokenFallback,
  VanityTokenHandle,
  VanityTokenHandleAny,
  VanityTokenHandleOf,
  VanityTokenMetadata,
  VanityTokenMetadataValue,
  VanityTokenMode,
  VanityTokenModule,
  VanityTokenModuleOptions,
  VanityTokenOverrides,
  VanityTokenPolicy,
  VanityTokenReference,
  VanityTokenRegistration,
  VanityTokens,
  VanityTokensOptions,
  VanityTokenStage,
  VanityTokenValidation,
  VanityTypedNoDefaultTokenFactory,
  VanityValueToken,
  VanityVarsOf,
} from './tokens/types'

// ─── CSS values: canonical public contracts and types ──────────────────

export type { VanityCustomProperty, VanityCustomPropertyOptions } from './values/customProperty'
export type { VanityCanonicalCoreConstructors, VanityCoreConstructors } from './values/defaultEngine'
export type {
  VanityCssOperationDefinition,
  VanityCssValueDefinition,
  VanityCssValueRecipe,
  VanityExtensionInput,
} from './values/extensions'
export type { VanityFluidOptions, VanityInterpolationDimension } from './values/interpolate'
export type {
  VanityCalc,
  VanityDimensionOf,
  VanityMathDimension,
  VanityMathValue,
  VanityProductDimension,
  VanityQuotientDimension,
  VanitySumDimension,
} from './values/math'
export {
  createCssValueSerializer,
  defineCssSupportTarget,
  VANITY_DEFAULT_CSS_SUPPORT,
} from './values/protocol'
export type {
  VanityCssFeature,
  VanityCssSupportTarget,
  VanityExpressionKind,
  VanityExtensionIdentity,
  VanityFoldContext,
  VanityFoldRefusal,
  VanityFoldResult,
  VanityReference,
  VanitySerializeContext,
  VanitySource,
} from './values/protocol'
export type { VanityRawValueConstructors } from './values/raw'
export type {
  VanityCssDataType,
  VanityCssInput,
  VanityCssReference,
  VanityCssValue,
  VanityDataTypeOf,
  VanityResolution,
  VanitySelfValue,
  VanitySystemValue,
  VanityTokenInput,
  VanityValue,
} from './values/types'
export type {
  VanityAngleConstructor,
  VanityAngleUnit,
  VanityFlexConstructor,
  VanityFlexUnit,
  VanityFrequencyConstructor,
  VanityFrequencyUnit,
  VanityLengthConstructor,
  VanityLengthUnit,
  VanityResolutionConstructor,
  VanityResolutionUnit,
  VanityTimeConstructor,
  VanityTimeUnit,
  VanityUnitValue,
} from './values/units'
