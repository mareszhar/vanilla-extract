import { cursor } from '@mszr/selenita'
import { duxProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = duxProject()

describe('shared value editor DX', () => {
  it('groups units and typed raw lanes into focused namespaces', () => {
    const result = project.query`
      import { length, rawValue } from '@mszr/vane-dux'
      void length.${cursor('length')}
      void rawValue.${cursor('raw')}
    `

    expect(result.at('length').completions).toContainCompletions(['px', 'rem', 'em', 'vh', 'cqi'])
    expect(result.at('raw').completions).toContainCompletions(['unknown', 'length', 'color', 'transformList'])
  })

  it('keeps custom-property anatomy and color interpolation discoverable', () => {
    const result = project.query`
      import { customProperty, mix } from '@mszr/vane-dux'
      const gap = customProperty('--gap', { type: 'length' })
      void gap.${cursor('property')}
      void mix('#fff', '#000', 0.5).${cursor('mix')}
    `

    expect(result.at('property').completions).toContainCompletions(['$name', '$var'])
    expect(result.at('mix').completions).toContainCompletion('in')
  })

  it('puts an incompatible min operand in one local diagnostic', () => {
    const { errors } = project.check`
      import { min } from '@mszr/vane-dux'
      void min('1s', '2px')
    `
    expect(errors).toHaveErrorCount(1)
    expect(errors).toHaveError(/never|1s|2px/)
  })

  it('keeps self/system brands and unit hovers readable', () => {
    const result = project.query`
      import type { VaneSystemValue } from '@mszr/vane-dux'
      import { length } from '@mszr/vane-dux'
      const measure = length.em(2)
      declare const resolved: VaneSystemValue<'length'>
      void meas${cursor('self')}ure
      void resol${cursor('system')}ved
    `

    expect(result.at('self').hover).toContain('VaneUnitValue')
    expect(result.at('system').hover).toContain('VaneSystemValue')
    expect(result.at('self').hover).not.toContain('VaneExpressionNode')
    expect(result.at('system').hover).not.toContain('VaneExpressionNode')
  })
})
