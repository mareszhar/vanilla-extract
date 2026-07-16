import { createEngine } from '@mszr/vanity'

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
  prefix: 'axis-fixture',
  root: '[data-axis-fixture-root]',
  tokens: {
    color: {
      surface: de.token.color({
        axes: {
          scheme: {
            light: de.oklch(0.985, 0.003, 285),
            dark: de.oklch(0.16, 0.008, 285),
          },
        },
        register: { syntax: '*', inherits: true },
      }),
    },
    probe: {
      $root: '& [data-axis-fixture-group]',
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

export const axisFixture = ds.css({
  position: 'fixed',
  insetInlineStart: '-10000px',
  inlineSize: '10px',
  blockSize: '10px',
  overflow: 'hidden',
})

export const axisProbe = ds.css({
  color: ds.t.color.surface,
  padding: ds.t.probe.inset,
  borderStyle: 'solid',
  borderWidth: ds.t.probe.edge,
})

export const axisLight = ds.css({ colorScheme: 'light' })
export const axisDark = ds.css({ colorScheme: 'dark' })
