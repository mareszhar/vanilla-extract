/**
 * The output plane for atoms: bounded pre-generation is the contract — one
 * class per property value, plus one per declared condition, in the
 * `utilities` layer; CSS output scales with conditions, never with values.
 */

import { createSystem } from '@mszr/vane-dux'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

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
      "@layer vane;
      @layer vane.reset;
      @layer vane.tokens;
      @layer vane.recipes;
      @layer vane.utilities;
      @layer vane.overrides;
      :root {
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
      }
      @layer vane.utilities {
        .atoms_gap_sm__oiwpg60 {
          gap: var(--vane-space-sm);
        }
        .atoms_gap_md__oiwpg62 {
          gap: var(--vane-space-md);
        }
        @media (min-width: 768px) {
          .atoms_gap_sm_md__oiwpg61 {
            gap: var(--vane-space-sm);
          }
          .atoms_gap_md_md__oiwpg63 {
            gap: var(--vane-space-md);
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
