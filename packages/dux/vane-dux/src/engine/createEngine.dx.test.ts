import { cursor } from '@mszr/selenita'
import { duxProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = duxProject()

describe('canonical engine editor DX', () => {
  it('makes the engine and one-import system surfaces discoverable', () => {
    const result = project.query`
      import { createEngine } from '@mszr/vane-dux'
      const de = createEngine({ length: { unitless: 'rem' } })
      const tokens = de.defineTokens({ color: { brand: de.oklch(0.58, 0.2, 285) } })
      const ds = de.createSystem({ tokens })
      void de.${cursor('engine')}
      void tokens.${cursor('module')}
      void ds.${cursor('system')}
    `

    expect(result.at('engine').completions).toContainCompletions([
      'defineTokens',
      'createSystem',
      'use',
      'extend',
      'length',
      'oklch',
      'serialize',
    ])
    expect(result.at('module').completions).toContainCompletions(['compose', 'derive'])
    expect(result.at('module').completions).not.toContainCompletion('build')
    expect(result.at('system').completions).toContainCompletions([
      't',
      'css',
      'recipe',
      'length',
      'oklch',
      'serialize',
      'conditions',
      'layers',
    ])
    expect(result.at('system').completions).not.toContainCompletion('defineTokens')
    expect(result.at('system').completions).not.toContainCompletion('createSystem')
  })

  it('keeps staged module inference exact through the engine', () => {
    const { completions } = project.query`
      import { createEngine } from '@mszr/vane-dux'
      const de = createEngine()
      const colors = de.defineTokens({ color: { brand: de.oklch(0.58, 0.2, 285) } })
      const metrics = de.defineTokens({ space: { sm: de.length.rem(0.5) } })
      void de.defineTokens().compose(colors).compose(metrics).derive((tokens) => {
        tokens.${cursor}
        return { ready: 'yes' }
      })
    `

    expect(completions).toContainCompletions(['color', 'space'])
  })

  it('reports reserved extension names at the returned key', () => {
    const { errors } = project.check`
      import { createEngine } from '@mszr/vane-dux'
      createEngine().extend(() => ({ css: {} }))
    `

    expect(errors).toHaveErrorCount(1)
    expect(errors).toHaveError(/css|never/)
  })
})
