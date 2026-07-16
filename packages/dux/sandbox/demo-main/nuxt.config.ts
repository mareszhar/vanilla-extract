export default defineNuxtConfig({
  modules: ['@mszr/vane-dux/nuxt'],
  vane: { system: '~/design/system.style.ts' },
  compatibilityDate: '2026-07-09',
  devtools: { enabled: false },
  typescript: {
    strict: true,
    tsConfig: {
      vueCompilerOptions: {
        plugins: ['@vue/language-plugin-pug'],
      },
    },
  },
  watchers: process.env.CHOKIDAR_USEPOLLING === 'true'
    ? { chokidar: { usePolling: true, interval: Number(process.env.CHOKIDAR_INTERVAL ?? 100) } }
    : undefined,
  vite: process.env.CHOKIDAR_USEPOLLING === 'true'
    ? { server: { watch: { usePolling: true, interval: Number(process.env.CHOKIDAR_INTERVAL ?? 100) } } }
    : undefined,
})
