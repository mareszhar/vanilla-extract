<template lang="pug">
aside(:class="s.axisFixture" data-axis-fixture-root aria-hidden="true")
  div(data-axis-fixture-group data-density="cozy" data-emphasis="normal")
    span#axis-fixture-light(:class="[s.axisProbe, s.axisLight]") light
    span#axis-fixture-dark(:class="[s.axisProbe, s.axisDark]") dark
</template>

<script setup lang="ts">
import * as s from './AxisFixture.style'
</script>
