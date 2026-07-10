<script setup lang="ts">
// A reactive value can't be a utility class, so the width falls back to an
// inline style — the utility model goes blind at the runtime boundary.
import { computed } from 'vue'

const props = defineProps<{ value: number }>()
const fillStyle = computed(() => ({ width: `${props.value}%` }))
</script>

<template>
  <div class="bg-surface h-2 rounded-full overflow-hidden" role="progressbar" :aria-valuenow="props.value">
    <div class="h-full bg-brand transition-[width] duration-200" :style="fillStyle" />
  </div>
</template>
