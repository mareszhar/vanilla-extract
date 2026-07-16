import { cursor } from '@mszr/selenita'
import { vanityProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = vanityProject()

describe('preset foundations editor DX', () => {
  it('keeps starter-system tokens at the cursor', () => {
    const result = project.query`
      import { createEngine } from '@mszr/vanity'
      import { presetConditions, presetTokens } from '@mszr/vanity/preset'
      const de = createEngine()
      const ds = de.createSystem({ tokens: presetTokens(de), conditions: presetConditions(de) })
      ds.t.${cursor('tokens')}
    `

    expect(result.at('tokens').completions).toContainCompletions(['color', 'space', 'radius', 'shadow'])
  })
})
