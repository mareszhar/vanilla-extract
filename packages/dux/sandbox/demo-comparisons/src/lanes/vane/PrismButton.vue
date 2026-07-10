<script setup lang="ts">
// One source of truth: the recipe's variant space *is* the props declaration.
import { propsOf } from '@mszr/vane-dux/vue'
import { button } from './button.style'

const props = defineProps(propsOf(button))
</script>

<template>
  <button :class="button(props)">
    <slot />
  </button>
</template>
