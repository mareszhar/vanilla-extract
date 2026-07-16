/**
 * The Nuxt module ([vanity-spec-vue.md §4]): wires the `/vite` plugin, injects
 * the configured system's bound functions into evaluated style modules, and
 * ships the SSR scheme recipe (cookie + `data-scheme`). It deliberately does
 * not register application auto-imports; that remains the Nuxt app's choice.
 *
 * The Nuxt DevTools tab is the `/vite` plugin's manifest view (`/__vanity/`)
 * embedded — one implementation serves plain Vite and Nuxt alike
 * ([vanity-spec-introspection.md §2]).
 */

import type { Plugin, PluginOption } from 'vite'
import type { VanityAutoImports, VanityViteOptions } from './vite'
import { readFileSync } from 'node:fs'
import { addPluginTemplate, addVitePlugin, defineNuxtModule, resolveAlias } from '@nuxt/kit'
import { protectRelativeColorSyntax } from './nuxt/postcss'
import { styleExportNames, vanityPlugin } from './vite'

/**
 * Optional application auto-imports for Vue-facing Vanity helpers.
 *
 * Nothing registers these implicitly. A Nuxt app opts in visibly:
 *
 * `imports: { presets: [...vanityNuxtImports] }`
 */
export const vanityNuxtImports = [
  {
    from: '@mszr/vanity/vue',
    imports: ['propsOf', 'useAnatomy', 'usePorts'],
  },
  {
    from: '@mszr/vanity/runtime',
    imports: ['ports', 'setCustomProperties', 'setCustomProperty'],
  },
]

export interface VanityNuxtOptions extends Omit<VanityViteOptions, 'autoImports'> {
  /**
   * The system style module (`~/design/system.style.ts`). Its exports are
   * available to the style-module injection shim when `styleAutoImports` is
   * enabled; application auto-imports are configured by the Nuxt app itself.
   */
  system?: string
  /** Opt into unbound system exports inside evaluated `*.style.ts` files. */
  styleAutoImports?: boolean
}

/**
 * A user-forced scheme rides a cookie so SSR paints the right mode with no
 * flash ([vanity-spec-vue.md §5], [vanity-spec-tokens.md §3]). Toggling is writing
 * the cookie — `useCookie('vanity-scheme').value = 'dark'` — the `html`
 * attribute follows reactively, and the emitted `[data-scheme]` scopes pin
 * `color-scheme`. Clear it back to null to follow the OS preference.
 */
const SCHEME_PLUGIN = `
import { defineNuxtPlugin, useCookie, useHead } from '#imports'

export default defineNuxtPlugin(() => {
  const scheme = useCookie('vanity-scheme', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

  useHead({
    htmlAttrs: {
      'data-scheme': () => (scheme.value === 'light' || scheme.value === 'dark' ? scheme.value : undefined),
    },
  })
})
`

export default defineNuxtModule<VanityNuxtOptions>({
  meta: {
    name: '@mszr/vanity',
    configKey: 'vanity',
  },
  defaults: {},
  setup(options, nuxt) {
    const { system, styleAutoImports = false, ...viteOptions } = options
    let autoImports: VanityAutoImports | undefined

    if (system && styleAutoImports) {
      const from = resolveAlias(system, nuxt.options.alias)
      const names = styleExportNames(readSystemModule(from))

      if (names.length > 0)
        autoImports = { from, names }
    }

    // TypeScript cannot natively connect an inferred mapped token handle back
    // to its object-literal definition for rename-symbol. The bundled plugin
    // supplies those graph-aware locations; Nuxt users pay no setup tax.
    installTypescriptPlugin(nuxt.options.typescript.tsConfig as VanityTsConfig)

    // Nuxt's production cssnano default uses a calc parser that rejects CSS
    // relative-color channel identifiers. Keep every safe minification pass,
    // but preserve these standards-valid expressions byte-for-byte.
    protectRelativeColorSyntax(nuxt.options.postcss)

    addVitePlugin(toVitePlugins(vanityPlugin({ ...viteOptions, autoImports })))

    addPluginTemplate({
      filename: 'vanity-scheme.mjs',
      getContents: () => SCHEME_PLUGIN,
    })

    // The DevTools tab: token browser, recipe/anatomy inspector, ports,
    // escapes — the manifest view the /vite plugin serves in dev.
    if (nuxt.options.dev) {
      nuxt.hook('devtools:customTabs' as never, ((tabs: unknown[]) => {
        tabs.push({
          name: 'vanity',
          title: 'vanity',
          icon: 'i-carbon-color-palette',
          view: { type: 'iframe', src: '/__vanity/' },
        })
      }) as never)
    }
  },
})

interface VanityTsConfig {
  compilerOptions?: {
    plugins?: Array<{ name: string } & Record<string, unknown>>
    [key: string]: unknown
  }
  [key: string]: unknown
}

function installTypescriptPlugin(tsconfig: VanityTsConfig): void {
  const compilerOptions = tsconfig.compilerOptions ??= {}
  const plugins = compilerOptions.plugins ??= []

  if (!plugins.some(plugin => plugin.name === '@mszr/vanity/typescript'))
    plugins.push({ name: '@mszr/vanity/typescript' })
}

function readSystemModule(from: string): string {
  try {
    return readFileSync(from, 'utf-8')
  }
  catch {
    throw new Error(
      `[vanity] the configured system module does not exist: ${from}\n`
      + `  fix: point vanity.system at your system style module — e.g. system: '~/design/system.style.ts'`,
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
