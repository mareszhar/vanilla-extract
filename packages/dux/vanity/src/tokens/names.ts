/**
 * Emitted names are a public, consumer-facing API ([vanity-spec-tokens.md §9]):
 * path-derived kebab names under the system prefix, stable across builds.
 * The runtime rule here and the type-level `VanityKebab` must agree exactly —
 * both convert per character, so `brandSoft` → `brand-soft` everywhere.
 */

export function kebab(segment: string): string {
  return segment.replace(/[A-Z]/g, upper => `-${upper.toLowerCase()}`)
}

export function tokenName(prefix: string, path: readonly string[]): string {
  return `--${prefix}-${path.map(kebab).join('-')}`
}
