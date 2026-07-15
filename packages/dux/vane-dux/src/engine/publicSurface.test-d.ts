/** Phase-9 gate: the unpublished compatibility dialect is not public. */

import * as vane from '@mszr/vane-dux'
import * as runtime from '@mszr/vane-dux/runtime'
import { describe, it } from 'vitest'

describe('canonical package surface', () => {
  it('authors through createEngine and bound systems only', () => {
    void vane.createEngine

    // @ts-expect-error — systems are created by an engine
    void vane.createSystem
    // @ts-expect-error — token modules are defined by an engine
    void vane.defineTokens
    // @ts-expect-error — constructors are obtained from an engine/system
    void vane.oklch
    // @ts-expect-error — grouped changes use ds.tokenOverride
    void vane.theme
  })

  it('uses bound runtimes and explicit custom-property operations', () => {
    void runtime.setCustomProperty

    // @ts-expect-error — runtime token writes are bound by ds.runtime(target)
    void runtime.applyTheme
    // @ts-expect-error — axes are selected by a bound runtime
    void runtime.setScheme
  })
})
