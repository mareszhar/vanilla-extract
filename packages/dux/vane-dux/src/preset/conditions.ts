/**
 * Preset conditions ([dux-spec-preset.md §2]): the condition set where
 * accumulated platform knowledge lives — nobody should have to remember the
 * forced-colors media query. The interaction and preference basics (`hover`,
 * `hoverFocus`, `motionOk`, `dark`, …) are core, not preset — they're platform
 * facts, not opinions ([dux-spec-css.md §1]); this map adds the opinionated
 * names on top.
 */

import type { VaneCondition } from '@mszr/vane-dux'
import { container, data, media } from '@mszr/vane-dux'

export type VanePresetConditionName
  = | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
    | 'containerSm' | 'containerMd' | 'containerLg' | 'containerXl'
    | 'portrait' | 'landscape'
    | 'contrastMore' | 'forcedColors'
    | 'open' | 'closed' | 'checked' | 'selected' | 'highlighted' | 'invalid'

/**
 * A plain conditions map — pass it whole, spread it to extend, or destructure
 * to omit. Breakpoints and container sizes follow the ecosystem's settled
 * rem stops; the headless states are the Zag/Reka `data-state`/`data-*`
 * contract, so styling a headless library is the happy path
 * ([dux-spec-recipes.md §5]).
 */
export function presetConditions(): Record<VanePresetConditionName, VaneCondition> {
  return {
    // Breakpoints — min-width, mobile-first.
    'sm': media('(min-width: 40rem)'),
    'md': media('(min-width: 48rem)'),
    'lg': media('(min-width: 64rem)'),
    'xl': media('(min-width: 80rem)'),
    '2xl': media('(min-width: 96rem)'),

    // Container sizes — unnamed queries; declare `containerType` where you measure.
    'containerSm': container('(min-width: 24rem)'),
    'containerMd': container('(min-width: 28rem)'),
    'containerLg': container('(min-width: 32rem)'),
    'containerXl': container('(min-width: 36rem)'),

    // Orientation.
    'portrait': media('(orientation: portrait)'),
    'landscape': media('(orientation: landscape)'),

    // Preference.
    'contrastMore': media('(prefers-contrast: more)'),
    'forcedColors': media('(forced-colors: active)'),

    // Headless states — set by the library (Reka UI, Ark) or bound by hand.
    'open': data('state', 'open'),
    'closed': data('state', 'closed'),
    'checked': data('state', 'checked'),
    'selected': data('selected'),
    'highlighted': data('highlighted'),
    'invalid': data('invalid'),
  }
}
