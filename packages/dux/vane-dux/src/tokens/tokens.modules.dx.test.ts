import type { Diagnostic } from '@mszr/selenita'
import { cursor } from '@mszr/selenita'
import { duxProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = duxProject()
const LEAK = /VaneMergeGraph|VaneCompositionGuard|VaneDuplicatePaths/

function expectNoLeak(messages: Array<Diagnostic | string>): void {
  for (const message of messages)
    expect(typeof message === 'string' ? message : message.message).not.toMatch(LEAK)
}

describe('token modules — editor DX', () => {
  it('integration stages complete every composed module', () => {
    const { completions } = project.query`
      import { defineTokens, oklch } from '@mszr/vane-dux'
      const colors = defineTokens({ color: { brand: oklch(0.58, 0.2, 285) } })
      const metrics = defineTokens({ space: { sm: '8px' } })
      void defineTokens().compose(colors).compose(metrics).derive((tokens) => {
        tokens.${cursor}
        return { ready: 'yes' }
      })
    `

    expect(completions).toContainCompletions(['color', 'space'])
  })

  it('a duplicate names its exact dot path at compose', () => {
    const { errors } = project.check`
      import { defineTokens } from '@mszr/vane-dux'
      const first = defineTokens({ color: { brand: '#fff' } })
      const second = defineTokens({ color: { brand: '#000' } })
      void defineTokens().compose(first).compose(second)
    `

    expect(errors).toHaveError(/Token module duplicates an existing token: color\.brand/)
    expect(errors).toHaveErrorCount(1)
    expectNoLeak(errors)
  })

  it('a clean multi-file-shaped composition has no diagnostics', () => {
    const { errors } = project.check`
      import { defineTokens } from '@mszr/vane-dux'
      export const colors = defineTokens({ color: { brand: '#fff' } })
      export const metrics = defineTokens({ space: { sm: '8px' } })
      export const design = defineTokens().compose(colors).compose(metrics)
        .derive(({ color, space }) => ({ control: { border: color.brand, gap: space.sm } }))
      void design
    `

    expect(errors).toBeClean()
  })
})
