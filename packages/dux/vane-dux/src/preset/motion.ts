/**
 * Motion opinions ([dux-spec-preset.md §5]): respecting
 * `prefers-reduced-motion` is the default posture, not a per-animation memory
 * test. `animate()`/`transition()` return `motionOk`-guarded fragments;
 * `.always()` is the explicit opt-out for motion that must run (a loading
 * spinner). Core `css()` is never rewritten — the guard is a helper opinion.
 * Durations and easing tokens (including the spring) ship in `presetTokens`.
 */

import type { VaneKeyframesRule } from '../index'

// ─── Named keyframe fragments — feed them to your system's `keyframes()` ─────

/** `const fadeIn = keyframes(fade)` */
export const fade: VaneKeyframesRule = {
  from: { opacity: 0 },
  to: { opacity: 1 },
}

export const slideUp: VaneKeyframesRule = {
  from: { opacity: 0, transform: 'translateY(12px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
}

export const scaleIn: VaneKeyframesRule = {
  from: { opacity: 0, transform: 'scale(0.96)' },
  to: { opacity: 1, transform: 'scale(1)' },
}

// ─── Guarded declaration helpers ─────────────────────────────────────────────

/**
 * A reduced-motion-guarded animation:
 * `css({ ...animate(\`${fadeIn} 200ms ease-out\`) })`.
 */
export function animate(animation: string) {
  return { motionOk: { animation } } as const
}

/** The explicit opt-out — this animation carries meaning, not decoration. */
animate.always = function always(animation: string) {
  return { animation } as const
}

/**
 * A reduced-motion-guarded transition:
 * `css({ ...transition('background 120ms ease') })`.
 */
export function transition(value: string) {
  return { motionOk: { transition: value } } as const
}

/** The explicit opt-out — this transition must run regardless of preference. */
transition.always = function always(value: string) {
  return { transition: value } as const
}
