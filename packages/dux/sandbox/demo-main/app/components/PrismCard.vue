<script setup lang="ts">
import { card, cardBody, cardTitle, frame, swatch } from './PrismCard.style'

defineProps<{ title: string }>()
</script>

<template>
  <div :class="frame">
    <article :class="card">
      <div :class="swatch" />
      <div>
        <h3 :class="cardTitle">{{ title }}</h3>
        <p :class="cardBody"><slot /></p>
      </div>
    </article>
  </div>
</template>
