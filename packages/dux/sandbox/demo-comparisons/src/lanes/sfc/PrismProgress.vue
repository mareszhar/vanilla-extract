<script setup lang="ts">
// `v-bind()` in CSS — the SFC model's reactive-value feature: stringly,
// SFC-only, invisible to rename and find-references.
import { computed } from 'vue'

const props = defineProps<{ value: number }>()
const width = computed(() => `${props.value}%`)
</script>

<template>
  <div class="track" role="progressbar" :aria-valuenow="props.value">
    <div class="fill" />
  </div>
</template>

<style scoped>
.track {
  background: var(--sfc-surface);
  block-size: var(--sfc-space-sm);
  border-radius: var(--sfc-radius-pill);
  overflow: hidden;
}

.fill {
  inline-size: v-bind(width);
  block-size: 100%;
  background: var(--sfc-brand);
  transition: inline-size 200ms ease;
}
</style>
