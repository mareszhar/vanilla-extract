// The Prism graph composes independently buildable modules. Each module is
// useful alone; this file owns only integration and final emission.
import { defineTokens } from '@mszr/vane-dux'
import { foundationTokens } from './foundations.tokens'
import { paletteTokens } from './palette.tokens'

export const t = defineTokens()
  .compose(paletteTokens)
  .compose(foundationTokens)
  .build({ prefix: 'prism' })
