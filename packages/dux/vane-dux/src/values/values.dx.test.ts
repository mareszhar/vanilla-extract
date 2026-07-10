/** Language-service contracts for the fluent CSS value surface. */

import { cursor } from '@mszr/selenita'
import { duxProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = duxProject()

describe('cSS value editor DX', () => {
  it('calculation operations complete as one small immutable surface', () => {
    const { completions } = project.query`
      import { calc } from '@mszr/vane-dux'
      void calc('1rem').${cursor}
    `

    expect(completions).toContainCompletions(['add', 'subtract', 'multiply', 'divide', 'negate', 'css'])
  })

  it('a dimensional mistake is one diagnostic at its operand', () => {
    const { errors } = project.check`
      import { calc } from '@mszr/vane-dux'
      void calc('1rem').add('20deg')
    `

    expect(errors).toHaveErrorCount(1)
    expect(errors).toHaveError(/20deg|never/)
  })

  it('grid helpers complete as one focused namespace', () => {
    const { completions } = project.query`
      import { grid } from '@mszr/vane-dux'
      void grid.${cursor}
    `

    expect(completions).toContainCompletions(['minmax', 'repeat', 'template', 'areas'])
  })

  it('relative color and channel operations are discoverable', () => {
    const result = project.query`
      import { channel, oklch } from '@mszr/vane-dux'
      void oklch.${cursor('oklch')}
      void channel.${cursor('channel')}
    `

    expect(result.at('oklch').completions).toContainCompletion('from')
    expect(result.at('channel').completions).toContainCompletions(['set', 'add', 'subtract', 'multiply', 'divide'])
  })
})
