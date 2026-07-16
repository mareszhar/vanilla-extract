<template lang="pug">
div(:class="parts.root")
  div(:class="parts.list" role="tablist")
    button(
      v-for="(item, index) in items"
      :key="item.label"
      :id="`prism-tab-${id}-${index}`"
      :class="parts.trigger"
      :data-selected="index === active ? '' : undefined"
      role="tab"
      :aria-selected="index === active"
      :aria-controls="`prism-panel-${id}`"
      :tabindex="index === active ? 0 : -1"
      @click="active = index"
      @keydown="onKeydown"
    ) {{ item.label }}
  p(
    :id="`prism-panel-${id}`"
    :class="parts.panel"
    role="tabpanel"
    :aria-labelledby="`prism-tab-${id}-${active}`"
  ) {{ items[active]?.content }}
</template>

<script setup lang="ts">
import { ref, useId } from 'vue'
import * as s from './PrismTabs.style'

const props = defineProps<{ items: { label: string, content: string }[] }>()

const active = ref(0)
const parts = useAnatomy(s.tabs)
const id = useId()

void props

function moveFocus(index: number): void {
  const count = props.items.length
  active.value = (index + count) % count
  document.getElementById(`prism-tab-${id}-${active.value}`)?.focus()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowRight')
    moveFocus(active.value + 1)
  else if (event.key === 'ArrowLeft')
    moveFocus(active.value - 1)
  else if (event.key === 'Home')
    moveFocus(0)
  else if (event.key === 'End')
    moveFocus(props.items.length - 1)
  else return

  event.preventDefault()
}
</script>
