<!-- components/AppButton.vue -->
<script setup lang="ts">
import { propsOf } from '@mszr/vane-dux/vue'
import { button } from './AppButton.style'

const props = defineProps({ ...propsOf(button), disabled: Boolean })
</script>

<template>
  <button :class="button(props)" :disabled="disabled">
    <slot />
  </button>
</template>
