/**
 * Scale generators are ordinary functions producing token subtrees — nothing
 * about them is special-cased ([dux-spec-tokens.md §1]).
 */

export interface VaneLinearScale<Steps extends Record<string, number>> {
  unit: number
  steps: Steps
}

export interface VaneModularScale<Steps extends Record<string, number>> {
  /** The base size, in `unit`s. Defaults to 1. */
  base?: number
  ratio: number
  steps: Steps
  /** Defaults to `rem`. */
  unit?: string
}

export const scale = {
  /** `unit × step`, in px: `linear({ unit: 4, steps: { xs: 1, sm: 2 } })` → `{ xs: '4px', sm: '8px' }`. */
  linear<Steps extends Record<string, number>>({ unit, steps }: VaneLinearScale<Steps>): { [K in keyof Steps]: `${number}px` } {
    return mapSteps(steps, step => `${round(unit * step)}px` as `${number}px`)
  },

  /** `base × ratio^step`: `modular({ ratio: 1.25, steps: { md: 0, lg: 1 } })` → `{ md: '1rem', lg: '1.25rem' }`. */
  modular<Steps extends Record<string, number>>({ base = 1, ratio, steps, unit = 'rem' }: VaneModularScale<Steps>): { [K in keyof Steps]: string } {
    return mapSteps(steps, step => `${round(base * ratio ** step)}${unit}`)
  },
}

function mapSteps<Steps extends Record<string, number>, V>(steps: Steps, map: (step: number) => V): { [K in keyof Steps]: V } {
  return Object.fromEntries(Object.entries(steps).map(([key, step]) => [key, map(step)])) as { [K in keyof Steps]: V }
}

function round(value: number): number {
  return Math.round(value * 1e4) / 1e4
}
