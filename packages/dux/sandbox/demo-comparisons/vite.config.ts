import { vaneDuxPlugin } from '@mszr/vane-dux/vite'
// Five styling stacks, one app: Tailwind rides its Vite plugin, Panda rides
// PostCSS (postcss.config.cjs), and vaneDuxPlugin serves both the vane-dux
// lane (*.style.ts) and the raw vanilla-extract lane (*.css.ts) — coexistence
// is the point ([dux-vision.md §7]).
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss(), vaneDuxPlugin()],
})
