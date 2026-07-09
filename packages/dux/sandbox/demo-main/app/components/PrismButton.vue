<script setup lang="ts">
import { button } from './PrismButton.style'

// One source of truth: the recipe's variant space is the props declaration
// (`propsOf` is auto-imported from @mszr/vane-dux/vue).
const props = defineProps({ ...propsOf(button), disabled: Boolean })
</script>

<template>
  <button :class="button(props)" :disabled="disabled">
    <slot />
  </button>
</template>
