<template lang="pug">
button(:class="s.button(props)")
  slot
</template>

<script setup lang="ts">
// One source of truth: the recipe's variant space *is* the props declaration.
import * as s from './button.style'

const props = defineProps(propsOf(s.button))
</script>
