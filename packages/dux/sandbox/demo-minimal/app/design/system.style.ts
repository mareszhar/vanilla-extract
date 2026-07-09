// design/system.style.ts — your whole design system, one call
import { createSystem } from '@mszr/vane-dux'
import { presetConditions, presetTokens } from '@mszr/vane-dux/preset'

export const { t, css, recipe, anatomy, port, theme } = createSystem({
  tokens: presetTokens({ brand: '#635bff' }),
  conditions: presetConditions(), // adds breakpoints, container sizes, headless states
})
