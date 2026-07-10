<script setup lang="ts">
import { card } from '@prism/domain'
import { card as cardClass, cardBody, cardTitle } from './prism.css'
import PrismButton from './PrismButton.vue'

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <article :class="cardClass">
    <h3 :class="cardTitle">{{ card.title }}</h3>
    <p :class="cardBody">{{ card.body }}</p>
    <PrismButton size="sm" @click="emit('action')">{{ card.action }}</PrismButton>
  </article>
</template>
