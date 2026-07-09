/** App code: consumes a style module's classes, ports, recipes, and atoms at runtime. */

import { button } from './button.style'
import { fill, fraction, track } from './progress.style'
import { atoms } from './system.style'

export const classes = { track, fill }
export const halfway = fraction.set(0.5)

export const ghostPill = button({ intent: 'ghost', pill: true })
export const themedPadding = button.ports.paddingX.set('24px')
export const stackedGap = atoms({ stack: true, gap: 'sm' })
export { atoms, button }
