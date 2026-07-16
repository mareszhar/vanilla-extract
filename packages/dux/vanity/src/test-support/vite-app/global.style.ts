/** Consecutive expression statements lock source-provenance transforms against ASI regressions. */

import { globalCss } from './system.style'

globalCss('html', { minBlockSize: '100%' })
globalCss('body', { minBlockSize: '100%' })

export const globalMarker = true
