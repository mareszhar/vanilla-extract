<script setup lang="ts">
// The var + assignInlineVars plumbing, rebuilt per component — the shape
// vane-dux collapses into port() + usePorts.
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { computed } from 'vue'
import { fill, fillFraction, track } from './prism.css'

const props = defineProps<{ value: number }>()

const fillStyle = computed(() => assignInlineVars({ [fillFraction]: String(props.value / 100) }))
</script>

<template>
  <div :class="track" role="progressbar" :aria-valuenow="props.value">
    <div :class="fill" :style="fillStyle" />
  </div>
</template>
