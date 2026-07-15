<script setup lang="ts">
import {
  phase4Dark,
  phase4Fixture,
  phase4Light,
  phase4Probe,
} from './Phase4Fixture.style'
</script>

<template>
  <aside :class="phase4Fixture" data-phase4-root aria-hidden="true">
    <div data-phase4-group data-density="cozy" data-emphasis="normal">
      <span id="phase4-light" :class="[phase4Probe, phase4Light]">light</span>
      <span id="phase4-dark" :class="[phase4Probe, phase4Dark]">dark</span>
    </div>
  </aside>
</template>
