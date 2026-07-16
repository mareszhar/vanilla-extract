<template lang="pug">
div(:class="s.track" role="progressbar" :aria-valuenow="props.value")
  div(:class="s.fill" :style="fillStyle")
</template>

<script setup lang="ts">
// One port, one usePorts — the runtime boundary, typed.
import * as s from './progress.style'

const props = defineProps<{ value: number }>()

const fillStyle = usePorts(() => [s.fraction.set(props.value / 100)])
</script>
