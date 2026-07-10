<script setup lang="ts">
// The recipe types its variants, but the props must be restated by hand —
// nothing projects the variant space into defineProps.
import type { ButtonProps } from '@prism/domain'
import { computed } from 'vue'
import { button } from './prism.css'

const props = withDefaults(defineProps<ButtonProps>(), { intent: 'brand', size: 'md', pill: false })

const classes = computed(() => button({ intent: props.intent, size: props.size, pill: props.pill }))
</script>

<template>
  <button :class="classes">
    <slot />
  </button>
</template>
