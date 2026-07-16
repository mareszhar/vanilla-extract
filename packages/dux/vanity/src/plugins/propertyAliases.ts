/** Typed CSS-property aliases implemented as an ordinary engine plugin. */

import type { VanityCssPropertyName } from '../css/types'
import type { VanityEnginePlugin } from '../engine/createEngine'
import { all as knownCssProperties } from 'known-css-properties'
import { defineEnginePlugin } from '../engine/createEngine'

const KNOWN_CSS_PROPERTIES = new Set(knownCssProperties)

export type VanityPropertyAliasExposure = 'both' | 'aliases-only'

export interface VanityPropertyAliasOptions<Expose extends VanityPropertyAliasExposure = 'both'> {
  readonly expose?: Expose
}

export interface VanityPropertyAliasConfig<
  Aliases extends Readonly<Record<string, VanityCssPropertyName>> = Readonly<Record<string, VanityCssPropertyName>>,
  Expose extends VanityPropertyAliasExposure = VanityPropertyAliasExposure,
> {
  readonly aliases: Aliases
  readonly expose: Expose
}

/** Internal capability carrier. It is a symbol so the plugin adds no fake daily constructor. */
export const VANITY_PROPERTY_ALIASES: unique symbol = Symbol.for('vanity.propertyAliases') as any
export const VANITY_PROPERTY_ALIAS_PLUGIN: unique symbol = Symbol.for('vanity.propertyAliasPlugin') as any

export interface VanityPropertyAliasContribution<
  Aliases extends Readonly<Record<string, VanityCssPropertyName>>,
  Expose extends VanityPropertyAliasExposure,
> {
  readonly [VANITY_PROPERTY_ALIASES]: VanityPropertyAliasConfig<Aliases, Expose>
}

export interface VanityPropertyAliasPlugin<
  Aliases extends Readonly<Record<string, VanityCssPropertyName>>,
  Expose extends VanityPropertyAliasExposure,
> extends VanityEnginePlugin<VanityPropertyAliasContribution<Aliases, Expose>, object> {
  readonly [VANITY_PROPERTY_ALIAS_PLUGIN]: Expose
}

export type VanityAliasesOf<Constructors extends object>
  = typeof VANITY_PROPERTY_ALIASES extends keyof Constructors
    ? Constructors[typeof VANITY_PROPERTY_ALIASES] extends VanityPropertyAliasConfig<infer Aliases, any>
      ? Aliases
      : Record<never, never>
    : Record<never, never>

export type VanityAliasExposureOf<Constructors extends object>
  = typeof VANITY_PROPERTY_ALIASES extends keyof Constructors
    ? Constructors[typeof VANITY_PROPERTY_ALIASES] extends VanityPropertyAliasConfig<any, infer Expose>
      ? Expose
      : 'both'
    : 'both'

/**
 * Define the optional alias policy installed with `de.use(...)`.
 *
 * The map is deliberately CSS-property-to-CSS-property only: aliases shorten
 * platform vocabulary; they never become an alternate utility language.
 * Install it after axes and other engine plugins: choosing the preferred rule
 * vocabulary finalizes the typed authoring surface before systems are built.
 */
export function propertyAliases<
  const Aliases extends Readonly<Record<string, VanityCssPropertyName>>,
  const Expose extends VanityPropertyAliasExposure = 'both',
>(
  aliases: Aliases & VanityAliasDefinitionGuard<Aliases>,
  options: VanityPropertyAliasOptions<Expose> = {},
): VanityPropertyAliasPlugin<Aliases, Expose> {
  const expose = options.expose ?? 'both' as Expose
  const entries = Object.entries(aliases)

  if (entries.length === 0)
    throw new TypeError('[vanity] propertyAliases() needs at least one alias')

  for (const [alias, property] of entries) {
    if (!/^[$A-Z_][$\w-]*$/i.test(alias))
      throw new TypeError(`[vanity] property alias '${alias}' is not a usable object key`)
    if (alias.startsWith('--') || isCssProperty(alias))
      throw new TypeError(`[vanity] property alias '${alias}' collides with standard CSS vocabulary`)
    if (!isCssProperty(property))
      throw new TypeError(`[vanity] property alias '${alias}' targets unknown CSS property '${property}'`)
  }

  const normalized = Object.freeze({ ...aliases }) as Aliases
  const config = Object.freeze({ aliases: normalized, expose })
  const fingerprint = stableFingerprint(config)

  return defineEnginePlugin<VanityPropertyAliasContribution<Aliases, Expose>, object>({
    id: 'org.vanity.plugin.property-aliases',
    version: 1,
    fingerprint,
    [VANITY_PROPERTY_ALIAS_PLUGIN]: expose,
    setup: () => Object.freeze({
      [VANITY_PROPERTY_ALIASES]: config,
    }) as VanityPropertyAliasContribution<Aliases, Expose>,
  } as VanityPropertyAliasPlugin<Aliases, Expose>) as VanityPropertyAliasPlugin<Aliases, Expose>
}

function isCssProperty(name: string): boolean {
  return KNOWN_CSS_PROPERTIES.has(name.replace(/[A-Z]/g, upper => `-${upper.toLowerCase()}`))
}

type VanityAliasDefinitionGuard<Aliases extends Readonly<Record<string, VanityCssPropertyName>>> = {
  readonly [Alias in keyof Aliases]: Alias extends VanityCssPropertyName ? never : Aliases[Alias]
}

function stableFingerprint(config: VanityPropertyAliasConfig): string {
  return JSON.stringify({
    expose: config.expose,
    aliases: Object.fromEntries(Object.entries(config.aliases).sort(([a], [b]) => a.localeCompare(b))),
  })
}
