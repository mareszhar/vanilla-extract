/**
 * The output plane: recipe and anatomy CSS is a public contract
 * ([dux-workspace.md §5]) — per-arm classes in the recipes layer, defaults
 * folded into base where sound, compound entries last so they win by order,
 * part-scoped conditions compiled to ancestor-state selectors, locked.
 */

import { emit } from '@test'
import { describe, expect, it } from 'vitest'
import { createSystem } from '../test-support/legacy'

function miniSystem() {
  return createSystem({
    tokens: {
      color: { brand: '#635bff' },
      space: { xs: '4px', sm: '8px', md: '16px' },
    },
    conditions: {
      open: '&[data-state="open"]',
    },
  })
}

describe('recipe()', () => {
  it('emits per-arm classes; a covered default folds into base, an uncovered one keeps its class', () => {
    const { css: emitted } = emit(() => {
      const { recipe, t } = miniSystem()

      return recipe({
        base: { display: 'inline-flex', gap: t.space.xs },
        variants: {
          intent: {
            // `brand` declares a hover arm `danger` lacks — it cannot fold.
            brand: { background: t.color.brand, hover: { background: 'rebeccapurple' } },
            danger: { background: 'crimson' },
          },
          size: {
            // Both values declare exactly `paddingInline` — `md` folds into base.
            sm: { paddingInline: t.space.sm },
            md: { paddingInline: t.space.md },
          },
        },
        toggles: {
          pill: { borderRadius: '999px' },
        },
        compound: [
          { when: { intent: 'danger', size: 'sm' }, style: { fontWeight: 600 } },
        ],
        defaults: { intent: 'brand', size: 'md' },
      }, 'button')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      @layer vane.tokens.base;
      @layer vane.tokens.axes;
      @layer vane.tokens.cases;
      @layer vane.tokens.overrides;
      @layer vane.tokens.base {
        :root {
          --vane-color-brand: #635bff;
          --vane-space-xs: 4px;
          --vane-space-sm: 8px;
          --vane-space-md: 16px;
        }
      }
      @layer vane.recipes {
        .button__oiwpg60 {
          display: inline-flex;
          gap: var(--vane-space-xs);
          padding-inline: var(--vane-space-md);
        }
        .button_intent_brand__oiwpg61 {
          background: var(--vane-color-brand);
        }
        .button_intent_brand__oiwpg61:hover {
          background: rebeccapurple;
        }
        .button_intent_danger__oiwpg62 {
          background: crimson;
        }
        .button_size_sm__oiwpg63 {
          padding-inline: var(--vane-space-sm);
        }
        .button_pill__oiwpg64 {
          border-radius: 999px;
        }
        .button_compound_0__oiwpg65 {
          font-weight: 600;
        }
      }"
    `)
  })

  it('arms take full vane rules — conditions intersect exactly like css()', () => {
    const { css: emitted } = emit(() => {
      const { recipe } = miniSystem()

      return recipe({
        variants: {
          state: {
            active: { open: { motionOk: { animationDuration: '200ms' } } },
          },
        },
      }, 'item')
    })

    expect(emitted).toContain('@media (prefers-reduced-motion: no-preference)')
    expect(emitted).toContain('.item_state_active__oiwpg61[data-state="open"]')
  })

  it('a recipe lives in one declared layer', () => {
    const { css: emitted } = emit(() => {
      const { recipe } = miniSystem()

      return recipe({
        layer: 'overrides',
        base: { margin: 0 },
        variants: { size: { sm: { padding: 0 } } },
      }, 'fixup')
    })

    expect(emitted).toContain('@layer vane.overrides {')
    expect(emitted).not.toContain('@layer vane.recipes {')
  })
})

describe('anatomy()', () => {
  it('parts get stable classes; part-scoped conditions compile to ancestor-state selectors', () => {
    const { css: emitted } = emit(() => {
      const { anatomy, t } = miniSystem()

      return anatomy({
        parts: ['root', 'input', 'list'],
        base: {
          input: {
            'borderRadius': t.space.xs,
            'root:open': { borderEndStartRadius: 0, borderEndEndRadius: 0 },
          },
          list: { 'display': 'none', 'root:open': { display: 'block' } },
        },
        variants: {
          size: {
            sm: { input: { paddingInline: t.space.sm } },
            lg: { input: { paddingInline: t.space.md } },
          },
        },
        defaults: { size: 'sm' },
      }, 'combobox')
    })

    expect(emitted).toMatchInlineSnapshot(`
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      @layer vane.tokens.base;
      @layer vane.tokens.axes;
      @layer vane.tokens.cases;
      @layer vane.tokens.overrides;
      @layer vane.tokens.base {
        :root {
          --vane-color-brand: #635bff;
          --vane-space-xs: 4px;
          --vane-space-sm: 8px;
          --vane-space-md: 16px;
        }
      }
      @layer vane.recipes {
        .combobox_input__oiwpg61 {
          border-radius: var(--vane-space-xs);
          padding-inline: var(--vane-space-sm);
        }
        .combobox_root__oiwpg60[data-state="open"] .combobox_input__oiwpg61 {
          border-end-start-radius: 0;
          border-end-end-radius: 0;
        }
        .combobox_list__oiwpg62 {
          display: none;
        }
        .combobox_root__oiwpg60[data-state="open"] .combobox_list__oiwpg62 {
          display: block;
        }
        .combobox_size_lg_input__oiwpg63 {
          padding-inline: var(--vane-space-md);
        }
      }"
    `)
  })

  it('a comma-list condition scopes each selector part to the referenced part', () => {
    const { css: emitted } = emit(() => {
      const { anatomy } = miniSystem()

      return anatomy({
        parts: ['trigger', 'icon'],
        base: {
          icon: { 'trigger:hoverFocus': { rotate: '180deg' } },
        },
      }, 'select')
    })

    expect(emitted).toContain('.select_trigger__oiwpg60:hover .select_icon__oiwpg61, .select_trigger__oiwpg60:focus-visible .select_icon__oiwpg61')
  })
})
