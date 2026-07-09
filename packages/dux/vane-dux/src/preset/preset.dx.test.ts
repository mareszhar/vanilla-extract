/**
 * The editor-DX plane for the preset foundations: the quickstart is
 * copy-pasteable, never inferred ([dux-spec-preset.md §2]) — the exact README
 * file typechecks verbatim, preset tokens and conditions autocomplete
 * everywhere, and mistakes die at the offending key.
 */

import { cursor } from '@mszr/selenita'
import { duxProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = duxProject()

/** The exact quickstart file — README "Start here" and [dux-spec-css.md §1.1]. */
const quickstart = `
import { createSystem } from '@mszr/vane-dux'
import { presetConditions, presetTokens } from '@mszr/vane-dux/preset'

export const { t, css, recipe, anatomy, port, theme } = createSystem({
  tokens: presetTokens({ brand: '#635bff' }),
  conditions: presetConditions(),
})
`

describe('the quickstart', () => {
  it('raises no diagnostics, verbatim', () => {
    const { errors } = project.check`${quickstart}`
    expect(errors).toBeClean()
  })

  it('the README button recipe typechecks as written', () => {
    const { errors } = project.check`${quickstart}
      export const button = recipe({
        base: { ...t.text.body, display: 'inline-flex', gap: t.space.xs, borderRadius: t.radius.sm },
        variants: {
          intent: {
            brand: { background: t.color.brand, color: t.color.onBrand, hover: { background: t.color.brandHover } },
            ghost: { background: 'transparent', hover: { background: t.color.brandSoft } },
          },
          size: {
            sm: { paddingInline: t.space.sm },
            md: { paddingInline: t.space.md },
          },
        },
        defaults: { intent: 'brand', size: 'md' },
      })
    `
    expect(errors).toBeClean()
  })
})

describe('completions', () => {
  it('preset tokens autocomplete at the graph', () => {
    const result = project.query`${quickstart}
      void css({ background: t.color.${cursor} })
    `
    expect(result.completions).toContainCompletions(['brand', 'brandHover', 'brandSoft', 'onBrand', 'surface', 'ink'])
  })

  it('preset conditions sit beside the base set in rule keys', () => {
    const result = project.query`${quickstart}
      void css({ ${cursor} })
    `
    expect(result.completions).toContainCompletions(['sm', 'open', 'forcedColors', 'containerMd', 'hover', 'motionOk'])
  })
})

describe('errors at the cursor', () => {
  it('a mistyped preset token dies at the key', () => {
    const { errors } = project.check`${quickstart}
      void css({ gap: t.space.mid })
    `
    expect(errors).toHaveError(/mid/)
    expect(errors).toHaveErrorCount(1)
  })

  it('a mistyped preset condition dies at the key', () => {
    const { errors } = project.check`${quickstart}
      void css({ containerMdd: { gap: t.space.sm } })
    `
    expect(errors).toHaveError(/containerMdd/)
    expect(errors).toHaveErrorCount(1)
  })

  it('a control typo dies at the value with the valid set in reach', () => {
    const { errors } = project.check`
      import { presetTokens } from '@mszr/vane-dux/preset'
      void presetTokens({ radius: 'blobby' })
    `
    expect(errors).toHaveError(/blobby|sharp|calm|round/)
    expect(errors).toHaveErrorCount(1)
  })
})
