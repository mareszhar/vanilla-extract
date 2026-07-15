import { createEngine, defineCssOperation, defineCssValue } from '@mszr/vane-dux'

const de = createEngine()
const external = de.customProperty('--external-measure', { type: 'length' })

void de.oklch(de.percent(58), 0.2, de.angle.deg(285), 0.8)
void de.calc(de.length.rem(2)).add(de.length.px(4))
void de.rawValue.length('anchor-size(width)')
void external.$var(de.length.rem(4))

void defineCssValue
void defineCssOperation
