/** Mechanical same-key variant/config tables derived from one resolved token group. */

import type { VaneTokenHandleAny } from '../tokens/types'
import { isHandle } from '../internal/handle'

export type VaneTokenGroup = Readonly<Record<string, VaneTokenHandleAny>>

export function fromTokenGroup<
  const Group extends VaneTokenGroup,
  Result,
>(
  group: Group,
  map: <Key extends keyof Group & string>(token: Group[Key], key: Key) => Result,
): { readonly [Key in keyof Group]: Result } {
  if (typeof map !== 'function')
    throw new TypeError('[vane] fromTokenGroup() needs a mapping callback')

  const entries = Object.entries(group).map(([key, token]) => {
    if (!isHandle(token))
      throw new TypeError(`[vane] fromTokenGroup() expected '${key}' to be a resolved token handle`)
    return [key, map(token as any, key as any)]
  })

  return Object.freeze(Object.fromEntries(entries)) as { readonly [Key in keyof Group]: Result }
}
