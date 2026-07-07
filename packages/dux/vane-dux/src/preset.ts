export interface VanePresetTokenOptions {
  brand?: string
}

export function presetTokens(options: VanePresetTokenOptions = {}) {
  return {
    color: {
      brand: options.brand ?? '#635bff',
    },
  } as const
}

export function presetConditions() {
  return {
    hover: { selector: '&:hover' },
    focusVisible: { selector: '&:focus-visible' },
    motionOk: { media: '(prefers-reduced-motion: no-preference)' },
    md: { media: '(width >= 48rem)' },
    lg: { media: '(width >= 64rem)' },
  } as const
}

export function atoms(): never {
  throw new Error('atoms is specified but not implemented yet; see phase 7 in docs/dux-vision.md.')
}
