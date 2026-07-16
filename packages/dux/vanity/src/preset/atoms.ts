/**
 * The tasteful default atoms map ([vanity-spec-preset.md §3]): pass it to your
 * system's `defineAtoms` — `export const atoms = defineAtoms(presetAtoms(t))`.
 * A plain config object over the preset token shape: extend it, prune it, or
 * write your own; the engine never knows the difference.
 */

import type { VanityAtomValue } from '@mszr/vanity'

// Module-scope `as const` tables — their literal types reach call sites
// untouched, and the generic return type stays a pure function of the graph.

const keywordValues = {
  display: ['none', 'block', 'flex', 'grid', 'inline-flex'],
  flexDirection: ['row', 'column'],
  flexWrap: ['wrap', 'nowrap'],
  alignItems: ['start', 'center', 'end', 'stretch', 'baseline'],
  justifyContent: ['start', 'center', 'end', 'space-between'],
  textAlign: ['start', 'center', 'end'],
} as const

const shorthands = {
  p: 'padding',
  px: 'paddingInline',
  py: 'paddingBlock',
  m: 'margin',
  mx: 'marginInline',
  my: 'marginBlock',
  bg: 'background',
  rounded: 'borderRadius',
  shadow: 'boxShadow',
  z: 'zIndex',
} as const

const toggles = {
  stack: { display: 'flex', flexDirection: 'column' },
  center: { display: 'grid', placeItems: 'center' },
} as const

/** The responsive lane: every property gets its breakpoint arms, bounded. */
const conditions = ['sm', 'md', 'lg', 'xl', '2xl'] as const

interface VanityPresetAtomsTokens {
  space: Record<string, VanityAtomValue>
  color: Record<string, VanityAtomValue>
  radius: Record<string, VanityAtomValue>
  font: Record<string, VanityAtomValue>
  shadow: Record<string, VanityAtomValue>
  z: Record<string, VanityAtomValue>
}

export function presetAtoms<
  Space extends VanityPresetAtomsTokens['space'],
  Color extends VanityPresetAtomsTokens['color'],
  Radius extends VanityPresetAtomsTokens['radius'],
  Font extends VanityPresetAtomsTokens['font'],
  Shadow extends VanityPresetAtomsTokens['shadow'],
  Z extends VanityPresetAtomsTokens['z'],
>(t: { space: Space, color: Color, radius: Radius, font: Font, shadow: Shadow, z: Z }) {
  const { space, color, radius, font, shadow, z } = t

  return {
    properties: {
      ...keywordValues,
      gap: space,
      padding: space,
      paddingInline: space,
      paddingBlock: space,
      margin: space,
      marginInline: space,
      marginBlock: space,
      color,
      background: color,
      borderRadius: radius,
      fontFamily: font,
      boxShadow: shadow,
      zIndex: z,
    },
    shorthands,
    toggles,
    conditions,
  }
}
