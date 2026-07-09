<script setup lang="ts">
import { dialog } from './PrismDialog.style'

const props = defineProps({ ...propsOf(dialog), open: Boolean })

const emit = defineEmits<{ close: [] }>()

// `useAnatomy` keeps the part classes reactive ([dux-spec-vue.md §2]);
// we own this DOM, so we bind data-state ourselves ([dux-spec-recipes.md §5]).
const d = useAnatomy(dialog, props)
const state = computed(() => (props.open ? 'open' : 'closed'))
</script>

<template>
  <Teleport to="body">
    <template v-if="open">
      <div :class="d.backdrop" :data-state="state" @click="emit('close')" />
      <div :class="d.positioner" :data-state="state">
        <div :class="d.content" :data-state="state" role="dialog" aria-modal="true">
          <h2 :class="d.title"><slot name="title" /></h2>
          <slot />
          <div :class="d.close">
            <PrismButton intent="ghost" size="sm" @click="emit('close')">Close</PrismButton>
          </div>
        </div>
      </div>
    </template>
  </Teleport>
</template>
