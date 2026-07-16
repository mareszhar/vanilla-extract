/**
 * Conditions ([vanity-patterns.md §5]): a named circumstance — pseudo, media,
 * container, scheme, element state — defined once in the system, usable as a
 * bare key everywhere. Values are plain selector strings or the typed helpers;
 * helpers exist for readability, strings are never second-class. A condition
 * compiles to one or more *arms* — the `dark`/`light` schemes need two — and
 * nesting conditions intersects their arms.
 */

import type { VanityDiagnostic } from '../diagnostics'
import { VanityError } from '../diagnostics'
import { checkQuery, checkSelector, isCssProperty } from '../internal/cssParser'
import { kebab } from '../tokens/names'

/** One compiled way a condition applies: at-rule wrappers and/or a `&` selector. */
export interface VanityConditionArm {
  media?: string
  supports?: string
  container?: string
  selector?: string
}

/** A typed helper result — `media()`, `container()`, `schemeIs()`, `data()`, `aria()`. */
export interface VanityCondition {
  readonly arms: readonly VanityConditionArm[]
}

export type VanityConditionInput = string | VanityCondition

function condition(...arms: VanityConditionArm[]): VanityCondition {
  return { arms }
}

// ─── The typed helpers ───────────────────────────────────────────────────────

/** A media condition: `md: media('(min-width: 768px)')`. */
export function media(query: string): VanityCondition {
  return condition({ media: query })
}

/** A supports condition: `supportsAnchor: supports('(anchor-name: --a)')`. */
export function supports(query: string): VanityCondition {
  return condition({ supports: query })
}

/**
 * A container condition: `cardWide: container('card', '(min-width: 400px)')`,
 * or unnamed — `wide: container('(min-width: 400px)')`.
 */
export function container(nameOrQuery: string, query?: string): VanityCondition {
  return condition({ container: query === undefined ? nameOrQuery : `${nameOrQuery} ${query}` })
}

/**
 * The effective scheme ([vanity-spec-tokens.md §3]): the OS preference unless an
 * ancestor pins `data-scheme`. Two arms — the pinned subtree, and the
 * preference outside any opposite-pinned subtree.
 */
export function schemeIs(scheme: 'light' | 'dark'): VanityCondition {
  const opposite = scheme === 'light' ? 'dark' : 'light'

  return condition(
    { selector: `&:where([data-scheme='${scheme}'], [data-scheme='${scheme}'] *)` },
    {
      media: `(prefers-color-scheme: ${scheme})`,
      selector: `&:where(:not([data-scheme='${opposite}'], [data-scheme='${opposite}'] *))`,
    },
  )
}

/** A `data-*` state condition: `open: data('state', 'open')` → `&[data-state='open']`. */
export function data(attribute: string, value?: string): VanityCondition {
  const name = `data-${kebab(attribute)}`
  return condition({ selector: value === undefined ? `&[${name}]` : `&[${name}='${value}']` })
}

/** An ARIA state condition: `expanded: aria('expanded')` → `&[aria-expanded='true']`. */
export function aria(attribute: string, value: string | boolean = true): VanityCondition {
  return condition({ selector: `&[aria-${kebab(attribute)}='${value}']` })
}

// ─── The base set ────────────────────────────────────────────────────────────

export type VanityBaseConditionName
  = | 'hover' | 'hoverFocus' | 'active' | 'focusVisible' | 'disabled'
    | 'motionOk' | 'motionReduce' | 'dark' | 'light' | 'ltr' | 'rtl'

/**
 * The built-in base conditions ([vanity-spec-css.md §1]): the platform-universal
 * names, no opinions. A condition never claims less than it does — `hover` is
 * `:hover`; the interactive-affordance pair is named `hoverFocus` for what it
 * is. Breakpoints, container sizes, and headless states are opinions and live
 * in the preset.
 */
export function baseConditions(): Record<VanityBaseConditionName, VanityConditionInput> {
  return {
    hover: '&:hover',
    hoverFocus: '&:hover, &:focus-visible',
    active: '&:active',
    focusVisible: '&:focus-visible',
    disabled: '&:disabled',
    motionOk: media('(prefers-reduced-motion: no-preference)'),
    motionReduce: media('(prefers-reduced-motion: reduce)'),
    dark: schemeIs('dark'),
    light: schemeIs('light'),
    ltr: '&:dir(ltr)',
    rtl: '&:dir(rtl)',
  }
}

// ─── Introspection ───────────────────────────────────────────────────────────

/** Serialize compiled conditions readably for the manifest: one string per condition. */
export function describeConditions(conditions: Map<string, readonly VanityConditionArm[]>): Record<string, string> {
  const described: Record<string, string> = {}

  for (const [name, arms] of conditions) {
    described[name] = arms
      .map(arm => [
        arm.media === undefined ? undefined : `@media ${arm.media}`,
        arm.supports === undefined ? undefined : `@supports ${arm.supports}`,
        arm.container === undefined ? undefined : `@container ${arm.container}`,
        arm.selector,
      ].filter(part => part !== undefined).join(' '))
      .join(' | ')
  }

  return described
}

// ─── Normalization ───────────────────────────────────────────────────────────

/**
 * Resolve the merged condition map into compiled arms, refusing a name that
 * collides with a CSS property (the two bare-key namespaces must never blur)
 * and parsing every selector and query at the definition site.
 */
export function normalizeConditions(
  conditions: Record<string, VanityConditionInput>,
  file: string | undefined,
): Map<string, readonly VanityConditionArm[]> {
  const normalized = new Map<string, readonly VanityConditionArm[]>()
  const diagnostics: VanityDiagnostic[] = []

  for (const [name, input] of Object.entries(conditions)) {
    if (isCssProperty(kebab(name))) {
      diagnostics.push({
        code: 'VANITY_SYSTEM_CONDITION_COLLISION' as const,
        message: `the condition '${name}' collides with the CSS property '${kebab(name)}'`,
        detail: ['conditions are bare keys beside properties; a shared name would make every rule ambiguous'],
        path: name,
        file,
        fix: `rename the condition — e.g. '${name}Is' or a more specific circumstance`,
      })
      continue
    }

    const arms = typeof input === 'string' ? parseConditionString(name, input, file) : input.arms

    for (const arm of arms) {
      const reason
        = (arm.selector !== undefined ? checkSelector(arm.selector) : undefined)
          ?? (arm.media !== undefined ? checkQuery('media', arm.media) : undefined)
          ?? (arm.supports !== undefined ? checkQuery('supports', arm.supports) : undefined)
          ?? (arm.container !== undefined ? checkQuery('container', arm.container) : undefined)

      if (reason !== undefined) {
        diagnostics.push({
          code: 'VANITY_SYSTEM_INVALID_CONDITION' as const,
          message: `the condition '${name}' does not parse: ${reason}`,
          path: name,
          file,
          fix: 'fix the selector or query — the same text must hold as CSS',
        })
      }
    }

    normalized.set(name, arms)
  }

  if (diagnostics.length > 0)
    throw new VanityError(diagnostics)

  return normalized
}

function parseConditionString(name: string, input: string, file: string | undefined): readonly VanityConditionArm[] {
  for (const [prefix, key] of [['@media ', 'media'], ['@supports ', 'supports'], ['@container ', 'container']] as const) {
    if (input.startsWith(prefix))
      return [{ [key]: input.slice(prefix.length).trim() }]
  }

  if (input.includes('&'))
    return [{ selector: input }]

  throw new VanityError({
    code: 'VANITY_SYSTEM_INVALID_CONDITION',
    message: `the condition '${name}' is '${input}', which is neither a selector containing '&' nor an at-rule`,
    path: name,
    file,
    fix: `write a selector referencing the styled element ('&${input}'?), or use media()/container()/supports()`,
  })
}
