<script setup lang="ts">
import { card } from '@prism/domain'
import { body, root, title } from './card.style'
import PrismButton from './PrismButton.vue'

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <article :class="root">
    <h3 :class="title">{{ card.title }}</h3>
    <p :class="body">{{ card.body }}</p>
    <PrismButton size="sm" @click="emit('action')">{{ card.action }}</PrismButton>
  </article>
</template>
