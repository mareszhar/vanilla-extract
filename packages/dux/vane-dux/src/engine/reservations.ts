/** Versioned namespaces shared by engine extensions and finalized systems. */

export const VANE_SYSTEM_SURFACE_VERSION = 1 as const

export const VANE_SYSTEM_MEMBERS = Object.freeze([
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

export type VaneSystemMember = typeof VANE_SYSTEM_MEMBERS[number]

export const VANE_BUILTIN_CONSTRUCTOR_NAMES = Object.freeze([
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

export type VaneBuiltinConstructorName = typeof VANE_BUILTIN_CONSTRUCTOR_NAMES[number]

const SYSTEM_MEMBER_SET: ReadonlySet<string> = new Set(VANE_SYSTEM_MEMBERS)

export function assertSystemNamespaceAvailable(names: Iterable<string>, owner: string): void {
  for (const name of names) {
    if (SYSTEM_MEMBER_SET.has(name)) {
      throw new TypeError(
        `[vane] ${owner} cannot define '${name}' because it is reserved by system surface v${VANE_SYSTEM_SURFACE_VERSION}`,
      )
    }
  }
}
