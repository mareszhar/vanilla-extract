<script setup lang="ts">
// The scheme dance, shipped by the module: the cookie is the state, the html
// attribute follows, SSR paints the forced scheme with no flash.
const scheme = useCookie<'light' | 'dark' | null>('vane-scheme')

const next = computed(() => (scheme.value === 'dark' ? 'light' : scheme.value === 'light' ? null : 'dark'))
const label = computed(() => (scheme.value === 'dark' ? 'Dark' : scheme.value === 'light' ? 'Light' : 'Auto'))

function cycle() {
  scheme.value = next.value
}
</script>

<template>
  <PrismButton intent="ghost" size="sm" @click="cycle">
    Scheme: {{ label }}
  </PrismButton>
</template>
