import type { PluginOption } from 'vite'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

export type VaneIdentifierMode = 'debug' | 'short'
export type VaneCompilerMode = 'transform' | 'emitCss' | 'inlineCssInDev'

export interface VaneViteOptions {
  identifiers?: VaneIdentifierMode
  unstableMode?: VaneCompilerMode
}

export function vaneDuxPlugin(options: VaneViteOptions = {}): PluginOption[] {
  return vanillaExtractPlugin({
    identifiers: options.identifiers,
    unstable_mode: options.unstableMode,
  })
}

export const vanePlugin = vaneDuxPlugin
export default vaneDuxPlugin
