<template lang="pug">
div(:class="s.frame")
  article(:class="s.card")
    div(:class="s.swatch")
    div
      h3(:class="s.cardTitle") {{ title }}
      p(:class="s.cardBody")
        slot
</template>

<script setup lang="ts">
import * as s from './PrismCard.style'

defineProps<{ title: string }>()
</script>
