<script setup lang="ts">
import { card } from '@prism/domain'
import PrismButton from './PrismButton.vue'
</script>

<template>
  <article class="grid gap-2 justify-items-start p-4 bg-surface border border-edge rounded-md">
    <h3 class="m-0 text-[1.375rem]/[1.25] font-semibold text-ink">{{ card.title }}</h3>
    <p class="m-0 text-sm text-ink-muted">{{ card.body }}</p>
    <PrismButton size="sm">{{ card.action }}</PrismButton>
  </article>
</template>
