<script setup lang="ts">
// One port, one usePorts — the runtime boundary, typed.
import { usePorts } from '@mszr/vane-dux/vue'
import { fill, fraction, track } from './progress.style'

const props = defineProps<{ value: number }>()

const fillStyle = usePorts(() => [fraction.set(props.value / 100)])
</script>

<template>
  <div :class="track" role="progressbar" :aria-valuenow="props.value">
    <div :class="fill" :style="fillStyle" />
  </div>
</template>
