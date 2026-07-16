<template lang="pug">
button(:class="s.button(props)" :disabled="props.disabled")
  slot
</template>

<script setup lang="ts">
import * as s from './PrismButton.style'

// One source of truth: the recipe's variant space is the props declaration
// (`propsOf` is auto-imported from @mszr/vane-dux/vue).
const props = defineProps({ ...propsOf(s.button), disabled: Boolean })
</script>
