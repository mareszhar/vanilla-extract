/**
 * The tasteful default atoms map ([dux-spec-preset.md §3]): pass it to your
 * system's `defineAtoms` — `export const atoms = defineAtoms(presetAtoms(t))`.
 * A plain config object over the preset token shape: extend it, prune it, or
 * write your own; the engine never knows the difference.
 */

import type { VaneAtomValue } from '../index'

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

interface VanePresetAtomsTokens {
  space: Record<string, VaneAtomValue>
  color: Record<string, VaneAtomValue>
  radius: Record<string, VaneAtomValue>
  font: Record<string, VaneAtomValue>
  shadow: Record<string, VaneAtomValue>
  z: Record<string, VaneAtomValue>
}

export function presetAtoms<
  Space extends VanePresetAtomsTokens['space'],
  Color extends VanePresetAtomsTokens['color'],
  Radius extends VanePresetAtomsTokens['radius'],
  Font extends VanePresetAtomsTokens['font'],
  Shadow extends VanePresetAtomsTokens['shadow'],
  Z extends VanePresetAtomsTokens['z'],
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
