import { defineBuildConfig } from 'obuild/config'

const browserExternal = ['@vanilla-extract/css']
const viteExternal = ['@vanilla-extract/vite-plugin', 'vite']
const nuxtExternal = ['@nuxt/kit', 'nuxt', 'vite']
const vueExternal = ['vue']

export default defineBuildConfig({
  entries: [
    {
      type: 'bundle',
      input: ['./src/index.ts'],
      rolldown: {
        platform: 'neutral',
        external: browserExternal,
      },
    },
    {
      type: 'bundle',
      input: ['./src/runtime.ts'],
      rolldown: {
        platform: 'browser',
      },
    },
    {
      type: 'bundle',
      input: ['./src/vite.ts'],
      rolldown: {
        platform: 'node',
        external: viteExternal,
      },
    },
    {
      type: 'bundle',
      input: ['./src/vue.ts'],
      rolldown: {
        platform: 'browser',
        external: vueExternal,
      },
    },
    {
      type: 'bundle',
      input: ['./src/nuxt.ts'],
      rolldown: {
        platform: 'node',
        external: nuxtExternal,
      },
    },
    {
      type: 'bundle',
      input: ['./src/preset.ts'],
      rolldown: {
        platform: 'neutral',
        external: [...browserExternal, '@mszr/vane-dux'],
      },
    },
  ],
})
