/**
 * The type plane for the preset conveniences: the default atoms map keeps
 * every token key typed, motion fragments spread into rules cleanly, and
 * pattern gaps are typed by the space scale.
 */

import { createSystem } from '@mszr/vane-dux'
import { animate, definePatterns, presetAtoms, presetConditions, presetTokens, transition } from '@mszr/vane-dux/preset'
import { describe, it } from 'vitest'

// The type plane never executes — these calls are shapes, not effects.
const { css, defineAtoms, t } = createSystem({
  tokens: presetTokens(),
  conditions: presetConditions(),
})

const atoms = defineAtoms(presetAtoms(t))

describe('presetAtoms', () => {
  it('token keys stay typed through the default map', () => {
    void atoms({ p: 'md', bg: 'brand', rounded: 'pill', z: 'modal', stack: true })
    void atoms({ gap: { base: 'sm', lg: 'xl' } })
    // @ts-expect-error — not a space key
    void atoms({ p: 'huge' })
    // @ts-expect-error — not a color key
    void atoms({ bg: 'bran' })
    // @ts-expect-error — headless states are not in the responsive lane
    void atoms({ gap: { open: 'sm' } })
  })
})

describe('motion fragments', () => {
  it('spread into rules under the guard, or unguarded via .always()', () => {
    void css({ ...animate('x 1s ease') })
    void css({ ...transition('background 120ms ease') })
    void css({ ...animate.always('spin 1s linear infinite') })
    void css({ ...transition.always('opacity 1s') })
  })
})

describe('patterns', () => {
  it('gaps are typed by the space scale', () => {
    const { stack } = definePatterns({ css, t })

    void stack({ gap: 'md', align: 'start' })
    // @ts-expect-error — not a space key
    void stack({ gap: 'huge' })
    // @ts-expect-error — not an alignment
    void stack({ align: 'middle' })
  })
})
