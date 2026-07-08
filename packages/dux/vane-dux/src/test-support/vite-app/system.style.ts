/** The fixture system for the vite-plugin build test — one file, one call. */

import { createSystem } from '@mszr/vane-dux'

export const { css, port, t } = createSystem({
  tokens: {
    color: { brand: '#635bff', surface: '#f4f4f6' },
    space: { sm: '8px' },
  },
})
