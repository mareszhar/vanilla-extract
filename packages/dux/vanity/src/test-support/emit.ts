/**
 * The output-plane harness: run a style-module body in-process against the
 * vanilla-extract substrate and return the CSS it emitted — the same adapter +
 * transform pipeline the real compiler drives, without a bundler in the loop.
 */

import { removeAdapter, setAdapter } from '@vanilla-extract/css/adapter'
import { endFileScope, setFileScope } from '@vanilla-extract/css/fileScope'
import { transformCss } from '@vanilla-extract/css/transformCss'

type Adapter = Parameters<typeof setAdapter>[0]

export interface EmitResult<T> {
  css: string
  returned: T
}

type CssObj = Parameters<typeof transformCss>[0]['cssObjs'][number]

/** Evaluate `body` as if it were `prism.style.ts` and capture the emitted CSS. */
export function emit<T>(body: () => T): EmitResult<T> {
  const cssObjs: CssObj[] = []
  const localClassNames = new Set<string>()

  const adapter: Adapter = {
    appendCss: (cssObj: CssObj) => void cssObjs.push(cssObj),
    registerClassName: (className: string) => void localClassNames.add(className),
    registerComposition: () => {},
    markCompositionUsed: () => {},
    onEndFileScope: () => {},
    getIdentOption: () => 'debug',
  }

  setAdapter(adapter)
  setFileScope('src/test-support/prism.style.ts', '@prism/fixture')

  try {
    const returned = body()
    const css = transformCss({
      localClassNames: [...localClassNames],
      composedClassLists: [],
      cssObjs,
    }).join('\n')

    return { css, returned }
  }
  finally {
    endFileScope()
    removeAdapter()
  }
}
