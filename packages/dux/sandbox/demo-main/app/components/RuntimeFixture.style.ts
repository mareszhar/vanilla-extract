import { createEngine } from '@mszr/vanity'

const de = createEngine().axes(({ axis, data, defaultMode, scheme }) => ({
  scheme: scheme({ locality: 'root' }),
  density: axis({
    modes: {
      cozy: defaultMode(),
      compact: data('density', 'compact'),
    },
    default: 'cozy',
  }),
}))

const ds = de.createSystem({
  prefix: 'runtime-fixture',
  root: '[data-runtime-fixture-root]',
  tokens: {
    color: {
      accent: de.token.color({
        val: de.oklch(0.56, 0.19, 355),
        mutable: true,
        axes: { scheme: { dark: null } },
      }),
    },
    space: {
      inset: de.token.length({
        val: de.length.px(16),
        mutable: true,
        axes: { density: { compact: de.length.px(8) } },
      }),
    },
    shadow: {
      card: de.token({
        val: '0 1px 2px oklch(0 0 0 / 0.15)',
        mutable: true,
        axes: { density: { compact: '0 2px 5px oklch(0 0 0 / 0.25)' } },
        cases: [{ when: { scheme: 'dark', density: 'compact' }, val: null }],
      }),
    },
  },
})

const documentEngine = createEngine()
const documentSystem = documentEngine.createSystem({
  prefix: 'runtime-fixture-document',
  tokens: {
    color: {
      accent: documentEngine.token.color({
        val: documentEngine.oklch(0.27, 0.025, 250),
        mutable: true,
      }),
    },
  },
})

const memory = new Map<string, string>()
const seed = ds.runtime({
  style: {
    setProperty: (name, value) => memory.set(name, value),
    removeProperty: (name) => {
      const value = memory.get(name) ?? ''
      memory.delete(name)
      return value
    },
    getPropertyValue: name => memory.get(name) ?? '',
  },
  setAttribute: () => {},
  removeAttribute: () => {},
  matches: selector => selector === '[data-runtime-fixture-root]',
})
seed.t.color.accent.$set('oklch(55% 0.19 295)')
seed.t.color.accent.$axes.scheme.dark.$set('oklch(72% 0.14 175)')
seed.setScheme('dark')

export const initialSnapshot = seed.snapshot()
export const runtime = ds.runtime
export const runtimeProps = ds.runtimeProps
export const tokens = ds.t
export const documentRuntime = documentSystem.runtime

export const runtimeFixture = ds.css({
  position: 'fixed',
  insetInlineStart: '-10000px',
  inlineSize: '32px',
  blockSize: '32px',
  overflow: 'hidden',
})

export const runtimeProbe = ds.css({
  inlineSize: '16px',
  blockSize: '16px',
  background: ds.t.color.accent,
  padding: ds.t.space.inset,
  boxShadow: ds.t.shadow.card,
})

export const runtimeDocumentProbe = documentSystem.css({
  inlineSize: '16px',
  blockSize: '16px',
  background: documentSystem.t.color.accent,
})
