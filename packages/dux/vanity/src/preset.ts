/**
 * The opinionated layer — deletable by design ([vanity-spec-preset.md]). The
 * preset's law: opinions live where they're deletable. Everything here
 * consumes only the public core surface — replace any piece (or all of it)
 * with your own, and the core never knows the difference.
 */

// Conveniences: the default atoms map, accessibility, motion, and patterns.
export { focusRing, minTarget, visuallyHidden } from './preset/a11y'
export type { VanityFocusRingOptions } from './preset/a11y'
export { presetAtoms } from './preset/atoms'
// Foundations: the quickstart's tokens and conditions.
export { presetConditions } from './preset/conditions'

export type { VanityPresetConditionEngine, VanityPresetConditionName } from './preset/conditions'
export { animate, fade, scaleIn, slideUp, transition } from './preset/motion'
export { definePatterns } from './preset/patterns'
export type { VanityPatterns, VanityPatternsConfig } from './preset/patterns'
export { bemPlugin, elevationPlugin } from './preset/plugins'
export type {
  VanityBemOptions,
  VanityBemPluginApi,
  VanityElevationCurve,
  VanityElevationPluginApi,
  VanityElevationPluginOptions,
} from './preset/plugins'
export { presetTokens } from './preset/tokens'
export type {
  VanityPresetBrandInput,
  VanityPresetContrast,
  VanityPresetDensity,
  VanityPresetElevationOptions,
  VanityPresetRadius,
  VanityPresetTokensOptions,
} from './preset/tokens'
export { circle, square, truncate } from './preset/utilities'
