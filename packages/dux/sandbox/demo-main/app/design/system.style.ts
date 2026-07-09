// The Prism system — conditions and layers bound to the token graph
// ([dux-spec-css.md §1]). Preset conditions add breakpoints, container sizes,
// and headless states; `cardWide` shows a custom container condition beside them.
import { container, createSystem } from '@mszr/vane-dux'
import { presetConditions } from '@mszr/vane-dux/preset'
import { t } from './tokens.style'

export const { css, recipe, anatomy, keyframes, globalCss, port, theme } = createSystem({
  tokens: t,
  prefix: 'prism',
  conditions: {
    ...presetConditions(),
    cardWide: container('card', '(min-width: 26rem)'),
  },
})

export { t }
