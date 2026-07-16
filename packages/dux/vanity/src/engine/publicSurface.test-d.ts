/** The unpublished characterization dialect is not part of the package surface. */

import * as vanity from '@mszr/vanity'
import * as runtime from '@mszr/vanity/runtime'
import { describe, it } from 'vitest'

describe('canonical package surface', () => {
  it('authors through createEngine and bound systems only', () => {
    void vanity.createEngine

    // @ts-expect-error — systems are created by an engine
    void vanity.createSystem
    // @ts-expect-error — token modules are defined by an engine
    void vanity.defineTokens
    // @ts-expect-error — constructors are obtained from an engine/system
    void vanity.oklch
    // @ts-expect-error — grouped changes use ds.tokenOverride
    void vanity.theme
  })

  it('uses bound runtimes and explicit custom-property operations', () => {
    void runtime.setCustomProperty

    // @ts-expect-error — runtime token writes are bound by ds.runtime(target)
    void runtime.applyTheme
    // @ts-expect-error — axes are selected by a bound runtime
    void runtime.setScheme
  })
})
