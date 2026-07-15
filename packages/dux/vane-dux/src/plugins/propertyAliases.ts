/** Typed CSS-property aliases implemented as an ordinary engine plugin. */

import type { VaneCssPropertyName } from '../css/types'
import type { VaneEnginePlugin } from '../engine/createEngine'
import { all as knownCssProperties } from 'known-css-properties'
import { defineEnginePlugin } from '../engine/createEngine'

const KNOWN_CSS_PROPERTIES = new Set(knownCssProperties)

export type VanePropertyAliasExposure = 'both' | 'aliases-only'

export interface VanePropertyAliasOptions<Expose extends VanePropertyAliasExposure = 'both'> {
  readonly expose?: Expose
}

export interface VanePropertyAliasConfig<
  Aliases extends Readonly<Record<string, VaneCssPropertyName>> = Readonly<Record<string, VaneCssPropertyName>>,
  Expose extends VanePropertyAliasExposure = VanePropertyAliasExposure,
> {
  readonly aliases: Aliases
  readonly expose: Expose
}

/** Internal capability carrier. It is a symbol so the plugin adds no fake daily constructor. */
export const VANE_PROPERTY_ALIASES: unique symbol = Symbol.for('vane.propertyAliases') as any
export const VANE_PROPERTY_ALIAS_PLUGIN: unique symbol = Symbol.for('vane.propertyAliasPlugin') as any

export interface VanePropertyAliasContribution<
  Aliases extends Readonly<Record<string, VaneCssPropertyName>>,
  Expose extends VanePropertyAliasExposure,
> {
  readonly [VANE_PROPERTY_ALIASES]: VanePropertyAliasConfig<Aliases, Expose>
}

export interface VanePropertyAliasPlugin<
  Aliases extends Readonly<Record<string, VaneCssPropertyName>>,
  Expose extends VanePropertyAliasExposure,
> extends VaneEnginePlugin<VanePropertyAliasContribution<Aliases, Expose>, object> {
  readonly [VANE_PROPERTY_ALIAS_PLUGIN]: Expose
}

export type VaneAliasesOf<Constructors extends object>
  = typeof VANE_PROPERTY_ALIASES extends keyof Constructors
    ? Constructors[typeof VANE_PROPERTY_ALIASES] extends VanePropertyAliasConfig<infer Aliases, any>
      ? Aliases
      : Record<never, never>
    : Record<never, never>

export type VaneAliasExposureOf<Constructors extends object>
  = typeof VANE_PROPERTY_ALIASES extends keyof Constructors
    ? Constructors[typeof VANE_PROPERTY_ALIASES] extends VanePropertyAliasConfig<any, infer Expose>
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
  const Aliases extends Readonly<Record<string, VaneCssPropertyName>>,
  const Expose extends VanePropertyAliasExposure = 'both',
>(
  aliases: Aliases & VaneAliasDefinitionGuard<Aliases>,
  options: VanePropertyAliasOptions<Expose> = {},
): VanePropertyAliasPlugin<Aliases, Expose> {
  const expose = options.expose ?? 'both' as Expose
  const entries = Object.entries(aliases)

  if (entries.length === 0)
    throw new TypeError('[vane] propertyAliases() needs at least one alias')

  for (const [alias, property] of entries) {
    if (!/^[$A-Z_][$\w-]*$/i.test(alias))
      throw new TypeError(`[vane] property alias '${alias}' is not a usable object key`)
    if (alias.startsWith('--') || isCssProperty(alias))
      throw new TypeError(`[vane] property alias '${alias}' collides with standard CSS vocabulary`)
    if (!isCssProperty(property))
      throw new TypeError(`[vane] property alias '${alias}' targets unknown CSS property '${property}'`)
  }

  const normalized = Object.freeze({ ...aliases }) as Aliases
  const config = Object.freeze({ aliases: normalized, expose })
  const fingerprint = stableFingerprint(config)

  return defineEnginePlugin<VanePropertyAliasContribution<Aliases, Expose>, object>({
    id: 'org.vane-dux.plugin.property-aliases',
    version: 1,
    fingerprint,
    [VANE_PROPERTY_ALIAS_PLUGIN]: expose,
    setup: () => Object.freeze({
      [VANE_PROPERTY_ALIASES]: config,
    }) as VanePropertyAliasContribution<Aliases, Expose>,
  } as VanePropertyAliasPlugin<Aliases, Expose>) as VanePropertyAliasPlugin<Aliases, Expose>
}

function isCssProperty(name: string): boolean {
  return KNOWN_CSS_PROPERTIES.has(name.replace(/[A-Z]/g, upper => `-${upper.toLowerCase()}`))
}

type VaneAliasDefinitionGuard<Aliases extends Readonly<Record<string, VaneCssPropertyName>>> = {
  readonly [Alias in keyof Aliases]: Alias extends VaneCssPropertyName ? never : Aliases[Alias]
}

function stableFingerprint(config: VanePropertyAliasConfig): string {
  return JSON.stringify({
    expose: config.expose,
    aliases: Object.fromEntries(Object.entries(config.aliases).sort(([a], [b]) => a.localeCompare(b))),
  })
}
