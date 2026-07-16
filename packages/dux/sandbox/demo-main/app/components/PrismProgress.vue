<template lang="pug">
div(:class="s.track" role="progressbar" :aria-valuenow="value" :aria-valuemax="max ?? 100")
  div(:class="s.fill" :style="fillStyle")
</template>

<script setup lang="ts">
import * as s from './PrismProgress.style'

const props = defineProps<{ value: number, max?: number }>()

// One port, one binding — Vue's `v-bind()` mental model, typed ([dux-spec-vue.md §1]).
const fillStyle = usePorts(() => [s.fraction.set(props.value / (props.max ?? 100))])
</script>
