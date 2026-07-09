<script setup lang="ts">
import { fill, fraction, track } from './PrismProgress.style'

const props = defineProps<{ value: number, max?: number }>()

// One port, one binding — Vue's `v-bind()` mental model, typed ([dux-spec-vue.md §1]).
const fillStyle = usePorts(() => [fraction.set(props.value / (props.max ?? 100))])
</script>

<template>
  <div :class="track" role="progressbar" :aria-valuenow="value" :aria-valuemax="max ?? 100">
    <div :class="fill" :style="fillStyle" />
  </div>
</template>
