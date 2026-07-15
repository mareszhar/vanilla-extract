import { createEngine } from '@mszr/vane-dux'

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
  prefix: 'phase5',
  root: '[data-phase5-root]',
  tokens: {
    color: {
      accent: de.token.color({
        val: 'rgb(180 50 100)',
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
        val: '0 1px 2px rgb(0 0 0 / 0.15)',
        mutable: true,
        axes: { density: { compact: '0 2px 5px rgb(0 0 0 / 0.25)' } },
        cases: [{ when: { scheme: 'dark', density: 'compact' }, val: null }],
      }),
    },
  },
})

const documentEngine = createEngine()
const documentSystem = documentEngine.createSystem({
  prefix: 'phase5-document',
  tokens: {
    color: {
      accent: documentEngine.token.color({
        val: 'rgb(30 40 50)',
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
  matches: selector => selector === '[data-phase5-root]',
})
seed.t.color.accent.$set('rgb(110 70 210)')
seed.t.color.accent.$axes.scheme.dark.$set('rgb(40 190 170)')
seed.setScheme('dark')

export const phase5InitialSnapshot = seed.snapshot()
export const phase5Runtime = ds.runtime
export const phase5RuntimeProps = ds.runtimeProps
export const phase5Tokens = ds.t
export const phase5DocumentRuntime = documentSystem.runtime

export const phase5Fixture = ds.css({
  position: 'fixed',
  insetInlineStart: '-10000px',
  inlineSize: '32px',
  blockSize: '32px',
  overflow: 'hidden',
})

export const phase5Probe = ds.css({
  inlineSize: '16px',
  blockSize: '16px',
  background: ds.t.color.accent,
  padding: ds.t.space.inset,
  boxShadow: ds.t.shadow.card,
})

export const phase5DocumentProbe = documentSystem.css({
  inlineSize: '16px',
  blockSize: '16px',
  background: documentSystem.t.color.accent,
})
