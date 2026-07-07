export type VaneThemeValue = string | number
export interface VaneThemeInput {
  [key: string]: VaneThemeValue | VaneThemeInput
}
export type VaneRuntimeStyle = Record<`--${string}`, VaneThemeValue>

function flattenTheme(input: VaneThemeInput, path: string[] = [], out: VaneRuntimeStyle = {}): VaneRuntimeStyle {
  for (const [key, value] of Object.entries(input)) {
    const nextPath = [...path, key]

    if (value !== null && typeof value === 'object') {
      flattenTheme(value, nextPath, out)
    }
    else {
      out[`--vane-${nextPath.join('-')}`] = value
    }
  }

  return out
}

export function themeVars(input: VaneThemeInput): VaneRuntimeStyle {
  return flattenTheme(input)
}

export function applyTheme(element: HTMLElement, input: VaneThemeInput): void {
  for (const [name, value] of Object.entries(themeVars(input))) {
    element.style.setProperty(name, String(value))
  }
}

export function setScheme(element: HTMLElement, scheme: string): void {
  element.dataset.scheme = scheme
  element.style.colorScheme = scheme
}

export function ports(...styles: Array<VaneRuntimeStyle | false | null | undefined>): VaneRuntimeStyle {
  return Object.assign({}, ...styles.filter(Boolean))
}
