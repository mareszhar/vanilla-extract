import { createEngine } from '@mszr/vane-dux'

const de = createEngine().axes(({ axis, data, defaultMode, scheme }) => ({
  density: axis({
    modes: {
      cozy: defaultMode(data('density', 'cozy')),
      compact: data('density', 'compact'),
    },
  }),
  emphasis: axis({
    modes: {
      normal: defaultMode(data('emphasis', 'normal')),
      high: data('emphasis', 'high'),
    },
  }),
  scheme: scheme(),
}))

const ds = de.createSystem({
  prefix: 'phase4',
  root: '[data-phase4-root]',
  tokens: {
    color: {
      surface: de.token.color({
        axes: { scheme: { light: 'rgb(250 250 250)', dark: 'rgb(20 20 24)' } },
        register: { syntax: '*', inherits: true },
      }),
    },
    probe: {
      $root: '& [data-phase4-group]',
      inset: de.token({
        val: de.length.px(16),
        axes: { density: { compact: de.length.px(8) } },
        register: true,
      }),
      edge: de.token({
        val: de.length.px(1),
        axes: { emphasis: { high: de.length.px(2) } },
        cases: [{
          when: { density: 'compact', emphasis: 'high' },
          val: de.length.px(5),
        }],
      }),
    },
  },
})

export const phase4Fixture = ds.css({
  position: 'fixed',
  insetInlineStart: '-10000px',
  inlineSize: '10px',
  blockSize: '10px',
  overflow: 'hidden',
})

export const phase4Probe = ds.css({
  color: ds.t.color.surface,
  padding: ds.t.probe.inset,
  borderStyle: 'solid',
  borderWidth: ds.t.probe.edge,
})

export const phase4Light = ds.css({ colorScheme: 'light' })
export const phase4Dark = ds.css({ colorScheme: 'dark' })
