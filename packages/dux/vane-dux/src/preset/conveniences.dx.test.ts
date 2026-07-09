/**
 * The editor-DX plane for the preset conveniences: the default atoms map keeps
 * token keys at the cursor, and helper fragments spread into rules with no
 * diagnostics.
 */

import { cursor } from '@mszr/selenita'
import { duxProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = duxProject()

const defineFixture = `
import { createSystem } from '@mszr/vane-dux'
import { animate, definePatterns, focusRing, minTarget, presetAtoms, presetConditions, presetTokens } from '@mszr/vane-dux/preset'

const { css, defineAtoms, t } = createSystem({
  tokens: presetTokens(),
  conditions: presetConditions(),
})

const atoms = defineAtoms(presetAtoms(t))
const { stack, sidebar } = definePatterns({ css, t })

void atoms; void stack; void sidebar; void animate; void focusRing; void minTarget
`

describe('the conveniences, at the cursor', () => {
  it('the whole convenience surface typechecks together', () => {
    const { errors } = project.check`${defineFixture}
      export const field = css({ ...focusRing({ color: t.color.brand }), ...minTarget(), ...animate('x 1s ease') })
      export const page = stack({ gap: 'lg' })
      export const shell = sidebar({ sideWidth: '18rem', gap: 'md' })
      void atoms({ stack: true, p: { base: 'md', lg: 'xl' }, bg: 'brandSoft' })
    `
    expect(errors).toBeClean()
  })

  it('the default map\'s token keys autocomplete as values', () => {
    const result = project.query`${defineFixture}
      void atoms({ bg: '${cursor}' })
    `
    expect(result.completions).toContainCompletions(['brand', 'brandSoft', 'surface', 'ink'])
  })

  it('a wrong pattern gap is one diagnostic at the key', () => {
    const { errors } = project.check`${defineFixture}
      void stack({ gap: 'enormous' })
    `
    expect(errors).toHaveError(/enormous|2xs|xl/)
    expect(errors).toHaveErrorCount(1)
  })
})
