/**
 * Setup failures are diagnosed too ([dux-spec-css.md §9]): an authoring call
 * outside a compiled style module gets one friendly error naming the missing
 * plugin and the line to add — never a raw substrate evaluation stack.
 */

import { getFileScope, hasFileScope } from '@vanilla-extract/css/fileScope'
import { VaneError } from '../diagnostics'

/** Guard an authoring call; returns the evaluating style module's path for diagnostics. */
export function requireStyleModule(surface: string): string {
  if (!hasFileScope()) {
    throw new VaneError({
      code: 'VANE_VITE_PLUGIN_MISSING',
      message: `${surface} ran outside a style-module build — the vane plugin is not wired up`,
      detail: [
        'Style modules are evaluated at build time; nothing here can run as ordinary app code.',
      ],
      fix: 'add vaneDuxPlugin() from \'@mszr/vane-dux/vite\' to vite plugins (or the \'@mszr/vane-dux/nuxt\' module), and keep this call inside a *.style.ts file',
    })
  }

  return getFileScope().filePath
}
