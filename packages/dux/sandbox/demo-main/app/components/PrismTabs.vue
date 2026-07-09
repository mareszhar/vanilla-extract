<script setup lang="ts">
import { tabs } from './PrismTabs.style'

const props = defineProps<{ items: { label: string, content: string }[] }>()

const active = ref(0)
const parts = useAnatomy(tabs)

void props
</script>

<template>
  <div :class="parts.root">
    <div :class="parts.list" role="tablist">
      <button
        v-for="(item, index) in items"
        :key="item.label"
        :class="parts.trigger"
        :data-selected="index === active ? '' : undefined"
        role="tab"
        :aria-selected="index === active"
        @click="active = index"
      >
        {{ item.label }}
      </button>
    </div>
    <p :class="parts.panel" role="tabpanel">
      {{ items[active]?.content }}
    </p>
  </div>
</template>
