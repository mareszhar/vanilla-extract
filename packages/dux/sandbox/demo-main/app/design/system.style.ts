import { presetConditions } from '@mszr/vane-dux/preset'
import { de } from './engine'
import { foundationTokens } from './foundations.tokens'
import { effectTokens, paletteTokens } from './palette.tokens'

const tokens = de
  .defineTokens()
  .compose(paletteTokens)
  .compose(effectTokens)
  .compose(foundationTokens)

/** The one finalized Prism system; style modules need only this export. */
export const ds = de.createSystem({
  prefix: 'prism',
  root: '#prism-studio',
  tokens,
  conditions: {
    ...presetConditions(),
    previewWide: de.container('application', '(min-width: 44rem)'),
    previewRoomy: de.container('application', '(min-width: 58rem)'),
    supportsBackdrop: de.supports('(backdrop-filter: blur(1px))'),
  },
  audit: {
    escapes: 'warn',
    unusedTokens: 'warn',
    ambiguousAxes: 'warn',
  },
})

export type PrismSystem = typeof ds
