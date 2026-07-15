import { de } from './engine'

function densityLength(comfortable: number, compact: number, spacious: number) {
  return de.token.length({
    val: de.length.rem(comfortable),
    axes: {
      density: {
        compact: de.length.rem(compact),
        spacious: de.length.rem(spacious),
      },
    },
  })
}

/** Metrics, type, and motion remain independently composable from the palette. */
export const foundationTokens = de.defineTokens({
  space: {
    '2xs': densityLength(0.25, 0.2, 0.35),
    'xs': densityLength(0.5, 0.375, 0.625),
    'sm': densityLength(0.75, 0.625, 1),
    'md': densityLength(1, 0.75, 1.25),
    'lg': densityLength(1.5, 1.125, 2),
    'xl': densityLength(2, 1.5, 3),
    '2xl': densityLength(3, 2, 4),
  },
  radius: {
    seed: de.token.length({
      val: de.length.px(14),
      mutable: true,
      description: 'Runtime-tunable radius seed for the component scale.',
    }),
    pill: de.length.px(999),
  },
  font: {
    family: de.token({
      val: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mutable: true,
      description: 'Runtime-selected application font stack.',
    }),
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
  duration: {
    quick: de.token.time({
      val: de.time.ms(150),
      axes: { motion: { none: de.time.ms(0), springy: de.time.ms(360) } },
    }),
    deliberate: de.token.time({
      val: de.time.ms(260),
      axes: { motion: { none: de.time.ms(0), springy: de.time.ms(620) } },
    }),
  },
  ease: {
    ui: de.token({
      val: 'cubic-bezier(0.2, 0, 0, 1)',
      axes: {
        motion: {
          none: 'linear',
          springy: 'linear(0, 0.42 8%, 0.82 20%, 1.08 36%, 0.98 56%, 1.01 74%, 1)',
        },
      },
    }),
  },
  text: {
    detail: { fontSize: de.length.rem(0.72), lineHeight: 1.35, fontWeight: 650 },
    label: { fontSize: de.length.rem(0.82), lineHeight: 1.35, fontWeight: 650 },
    body: { fontSize: de.length.rem(0.94), lineHeight: 1.55, fontWeight: 430 },
    title: { fontSize: de.length.rem(1.2), lineHeight: 1.2, fontWeight: 720 },
    display: { fontSize: de.length.rem(2.8), lineHeight: 0.95, fontWeight: 760 },
  },
})
  .derive(({ radius }) => ({
    radius: {
      sm: de.calc(radius.seed).multiply(0.64),
      md: radius.seed,
      lg: de.calc(radius.seed).multiply(1.55),
    },
  }))
