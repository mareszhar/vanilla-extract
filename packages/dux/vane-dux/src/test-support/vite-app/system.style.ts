/** The fixture system for the vite-plugin build test — one file, one call. */

import { createSystem } from '@mszr/vane-dux'

export const { css, defineAtoms, globalCss, port, recipe, t } = createSystem({
  tokens: {
    color: { brand: '#635bff', surface: '#f4f4f6' },
    space: { sm: '8px' },
  },
})

export const atoms = defineAtoms({
  properties: { gap: t.space },
  toggles: { stack: { display: 'flex', flexDirection: 'column' } },
})
