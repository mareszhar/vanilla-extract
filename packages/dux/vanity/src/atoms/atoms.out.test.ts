/**
 * The output plane for atoms: bounded pre-generation is the contract — one
 * class per property value, plus one per declared condition, in the
 * `utilities` layer; CSS output scales with conditions, never with values.
 */

import { emit } from '@test'
import { describe, expect, it } from 'vitest'
import { createSystem } from '../test-support/characterization'

describe('atoms, emitted', () => {
  it('pre-generates value × condition classes in the utilities layer', () => {
    const { css } = emit(() => {
      const { defineAtoms, t } = createSystem({
        tokens: { space: { sm: '8px', md: '16px' } },
        conditions: { md: '@media (min-width: 768px)' },
      })

      return defineAtoms({
        properties: { gap: t.space },
        conditions: ['md'],
      }, 'atoms')
    })

    expect(css).toMatchInlineSnapshot(`
      "@layer vanity;
      @layer vanity.reset;
      @layer vanity.tokens;
      @layer vanity.recipes;
      @layer vanity.utilities;
      @layer vanity.overrides;
      @layer vanity.tokens.base;
      @layer vanity.tokens.axes;
      @layer vanity.tokens.cases;
      @layer vanity.tokens.overrides;
      @layer vanity.tokens.base {
        :root {
          --vanity-space-sm: 8px;
          --vanity-space-md: 16px;
        }
      }
      @layer vanity.utilities {
        .atoms_gap_sm__oiwpg60 {
          gap: var(--vanity-space-sm);
        }
        .atoms_gap_md__oiwpg62 {
          gap: var(--vanity-space-md);
        }
        @media (min-width: 768px) {
          .atoms_gap_sm_md__oiwpg61 {
            gap: var(--vanity-space-sm);
          }
          .atoms_gap_md_md__oiwpg63 {
            gap: var(--vanity-space-md);
          }
        }
      }"
    `)
  })

  it('output scales with conditions, never with call sites', () => {
    const { css } = emit(() => {
      const { defineAtoms, t } = createSystem({
        tokens: { space: { sm: '8px', md: '16px' } },
      })
      const atoms = defineAtoms({ properties: { padding: t.space } }, 'atoms')

      // Many calls, same bounded output.
      atoms({ padding: 'sm' })
      atoms({ padding: 'sm' })
      atoms({ padding: 'md' })
      return atoms
    })

    expect(css.match(/atoms_padding/g)).toHaveLength(2)
  })

  it('toggles compile as full rules', () => {
    const { css } = emit(() => {
      const { defineAtoms } = createSystem({ tokens: {} })

      return defineAtoms({
        toggles: { stack: { display: 'flex', flexDirection: 'column', hover: { gap: 4 } } },
      }, 'atoms')
    })

    expect(css).toContain('flex-direction: column')
    expect(css).toContain(':hover')
  })
})
