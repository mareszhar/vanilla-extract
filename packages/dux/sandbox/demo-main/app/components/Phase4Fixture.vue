<template lang="pug">
aside(:class="s.phase4Fixture" data-phase4-root aria-hidden="true")
  div(data-phase4-group data-density="cozy" data-emphasis="normal")
    span#phase4-light(:class="[s.phase4Probe, s.phase4Light]") light
    span#phase4-dark(:class="[s.phase4Probe, s.phase4Dark]") dark
</template>

<script setup lang="ts">
import * as s from './Phase4Fixture.style'
</script>
