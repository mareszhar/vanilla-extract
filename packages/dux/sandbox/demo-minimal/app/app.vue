<script setup lang="ts">
import { content, lede, page, row, title } from './app.style'

// The scheme dance, shipped by the module: writing the cookie is the whole
// toggle — SSR paints the forced scheme with no flash.
const scheme = useCookie<'light' | 'dark' | null>('vane-scheme')

function toggleScheme() {
  scheme.value = scheme.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div :class="page">
    <main :class="content">
      <h1 :class="title">vane-dux, minimal</h1>
      <p :class="lede">
        One system file, one component — and it already looks right in both schemes.
      </p>
      <div :class="row">
        <AppButton>Get started</AppButton>
        <AppButton intent="ghost">Read the docs</AppButton>
        <AppButton size="sm">Small</AppButton>
        <AppButton intent="ghost" size="sm" @click="toggleScheme">Toggle scheme</AppButton>
      </div>
    </main>
  </div>
</template>
