/**
 * The output plane: the emitted CSS is a public contract
 * ([dux-workspace.md §5]) — layer order, condition compilation in both
 * directions, arm intersection, scheme arms, global and raw lanes, locked.
 */

import { createSystem } from '@mszr/vane-dux'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

/** A tiny system: inline tokens, spec-shaped conditions, default layers. */
function miniSystem() {
  return createSystem({
    tokens: {
      color: { brand: '#635bff' },
      space: { sm: '8px', md: '16px' },
    },
    conditions: {
      open: '&[data-state="open"]',
      md: '@media (min-width: 768px)',
      cardWide: '@container card (min-width: 400px)',
    },
  })
}

describe('css()', () => {
  it('compiles the spec card: both nesting directions, plain selectors, at-rules', () => {
    const { css: emitted } = emit(() => {
      const { css, t } = miniSystem()

      return css({
        'padding': t.space.md,
        'background': t.color.brand,
        'hover': { background: 'rebeccapurple' },
        'md': { padding: t.space.sm },
        'color': { base: 'black', hover: 'white' },
        '&:has(> img:first-child)': { paddingTop: 0 },
        '@supports (view-transition-name: none)': { viewTransitionName: 'card' },
      }, 'card')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.recipes {
        .card__oiwpg60 {
          padding: var(--vane-space-md);
          background: var(--vane-color-brand);
          color: black;
        }
        .card__oiwpg60:hover {
          background: rebeccapurple;
          color: white;
        }
        .card__oiwpg60:has(> img:first-child) {
          padding-top: 0;
        }
        @media (min-width: 768px) {
          .card__oiwpg60 {
            padding: var(--vane-space-sm);
          }
        }
        @supports (view-transition-name: none) {
          .card__oiwpg60 {
            view-transition-name: card;
          }
        }
      }"
    `)
  })

  it('intersects nested conditions into one arm', () => {
    const { css: emitted } = emit(() => {
      const { css } = miniSystem()

      return css({
        overflow: 'hidden',
        open: { motionOk: { animationDuration: '200ms' } },
      }, 'content')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.recipes {
        .content__oiwpg60 {
          overflow: hidden;
        }
        @media (prefers-reduced-motion: no-preference) {
          .content__oiwpg60[data-state="open"] {
            animation-duration: 200ms;
          }
        }
      }"
    `)
  })

  it('a comma-list condition multiplies through nesting', () => {
    const { css: emitted } = emit(() => {
      const { css } = miniSystem()

      return css({
        open: { hoverFocus: { outlineOffset: '2px' } },
      }, 'pair')
    })

    expect(emitted).toContain('.pair__oiwpg60[data-state="open"]:hover, .pair__oiwpg60[data-state="open"]:focus-visible {')
  })

  it('compiles the scheme conditions to pinned-subtree and preference arms', () => {
    const { css: emitted } = emit(() => {
      const { css } = miniSystem()

      return css({
        dark: { borderColor: 'white' },
      }, 'panel')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.recipes {
        .panel__oiwpg60:where([data-scheme='dark'], [data-scheme='dark'] *) {
          border-color: white;
        }
        @media (prefers-color-scheme: dark) {
          .panel__oiwpg60:where(:not([data-scheme='light'], [data-scheme='light'] *)) {
            border-color: white;
          }
        }
      }"
    `)
  })

  it('a class handle interpolates into a selector as a typed reference', () => {
    const { css: emitted } = emit(() => {
      const { css } = miniSystem()
      const button = css({ display: 'inline-flex' }, 'button')

      return css({
        display: 'flex',
        [`${button} + ${button}`]: { marginInlineStart: 0 },
        [`& ${button}`]: { borderRadius: 0 },
      }, 'toolbar')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.recipes {
        .button__oiwpg60 {
          display: inline-flex;
        }
        .toolbar__oiwpg61 {
          display: flex;
        }
        .toolbar__oiwpg61 .button__oiwpg60 + .button__oiwpg60 {
          margin-inline-start: 0;
        }
        .toolbar__oiwpg61 .button__oiwpg60 {
          border-radius: 0;
        }
      }"
    `)
  })

  it('numbers take the substrate unit rule: px where lengths, unitless where unitless', () => {
    const { css: emitted } = emit(() => {
      const { css } = miniSystem()
      return css({ padding: 8, lineHeight: 1.5, zIndex: 10, flexGrow: 1 }, 'numbers')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.recipes {
        .numbers__oiwpg60 {
          padding: 8px;
          line-height: 1.5;
          z-index: 10;
          flex-grow: 1;
        }
      }"
    `)
  })

  it('custom properties are plain keys; fallback arrays emit repeated declarations', () => {
    const { css: emitted } = emit(() => {
      const { css } = miniSystem()

      return css({
        '--track-size': 8,
        'position': ['-webkit-sticky', 'sticky'],
      }, 'escape')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.recipes {
        .escape__oiwpg60 {
          --track-size: 8;
          position: -webkit-sticky;
          position: sticky;
        }
      }"
    `)
  })

  it('layers: declared once in order; styles land in the default layer or an explicit one', () => {
    const { css: emitted } = emit(() => {
      const { css } = miniSystem()
      css({ display: 'grid' }, 'inRecipes')
      css({ layer: 'overrides', maxWidth: '100%' }, 'fixup')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.recipes {
        .inRecipes__oiwpg60 {
          display: grid;
        }
      }
      @layer vane.overrides {
        .fixup__oiwpg61 {
          max-width: 100%;
        }
      }"
    `)
  })

  it('@starting-style and container conditions are plain keys', () => {
    const { css: emitted } = emit(() => {
      const { css } = miniSystem()

      return css({
        'opacity': 1,
        '@starting-style': { opacity: 0 },
        'cardWide': { padding: '24px' },
      }, 'entry')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.recipes {
        .entry__oiwpg60 {
          opacity: 1;
        }
        @starting-style {
          .entry__oiwpg60 {
            opacity: 0;
          }
        }
        @container card (min-width: 400px) {
          .entry__oiwpg60 {
            padding: 24px;
          }
        }
      }"
    `)
  })
})

describe('keyframes and globalCss', () => {
  it('keyframes emit under the export-held name; the handle interpolates', () => {
    const { css: emitted } = emit(() => {
      const { css, keyframes } = miniSystem()
      const slideDown = keyframes({
        from: { blockSize: 0, opacity: 0 },
        to: { blockSize: '100px', opacity: 1 },
      }, 'slideDown')

      return css({
        open: { motionOk: { animation: `${slideDown} 200ms ease-out` } },
      }, 'accordion')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@keyframes slideDown__oiwpg60 {
        from {
          block-size: 0;
          opacity: 0;
        }
        to {
          block-size: 100px;
          opacity: 1;
        }
      }
      @layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.recipes {
        @media (prefers-reduced-motion: no-preference) {
          .accordion__oiwpg61[data-state="open"] {
            animation: slideDown__oiwpg60 200ms ease-out;
          }
        }
      }"
    `)
  })

  it('globalCss lands in the reset layer with conditions intact', () => {
    const { css: emitted } = emit(() => {
      const { globalCss, t } = miniSystem()

      globalCss('html, body', {
        margin: 0,
        background: t.color.brand,
        motionReduce: { scrollBehavior: 'auto' },
      })
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.reset {
        html, body {
          margin: 0;
          background: var(--vane-color-brand);
        }
        @media (prefers-reduced-motion: reduce) {
          html, body {
            scroll-behavior: auto;
          }
        }
      }"
    `)
  })
})

describe('css.raw', () => {
  it('scopes a raw block under the generated class, descendants included', () => {
    const { css: emitted } = emit(() => {
      const { css, t } = miniSystem()

      return css.raw`
        h2 { margin-block: 1.5em 0.5em; }
        a {
          color: ${t.color.brand};
          &:hover { text-decoration-thickness: 2px; }
        }
        @media (min-width: 768px) {
          h2 { margin-block: 2em 1em; }
        }
      `
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-color-brand: #635bff;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.recipes {
        .oiwpg60 h2 {
          margin-block: 1.5em .5em;
        }
        .oiwpg60 a {
          color: var(--vane-color-brand);
        }
        .oiwpg60 a:hover {
          text-decoration-thickness: 2px;
        }
        @media (width >= 768px) {
          .oiwpg60 h2 {
            margin-block: 2em 1em;
          }
        }
      }"
    `)
  })
})
