/**
 * The Nuxt module ([dux-spec-vue.md §4]): wires the `/vite` plugin, extends
 * auto-imports to the system's bound functions — in app code *and* inside
 * evaluated style modules, where the two-imports-per-file tax matters most —
 * and ships the SSR scheme recipe (cookie + `data-scheme`), the standard dance
 * no zero-runtime system escapes. One component in an existing Nuxt app can
 * adopt vane-dux with this module and one `.style.ts` file — no migration.
 *
 * The Nuxt DevTools tab is the `/vite` plugin's manifest view (`/__vane/`)
 * embedded — one implementation serves plain Vite and Nuxt alike
 * ([dux-spec-introspection.md §2]).
 */

import type { Plugin, PluginOption } from 'vite'
import type { VaneAutoImports, VaneViteOptions } from './vite'
import { readFileSync } from 'node:fs'
import { addImportsSources, addPluginTemplate, addVitePlugin, defineNuxtModule, resolveAlias } from '@nuxt/kit'
import { styleExportNames, vaneDuxPlugin } from './vite'

export interface VaneNuxtOptions extends Omit<VaneViteOptions, 'autoImports'> {
  /**
   * The system style module (`~/design/system.style.ts`). Its exported bound
   * functions and `t` become auto-imports — reaching `*.style.ts` files too.
   */
  system?: string
}

/**
 * A user-forced scheme rides a cookie so SSR paints the right mode with no
 * flash ([dux-spec-vue.md §5], [dux-spec-tokens.md §3]). Toggling is writing
 * the cookie — `useCookie('vane-scheme').value = 'dark'` — the `html`
 * attribute follows reactively, and the emitted `[data-scheme]` scopes pin
 * `color-scheme`. Clear it back to null to follow the OS preference.
 */
const SCHEME_PLUGIN = `
import { defineNuxtPlugin, useCookie, useHead } from '#imports'

export default defineNuxtPlugin(() => {
  const scheme = useCookie('vane-scheme', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

  useHead({
    htmlAttrs: {
      'data-scheme': () => (scheme.value === 'light' || scheme.value === 'dark' ? scheme.value : undefined),
    },
  })
})
`

export default defineNuxtModule<VaneNuxtOptions>({
  meta: {
    name: '@mszr/vane-dux',
    configKey: 'vane',
  },
  defaults: {},
  setup(options, nuxt) {
    const { system, ...viteOptions } = options
    let autoImports: VaneAutoImports | undefined

    if (system) {
      const from = resolveAlias(system, nuxt.options.alias)
      const names = styleExportNames(readSystemModule(from))

      if (names.length > 0) {
        addImportsSources({ from, imports: names })
        autoImports = { from, names }
      }
    }

    // The overlay composables and runtime helpers ride auto-imports too.
    addImportsSources({ from: '@mszr/vane-dux/vue', imports: ['propsOf', 'useAnatomy', 'usePorts'] })
    addImportsSources({ from: '@mszr/vane-dux/runtime', imports: ['applyTheme', 'setScheme', 'ports'] })

    addVitePlugin(toVitePlugins(vaneDuxPlugin({ ...viteOptions, autoImports })))

    addPluginTemplate({
      filename: 'vane-scheme.mjs',
      getContents: () => SCHEME_PLUGIN,
    })

    // The DevTools tab: token browser, recipe/anatomy inspector, ports,
    // escapes — the manifest view the /vite plugin serves in dev.
    if (nuxt.options.dev) {
      nuxt.hook('devtools:customTabs' as never, ((tabs: unknown[]) => {
        tabs.push({
          name: 'vane-dux',
          title: 'vane-dux',
          icon: 'i-carbon-color-palette',
          view: { type: 'iframe', src: '/__vane/' },
        })
      }) as never)
    }
  },
})

function readSystemModule(from: string): string {
  try {
    return readFileSync(from, 'utf-8')
  }
  catch {
    throw new Error(
      `[vane] the configured system module does not exist: ${from}\n`
      + `  fix: point vane.system at your system style module — e.g. system: '~/design/system.style.ts'`,
    )
  }
}

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
