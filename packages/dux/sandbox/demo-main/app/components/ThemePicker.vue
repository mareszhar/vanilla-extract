<script setup lang="ts">
import { t } from '~/design/tokens.style'
import { colorInput, field, fieldLabel } from '../app.style'

// Gauntlet moment 3: the user picks a brand color and every surface, hover,
// tint, and pairing re-derives in the browser's cascade — one live-variable
// write, zero JS color math (`applyTheme` is auto-imported from /runtime).
// The authored stylesheet remains authoritative until the user actually picks.
// Native color inputs require an sRGB hex preview; the browser test keeps this
// exact representation in sync with the authored OKLCH seed.
const brand = ref('#735fe9')

function pickBrand(event: Event) {
  const picked = (event.currentTarget as HTMLInputElement).value
  brand.value = picked

  if (import.meta.client)
    applyTheme(document.documentElement, t, { color: { brand: picked } })
}
</script>

<template>
  <label :class="field">
    <span :class="fieldLabel">Brand</span>
    <input :value="brand" :class="colorInput" type="color" aria-label="Pick the brand color" @input="pickBrand">
  </label>
</template>
