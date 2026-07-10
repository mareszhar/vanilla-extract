<script setup lang="ts">
import { card } from '@prism/domain'
import PrismButton from './PrismButton.vue'

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <article class="card">
    <h3>{{ card.title }}</h3>
    <p>{{ card.body }}</p>
    <PrismButton size="sm" @click="emit('action')">{{ card.action }}</PrismButton>
  </article>
</template>

<style scoped>
.card {
  display: grid;
  gap: var(--sfc-space-sm);
  justify-items: start;
  padding: var(--sfc-space-md);
  background: var(--sfc-surface);
  border: 1px solid var(--sfc-border);
  border-radius: var(--sfc-radius-md);
}

.card h3 {
  margin: 0;
  font: 600 1.375rem/1.25 inherit;
  color: var(--sfc-ink);
}

.card p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--sfc-ink-muted);
}
</style>
