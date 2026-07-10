<script setup lang="ts">
import { t } from '~/design/tokens.style'
import { colorInput, field, fieldLabel } from '../app.style'

// Gauntlet moment 3: the user picks a brand color and every surface, hover,
// tint, and pairing re-derives in the browser's cascade — one live-variable
// write, zero JS color math (`applyTheme` is auto-imported from /runtime).
const brand = ref('#635bff')

watch(brand, (picked) => {
  if (import.meta.client)
    applyTheme(document.documentElement, t, { color: { brand: picked } })
}, { immediate: true })
</script>

<template>
  <label :class="field">
    <span :class="fieldLabel">Brand</span>
    <input v-model="brand" :class="colorInput" type="color" aria-label="Pick the brand color">
  </label>
</template>
