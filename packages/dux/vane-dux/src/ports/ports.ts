/**
 * `ports()` — merge port/style fragments into one style object
 * ([dux-spec-ports.md §2]). For imperative code outside a framework binding;
 * `usePorts(() => [a.set(x), b.set(y)])` already merges — wrapping the array
 * in `ports()` is redundant and the docs never show it.
 */

import type { VanePortStyle } from './types'

/** Merge port/style fragments, skipping falsy entries. */
export function ports(
  ...styles: Array<VanePortStyle | false | null | undefined>
): VanePortStyle {
  return Object.assign({}, ...styles.filter(Boolean))
}
