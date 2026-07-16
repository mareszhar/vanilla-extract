<template lang="pug">
Teleport(to="body")
  template(v-if="props.open")
    div(:class="d.backdrop" :data-state="state" @click="emit('close')")
    div(:class="d.positioner" :data-state="state")
      div(ref="content" :class="d.content" :data-state="state" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" @keydown.esc="emit('close')")
        h2(:id="titleId" :class="d.title")
          slot(name="title")
        slot
        div(:class="d.close")
          PrismButton(intent="ghost" size="sm" @click="emit('close')") Close
</template>

<script setup lang="ts">
import * as s from './PrismDialog.style'

const props = defineProps({ ...propsOf(s.dialog), open: Boolean })

const emit = defineEmits<{ close: [] }>()

// `useAnatomy` keeps the part classes reactive ([dux-spec-vue.md §2]);
// we own this DOM, so we bind data-state ourselves ([dux-spec-recipes.md §5]).
const d = useAnatomy(s.dialog, props)
const state = computed(() => (props.open ? 'open' : 'closed'))
const content = ref<HTMLElement>()
const titleId = `prism-dialog-${useId()}`
let restoreFocus: HTMLElement | undefined

watch(() => props.open, async (open) => {
  if (open) {
    restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    await nextTick()
    content.value?.focus()
  }
  else {
    restoreFocus?.focus()
    restoreFocus = undefined
  }
})

onBeforeUnmount(() => restoreFocus?.focus())
</script>
