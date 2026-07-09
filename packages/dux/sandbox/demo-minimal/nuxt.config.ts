// The exact config from the README's "Start here" — one module, one line.
export default defineNuxtConfig({
  modules: ['@mszr/vane-dux/nuxt'],
  vane: { system: '~/design/system.style.ts' },
  compatibilityDate: '2026-07-09',
  devtools: { enabled: false },
})
