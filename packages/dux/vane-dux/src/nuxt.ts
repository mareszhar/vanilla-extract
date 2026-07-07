import type { Plugin, PluginOption } from 'vite'
import type { VaneViteOptions } from './vite'
import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { vaneDuxPlugin } from './vite'

export interface VaneNuxtOptions extends VaneViteOptions {
  system?: string
}

export default defineNuxtModule<VaneNuxtOptions>({
  meta: {
    name: '@mszr/vane-dux',
    configKey: 'vane',
  },
  defaults: {},
  setup(options) {
    addVitePlugin(toVitePlugins(vaneDuxPlugin(options)))
  },
})

function toVitePlugins(options: PluginOption[]): Plugin[] {
  const plugins: Plugin[] = []

  for (const option of options) {
    collectVitePlugin(option, plugins)
  }

  return plugins
}

function collectVitePlugin(option: PluginOption, plugins: Plugin[]): void {
  if (Array.isArray(option)) {
    for (const nested of option) {
      collectVitePlugin(nested, plugins)
    }

    return
  }

  if (isVitePlugin(option)) {
    plugins.push(option)
  }
}

function isVitePlugin(option: unknown): option is Plugin {
  return typeof option === 'object' && option !== null && 'name' in option
}
