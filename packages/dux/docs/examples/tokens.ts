import { createEngine } from '@mszr/vanity'

const de = createEngine()
  .axes(({ axis, data, defaultMode, scheme }) => ({
    scheme: scheme(),
    density: axis({
      modes: { compact: data('density', 'compact'), comfortable: defaultMode() },
      default: 'comfortable',
    }),
  }))

const module = de.defineTokens({
  color: {
    brand: de.token.color({
      val: de.oklch(0.58, 0.2, 285),
      mutable: true,
      register: { syntax: '*', inherits: true },
      axes: { scheme: { dark: null } },
      cases: [{ when: { scheme: 'dark', density: 'compact' }, val: null }],
      description: 'Mutable base plus reserved authored branches.',
    }),
  },
  size: {
    external: de.token.length(),
    folded: de.token({ val: de.length.rem(64), reference: 'val', emit: false }),
  },
})

const ds = de.createSystem({ tokens: module, prefix: 'tokens-doc' })

void ds.t.color.brand.$axes.scheme.dark.$val
void ds.t.color.brand.$case({ scheme: 'dark', density: 'compact' }).$val
void ds.tokensOf(module)
void ds.varsOf(ds.t.color)
