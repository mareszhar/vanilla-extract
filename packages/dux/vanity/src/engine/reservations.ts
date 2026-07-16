/** Versioned namespaces shared by engine extensions and finalized systems. */

export const VANITY_SYSTEM_SURFACE_VERSION = 1 as const

export const VANITY_SYSTEM_MEMBERS = Object.freeze([
  't',
  'css',
  'globalCss',
  'keyframes',
  'fontFace',
  'recipe',
  'anatomy',
  'port',
  'defineAtoms',
  'tokensOf',
  'namesOf',
  'varsOf',
  'tokenOverride',
  'runtime',
  'runtimeStyle',
  'runtimeProps',
  'reconcileRuntimeSnapshot',
  'serialize',
  'manifest',
  'explain',
  'audit',
  'conditions',
  'layers',
] as const)

export type VanitySystemMember = typeof VANITY_SYSTEM_MEMBERS[number]

export const VANITY_BUILTIN_CONSTRUCTOR_NAMES = Object.freeze([
  'alpha',
  'angle',
  'calc',
  'channel',
  'clamp',
  'color',
  'colorMix',
  'customProperty',
  'darken',
  'desaturate',
  'displayP3',
  'flex',
  'frequency',
  'fluid',
  'grid',
  'hsl',
  'hwb',
  'integer',
  'interpolate',
  'lab',
  'lch',
  'legibleOn',
  'length',
  'lighten',
  'max',
  'min',
  'mix',
  'number',
  'oklab',
  'oklch',
  'percent',
  'rawValue',
  'resolution',
  'rgb',
  'rotate',
  'saturate',
  'scheme',
  'time',
] as const)

export type VanityBuiltinConstructorName = typeof VANITY_BUILTIN_CONSTRUCTOR_NAMES[number]

const SYSTEM_MEMBER_SET: ReadonlySet<string> = new Set(VANITY_SYSTEM_MEMBERS)

export function assertSystemNamespaceAvailable(names: Iterable<string>, owner: string): void {
  for (const name of names) {
    if (SYSTEM_MEMBER_SET.has(name)) {
      throw new TypeError(
        `[vanity] ${owner} cannot define '${name}' because it is reserved by system surface v${VANITY_SYSTEM_SURFACE_VERSION}`,
      )
    }
  }
}
