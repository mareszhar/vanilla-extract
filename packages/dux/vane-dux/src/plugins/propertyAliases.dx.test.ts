import { cursor } from '@mszr/selenita'
import { duxProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = duxProject()

describe('property alias editor DX', () => {
  it('completes exact aliases beside standards in both mode', () => {
    const result = project.query`
      import { createEngine, propertyAliases } from '@mszr/vane-dux'
      const de = createEngine().use(propertyAliases({ py: 'paddingBlock', bg: 'background' }))
      const ds = de.createSystem({ tokens: de.defineTokens({}) })
      void ds.css({ ${cursor} })
    `
    expect(result.completions).toContainCompletions(['py', 'bg', 'paddingBlock', 'background', 'color'])
    expect(result.completions).not.toContainCompletion('pb')
  })

  it('aliases-only narrows the primary lane and leaves css.standard complete', () => {
    const result = project.query`
      import { createEngine, propertyAliases } from '@mszr/vane-dux'
      const de = createEngine().use(propertyAliases({ py: 'paddingBlock' }, { expose: 'aliases-only' }))
      const ds = de.createSystem({ tokens: de.defineTokens({}) })
      void ds.css({ ${cursor('primary')} })
      void ds.css.standard({ ${cursor('standard')} })
    `
    expect(result.at('primary').completions).toContainCompletion('py')
    expect(result.at('primary').completions).not.toContainCompletion('paddingBlock')
    expect(result.at('standard').completions).toContainCompletion('paddingBlock')
  })
})
