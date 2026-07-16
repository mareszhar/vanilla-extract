import { createEngine, propertyAliases } from '@mszr/vanity'
import { definePatterns } from '@mszr/vanity/preset'

const de = createEngine().use(propertyAliases({ py: 'paddingBlock' }, { expose: 'both' }))
const tokens = de.defineTokens({
  color: { brand: 'oklch(62% 0.2 285)' },
  space: { sm: de.length.rem(0.5), md: de.length.rem(1) },
})
const ds = de.createSystem({ tokens, prefix: 'patterns-doc' })
const patterns = definePatterns({ css: ds.css, t: ds.t })
const gap = ds.port(ds.t.space.md)
const atoms = ds.defineAtoms({ properties: { gap: ds.t.space } }, 'space-atoms')

void patterns.stack({ gap: 'md' })
void atoms({ gap: 'sm' })
void ds.css({ py: ds.t.space.sm })
void ds.recipe({
  ports: { gap },
  base: { display: 'flex', paddingBlock: ds.t.space.sm, gap },
  variants: { intent: { brand: { color: ds.t.color.brand } } },
  defaults: { intent: 'brand' },
})
