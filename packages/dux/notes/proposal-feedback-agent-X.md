# vane-dux proposal feedback - agent X

## Simulation

### 1. Hello world: one good-looking Button in Nuxt

```TS
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@mszr/vane-dux/nuxt'],
  vane: { system: '~/design/system.style.ts' },
})
```

```TS
// design/tokens.style.ts
import { defineTokens } from '@mszr/vane-dux'
import { presetTokens } from '@mszr/vane-dux/preset'

export const t = defineTokens({
  ...presetTokens({ brand: '#635bff', radius: 'calm', density: 'comfortable' }),
})
```

```TS
// design/system.style.ts
import { createSystem } from '@mszr/vane-dux'
import { presetConditions } from '@mszr/vane-dux/preset' // guess: docs imply this, exact name not shown
import { t } from './tokens.style'

export const { css, recipe, anatomy, port, theme } = createSystem({
  tokens: t,
  conditions: presetConditions,
  layers: ['reset', 'tokens', 'recipes', 'utilities', 'overrides'],
})
```

```TS
// components/AppButton.style.ts
import { recipe } from '~/design/system.style'
import { t } from '~/design/tokens.style'

export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: t.radius.md,
    paddingInline: t.space.md,
    minBlockSize: 40,
  },
  variants: {
    intent: {
      brand: { background: t.color.brand, color: t.color.onBrand },
      ghost: { background: 'transparent', color: t.color.ink },
    },
  },
  defaults: { intent: 'brand' },
})
```

```vue
<script setup lang="ts">
import { button } from './AppButton.style'
import type { VaneProps } from '@mszr/vane-dux'

const props = defineProps<VaneProps<typeof button>>()
</script>

<template>
  <button :class="button(props)">
    <slot />
  </button>
</template>
```

Reaction: the result is appealing, but the first five minutes are not yet delightful. I had to invent `presetConditions`, choose layers by hand, and create two design files before the first component. Once inside `recipe`, though, it clicks fast.

### 2. Common day-to-day task: real Button with style props plus normal props

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { button } from './Button.style'
import type { VaneProps } from '@mszr/vane-dux'

const props = defineProps<
  VaneProps<typeof button> & {
    disabled?: boolean
    loading?: boolean
  }
>()

// Guess: docs mention pick(props, button.variants), but do not show/import it.
const buttonClass = computed(() => button(pick(props, button.variants)))
</script>

<template>
  <button :class="buttonClass" :disabled="disabled || loading">
    <slot />
  </button>
</template>
```

Reaction: this is the first real snag. The docs show `button(props)` with extra `disabled`, but the recipes spec says extra keys are never silently ignored. That contradiction matters because every real component has non-style props. If I have to write or import `pick(props, button.variants)` on every component, I will quietly resent it by Day 50.

### 3. Slightly awkward edge case: parent themes child plus structural override

```TS
// Button.style.ts
export const buttonPorts = {
  gap: port<VaneLength>('gap', { default: t.space.xs }),
  radius: port<VaneLength>('radius', { default: t.radius.sm }),
}

export const button = recipe({
  base: {
    display: 'inline-flex',
    gap: buttonPorts.gap,
    borderRadius: buttonPorts.radius,
  },
})
```

```TS
// Toolbar.style.ts
import { css, within } from '~/design/system.style' // guess: within is specced, but not in createSystem list
import { t } from '~/design/tokens.style'
import { button, buttonPorts } from '../Button/Button.style'

export const toolbar = css({
  display: 'flex',
  gap: t.space.xs,
  ...buttonPorts.gap.set(t.space.xs),
  ...buttonPorts.radius.set(t.radius.pill),
})

export const joinedButtons = within(toolbar, {
  [button]: { marginInlineStart: 0 }, // guess: unclear whether recipe handles work as selector refs
})
```

Reaction: the port idea feels genuinely excellent. "Child declares what is themeable; parent sets values" is much nicer than `:deep()`. The stress point is documentation/API completeness: is `within` bound? Can a recipe be used as a child selector key, or only a plain `css()` style? This is exactly where delight depends on tiny details.

## Gut check

Excited, not merely satisfied. The docs have a strong point of view and the API has a real center of gravity: typed design intent in, boring CSS out, runtime values through ports. That is a coherent and compelling pitch.

But the first-user path is currently too tall. It reads like a brilliant system designed by someone who already knows why every piece exists. Delight needs one softer on-ramp.

## Delight moments

- "Tokens are a graph, not a bag of strings" is the best idea in the package. Property-access tokens plus derivation functions are immediately better than string token paths.
- `.live()` is excellent naming. It marks the consequence at the definition site, not at every usage.
- `port()` is the distinctive killer primitive. Replacing Vue `v-bind()`, `createVar` plumbing, `assignInlineVars`, parent-child theming, and arbitrary utility values with one typed exported handle is genuinely good design.
- Bare conditions with both directions feel good:

  ```TS
  hover: { background: t.color.surface }
  color: { base: t.color.ink, hover: t.color.brand }
  ```

- `VaneProps<typeof button>` is exactly the right promise. The recipe's variant space should become the component's style contract.
- `anatomy()` and "parts, not slots" is precise and humane for Vue users.

## Friction / dread moments

- The README has too many highlights before the happy path. I want to succeed before I admire the architecture.
- The preset API is underspecified where it matters most. The docs say preset conditions exist, but the copy-pasteable names are not shown.
- The `button(props)` story is currently inconsistent. This is the biggest practical paper cut: the README demonstrates passing the whole props object, while the recipe spec says excess keys are never silently ignored and recommends `button(pick(props, button.variants))`.
- `port<T>('name', { default })` feels more generic-heavy than necessary. The default should infer the type whenever possible:

  ```TS
  port('fraction', { default: 0 })
  port('radius', { default: t.radius.sm })
  ```

- Some helper names are specced but not visible in the main shape: `ports()`, `within()`, `fontFace()`, `defineAtoms()`, and maybe `presetConditions`. That makes the API feel slightly ghostly.

## Mental model

vane-dux is a typed design-system authoring layer where tokens, variants, anatomy, and conditions are authored as TypeScript, compiled to static CSS, and any real runtime value crosses through typed CSS-variable ports.

Think "vanilla-extract's build model, Stitches/Panda ergonomics, Vue-first runtime boundary, and a much smarter token graph."

## The first five minutes

Currently: install, configure Nuxt/Vite, define tokens, define system, define conditions/layers, write a style module, write a component. That is probably 20-30 minutes for a new user unless the starter path is extremely polished.

Where people bounce: choosing tokens/system/preset setup before they have seen a pixel.

## Day 50

Wears well: token property access, derivations, recipes, ports, typed conditions, provenance, boring CSS output.

Starts to grate: repeated `t` imports, repeated prop-picking, generic-heavy ports, and any ambiguity around "is this helper core, bound from system, preset, or runtime?"

## Compared to alternatives

Compared to vanilla-extract, vane-dux exceeds on token relationships, live derivations, conditions, ports, Vue ergonomics, and diagnostics ambition. It matches the good part: static CSS from real TypeScript execution.

Compared to Panda, it avoids generated-artifact ceremony and has a stronger runtime boundary story. Panda probably beats it today on obvious setup and known ecosystem shape.

Compared to Tailwind/Uno, vane-dux loses raw first-minute speed but wins hard on design-system semantics, refactors, and component contracts.

## One thing I'd cut, one thing I'd add

Cut the agent/introspection pitch from the top-level README highlights. Keep it in the docs, but do not spend first-impression oxygen there.

Add a blessed Vue recipe-props helper, and document it as the normal path:

```TS
const buttonProps = useVaneProps(button, props)
```

or make `button.props(props)` / `button.pick(props)` first-class.

## Delight score

8/10.

Single highest-leverage change: make the first five minutes brutally copy-pasteable with the preset path, including exact preset exports, exact system setup, and a real Button with non-style props. The core idea is delightful; the entrance needs to feel as designed as the engine.
