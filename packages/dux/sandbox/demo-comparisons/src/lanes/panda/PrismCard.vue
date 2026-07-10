<script setup lang="ts">
import { card } from '@prism/domain'
import { css } from '../../../styled-system/css'
import PrismButton from './PrismButton.vue'

const root = css({
  display: 'grid',
  gap: 'sm',
  justifyItems: 'start',
  padding: 'md',
  background: 'surface',
  border: '1px solid token(colors.border)',
  borderRadius: 'md',
})

const title = css({ margin: 0, fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 600, color: 'ink' })
const body = css({ margin: 0, fontSize: '0.875rem', color: 'inkMuted' })
</script>

<template>
  <article :class="root">
    <h3 :class="title">{{ card.title }}</h3>
    <p :class="body">{{ card.body }}</p>
    <PrismButton size="sm">{{ card.action }}</PrismButton>
  </article>
</template>
