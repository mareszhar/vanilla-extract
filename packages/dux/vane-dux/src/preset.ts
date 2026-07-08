/**
 * The opinionated layer — deletable by design ([dux-spec-preset.md]). Phase 5
 * makes these real; the shapes already compose with `createSystem` so the
 * quickstart file parses today. Base conditions (hover, motionOk, dark, …)
 * ship in the system itself; the preset adds the opinions: breakpoints,
 * container sizes, headless states.
 */

import type { VaneConditionInput } from './index'
import { data, media } from './index'

export interface VanePresetTokenOptions {
  brand?: string
}

export function presetTokens(options: VanePresetTokenOptions = {}) {
  return {
    color: {
      brand: options.brand ?? '#635bff',
    },
  } as const
}

export function presetConditions(): Record<'sm' | 'md' | 'lg' | 'xl' | 'open' | 'closed' | 'checked', VaneConditionInput> {
  return {
    sm: media('(min-width: 40rem)'),
    md: media('(min-width: 48rem)'),
    lg: media('(min-width: 64rem)'),
    xl: media('(min-width: 80rem)'),
    open: data('state', 'open'),
    closed: data('state', 'closed'),
    checked: data('state', 'checked'),
  }
}

export function atoms(): never {
  throw new Error('atoms is specified but not implemented yet; see phase 7 in docs/dux-vision.md.')
}
