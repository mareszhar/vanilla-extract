/**
 * Internal characterization surface for pre-engine regression fixtures.
 *
 * Phase 9 intentionally removed these adapters from the package root. A small
 * number of low-level fixtures still exercise the inherited resolver and
 * serializer directly while their canonical replacements live beside them.
 * Keeping that distinction local prevents test mechanics from becoming a
 * second public authoring dialect.
 */

import { createEngine } from '@mszr/vane-dux'

export { aria, container, data, media, schemeIs, supports } from '../system/conditions'
export { check } from '../tokens/checks'
export { defineTokens } from '../tokens/graph'
export { scale } from '../tokens/scale'
export { theme } from '../tokens/theme'
export {
  alpha,
  defaultAngle as angle,
  calc,
  defaultChannel as channel,
  clamp,
  color,
  colorMix,
  defaultCustomProperty as customProperty,
  darken,
  defaultDefineCssOperation as defineCssOperation,
  defaultDefineCssValue as defineCssValue,
  desaturate,
  displayP3,
  defaultFlex as flex,
  fluid,
  defaultFrequency as frequency,
  grid,
  hsl,
  hwb,
  defaultInteger as integer,
  interpolate,
  lab,
  lch,
  legibleOn,
  defaultLength as length,
  lighten,
  max,
  min,
  mix,
  defaultNumber as number,
  oklab,
  oklch,
  defaultPercent as percent,
  defaultRawValue as rawValue,
  defaultResolution as resolution,
  rgb,
  rotate,
  saturate,
  scheme,
  defaultTime as time,
} from '../values/defaultEngine'
export * from '@mszr/vane-dux'

const engine = createEngine()

/** Raw-token canonical system factory for inherited domain fixtures. */
export const createSystem = engine.createSystem
