import { createEngine } from '@mszr/vanity'
import { bemPlugin, elevationPlugin } from '@mszr/vanity/preset'

/**
 * Prism's authoring environment. The chain reads as the system's environmental
 * vocabulary: plugins add values, axes add mutually-exclusive circumstances,
 * and the explicit order documents which single-axis declaration wins last.
 */
export const de = createEngine()
  .use(elevationPlugin({ tint: 0.065 }))
  .use(bemPlugin({ base: 4 }))
  .axes(({ axis, data, defaultMode, scheme }) => ({
    scheme: scheme({
      locality: 'element',
      description: 'Platform preference unless the studio root pins light or dark.',
    }),
    density: axis({
      modes: {
        compact: data('density', 'compact'),
        comfortable: defaultMode(),
        spacious: data('density', 'spacious'),
      },
      default: 'comfortable',
      modeOrder: ['compact', 'comfortable', 'spacious'],
      description: 'The interface rhythm, independent of viewport size.',
    }),
    elevation: axis({
      modes: {
        flat: data('elevation', 'flat'),
        raised: defaultMode(),
        overlay: data('elevation', 'overlay'),
      },
      default: 'raised',
      modeOrder: ['flat', 'raised', 'overlay'],
      description: 'The semantic surface occupied by the application canvas.',
    }),
    motion: axis({
      modes: {
        none: data('motion', 'none'),
        subtle: defaultMode(),
        springy: data('motion', 'springy'),
      },
      default: 'subtle',
      modeOrder: ['none', 'subtle', 'springy'],
      description: 'Decorative motion profile; reduced-motion remains authoritative.',
    }),
  }))
  .axisOrder('scheme', 'density', 'elevation', 'motion')
