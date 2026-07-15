import { cursor } from '@mszr/selenita'
import { duxProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = duxProject()

describe('preset foundations editor DX', () => {
  it('keeps starter-system tokens at the cursor', () => {
    const result = project.query`
      import { createEngine } from '@mszr/vane-dux'
      import { presetConditions, presetTokens } from '@mszr/vane-dux/preset'
      const de = createEngine()
      const ds = de.createSystem({ tokens: presetTokens(de), conditions: presetConditions(de) })
      ds.t.${cursor('tokens')}
    `

    expect(result.at('tokens').completions).toContainCompletions(['color', 'space', 'radius', 'shadow'])
  })
})
