/**
 * The editor-DX plane for the Vue overlay: the composables' hovers stay
 * readable public types, part names autocomplete off the computed record, and
 * a wrong variant value dies at the key ([dux-patterns.md §10]).
 */

import { cursor } from '@mszr/selenita'
import { duxProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = duxProject()

const defineOverlay = `
import { createEngine } from '@mszr/vane-dux'
import { useAnatomy, usePorts } from '@mszr/vane-dux/vue'

const de = createEngine()
const { anatomy, port } = de.createSystem({ tokens: { space: { sm: '8px' } } })

const fraction = port(0)

const dialog = anatomy({
  parts: ['backdrop', 'content', 'title'],
  base: { content: { padding: 8 } },
  variants: {
    size: {
      sm: { content: { maxWidth: '28rem' } },
      lg: { content: { maxWidth: '52rem' } },
    },
  },
  defaults: { size: 'sm' },
})

void useAnatomy; void usePorts; void fraction; void dialog
`

describe('the vue overlay, at the cursor', () => {
  it('the spec-shaped usage raises no diagnostics', () => {
    const { errors } = project.check`${defineOverlay}
      const d = useAnatomy(dialog, { size: 'lg' })
      const style = usePorts(() => [fraction.set(0.5)])
      void d.value.content
      void style.value
    `
    expect(errors).toBeClean()
  })

  it('part names autocomplete off the computed record', () => {
    const result = project.query`${defineOverlay}
      const d = useAnatomy(dialog)
      void d.value.${cursor}
    `
    expect(result.completions).toContainCompletions(['backdrop', 'content', 'title'])
  })

  it('a wrong variant value dies at the key', () => {
    const { errors } = project.check`${defineOverlay}
      void useAnatomy(dialog, { size: 'smm' })
    `
    expect(errors).toHaveError(/smm|sm|lg/)
    expect(errors).toHaveErrorCount(1)
  })

  it('a non-fragment port source dies at the argument', () => {
    const { errors } = project.check`${defineOverlay}
      void usePorts(5)
    `
    expect(errors).toHaveErrorCount(1)
  })
})
