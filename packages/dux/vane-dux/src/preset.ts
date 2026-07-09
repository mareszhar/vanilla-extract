/**
 * The opinionated layer — deletable by design ([dux-spec-preset.md]). The
 * preset's law: opinions live where they're deletable. Everything here
 * consumes only the public core surface — replace any piece (or all of it)
 * with your own, and the core never knows the difference.
 */

// The conveniences (phase 7): the default atoms map, a11y, motion, patterns.
export { focusRing, minTarget, visuallyHidden } from './preset/a11y'
export type { VaneFocusRingOptions } from './preset/a11y'
export { presetAtoms } from './preset/atoms'
// The foundations (phase 5): the quickstart's tokens and conditions.
export { presetConditions } from './preset/conditions'

export type { VanePresetConditionName } from './preset/conditions'
export { animate, fade, scaleIn, slideUp, transition } from './preset/motion'
export { definePatterns } from './preset/patterns'
export type { VanePatterns, VanePatternsConfig } from './preset/patterns'
export { presetTokens } from './preset/tokens'
export type {
  VanePresetBrandInput,
  VanePresetContrast,
  VanePresetDensity,
  VanePresetRadius,
  VanePresetTokensOptions,
} from './preset/tokens'
