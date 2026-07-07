# Vane-Dux API Design Feedback & Simulation Report

This document contains a comprehensive review and API simulation of the proposed **vane-dux** styling system based on the draft specifications.

---

## 1. Simulation: Testing the API against 3 Tasks

To evaluate vane-dux in practice, we simulate three tasks ranging from a basic setup to an advanced component with complex dynamic behaviors.

### Task 1: "Hello World" (First Five Minutes)

*Goal: Install, define a basic token set, write a scoped style for a simple Card component, and consume it inside a Vue SFC.*

#### Step-by-Step Code

```TS
// 1. design/tokens.style.ts
import { defineTokens } from '@mszr/vane-dux'

export const t = defineTokens({
  color: {
    brand: '#635bff',
    ink: '#1c1c1e',
    canvas: '#ffffff',
  },
  font: {
    sans: 'Inter, sans-serif',
  },
  text: {
    body: { fontSize: '1rem', lineHeight: '1.5', fontWeight: '400' },
  },
  space: {
    md: '16px',
  },
  radius: {
    md: '8px',
  }
})
```

```TS
// 2. design/system.style.ts
import { createSystem } from '@mszr/vane-dux'
import { t } from './tokens.style'

export const { css } = createSystem({
  tokens: t,
  prefix: 'prism',
})
```

```TS
// 3. components/AppCard.style.ts
import { css } from '../design/system.style'
import { t } from '../design/tokens.style'

export const card = css({
  ...t.text.body,
  padding: t.space.md,
  background: t.color.canvas,
  color: t.color.ink,
  fontFamily: t.font.sans,
  border: `1px solid ${t.color.brand}`,
  borderRadius: t.radius.md,
})
```

```vue
<!-- 4. components/AppCard.vue -->
<script setup lang="ts">
import { card } from './AppCard.style'
</script>

<template>
  <div :class="card">
    <slot />
  </div>
</template>
```

#### Narration & In-the-Moment Reaction

* **0:01 (Setting up tokens & system):** Defining `t` via `defineTokens` and destructuring `css` from `createSystem` feels extremely clean. The separation of `tokens.style.ts` and `system.style.ts` makes perfect logical sense and avoids circular dependencies when other files only need `t` but not the system functions.
* **0:03 (Writing Card styles):** Spreading `...t.text.body` directly in the style object is highly satisfying. However, I have to import *both* `css` from `system.style` and `t` from `tokens.style`. On the 50th time, having to write two separate imports for styling a simple component:

  ```typescript
  import { css } from '~/design/system.style'
  import { t } from '~/design/tokens.style'
  ```

  will feel like minor but repetitive tax. I'd query why I can't just access `t` directly through the destructured system object (e.g., `const { css, t } = createSystem(...)` or `css.tokens`).
* **0:05 (Consuming in Vue):** The Vue component is as simple as it gets. Importing `card` and binding it directly to `:class` requires zero wrapper composables. This is a massive click moment—no build step lag or macro magic in the Vue compiler, just a plain class string.

---

### Task 2: Common Day-to-Day Task (Button Recipe + Navbar Override)

*Goal: Author a Button component with multiple visual axes (intent, size, pill toggle) and a custom padding port. Then override that padding for buttons placed inside a Navbar parent component using ports rather than selector archaeology.*

#### Step-by-Step Code

```TS
// 1. components/Button.style.ts
import { recipe, port } from '../design/system.style'
import { t } from '../design/tokens.style'

// Declaring the public style API for padding overrides
export const buttonPorts = {
  paddingX: port<string | number>('btnPaddingX', { default: t.space.md }),
}

export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.md,
    fontFamily: t.font.sans,
    paddingBlock: t.space.sm,
    // Consume the port for inline padding
    paddingInline: buttonPorts.paddingX,
  },
  variants: {
    intent: {
      brand: {
        background: t.color.brand,
        color: t.color.onBrand,
        hover: { background: t.color.brandHover },
      },
      secondary: {
        background: t.color.surfaceRaised,
        color: t.color.ink,
        hover: { background: t.color.surface },
      }
    },
    size: {
      sm: {
        ...buttonPorts.paddingX.set(t.space.sm), // Set statically in the class rule!
      },
      md: {
        ...buttonPorts.paddingX.set(t.space.md),
      }
    }
  },
  toggles: {
    pill: {
      borderRadius: t.radius.pill,
    }
  },
  defaults: {
    intent: 'brand',
    size: 'md',
  }
})
```

```TS
// 2. components/Navbar.style.ts
import { css } from '../design/system.style'
import { t } from '../design/tokens.style'
import { buttonPorts } from './Button.style'

export const navbar = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: t.space.md,
  background: t.color.canvas,
  
  // High-leverage: override the nested buttons' horizontal padding using their port
  ...buttonPorts.paddingX.set(t.space.lg),
})
```

```vue
<!-- 3. components/Navbar.vue -->
<script setup lang="ts">
import { navbar } from './Navbar.style'
import { button } from './Button.style'
import AppButton from './AppButton.vue'
</script>

<template>
  <nav :class="navbar">
    <div class="logo">Brand</div>
    <div class="actions">
      <!-- The nested button inherits the overridden padding via the CSS cascade -->
      <AppButton size="sm">Search</AppButton>
      <AppButton size="md">Log In</AppButton>
    </div>
  </nav>
</template>
```

#### Narration & In-the-Moment Reaction

* **The "Wait, what?" guess:** I assumed that `port.set()` accepts token references (like `t.space.lg`) at build time and compiles it cleanly to the variable declaration. The docs say: *"set() accepts token references... static set inside a css() rule compiles away entirely"*. This is a brilliant realization of build-time evaluation.
* **The friction:** In `Button.style.ts`, I had to define `buttonPorts` in a separate export block outside of the `recipe` object itself.
  On the 50th time, I might find it slightly annoying that the ports and the recipe options aren't declared in a single unified configuration block (e.g. `recipe({ ports: { ... }, base: { ... } })`). Having them separate forces the developer to manually coordinate variables, exports, and imports.
* **The "Aha!" moment:** Writing `...buttonPorts.paddingX.set(t.space.lg)` inside the `navbar` style rule is pure delight. It resolves to a CSS variable setting on the parent selector. It completely eliminates Vue's `:deep(.btn)` hacks and does not require writing complex, brittle child selectors. The cascade does the heavy lifting, but the developer has complete, typed IDE autocomplete at `buttonPorts`.

---

### Task 3: Awkward / Edge-Case Task (Zag/Ark-driven Combobox Anatomy & Dynamic Port Height)

*Goal: Style a multi-part Combobox anatomy using Zag-style states (like `data-state="open"` and `data-highlighted`). The component needs a dynamic dropdown max height based on the dynamic items list length, and contrast assertions to check highlighted legibility.*

#### Step-by-Step Code

```TS
// 1. components/Combobox.style.ts
import { anatomy, port } from '../design/system.style'
import { t } from '../design/tokens.style'

// Port for list height (will be bound in JS at runtime)
export const listHeight = port<string | number>('listHeight', { default: 'auto' })

export const combobox = anatomy({
  parts: ['root', 'label', 'input', 'trigger', 'content', 'item'],
  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      gap: t.space.xs,
    },
    label: {
      ...t.text.body,
      fontWeight: 500,
      color: t.color.ink,
    },
    input: {
      ...t.text.body,
      padding: t.space.sm,
      border: `1px solid ${t.color.border}`,
      borderRadius: t.radius.md,
      background: t.color.surface,
      hover: { borderColor: t.color.brand },
      
      // Zag/Ark state condition (open) defined in createSystem
      open: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }
    },
    content: {
      display: 'none',
      border: `1px solid ${t.color.border}`,
      borderTop: 'none',
      borderRadius: t.radius.md,
      background: t.color.surfaceRaised,
      maxBlockSize: listHeight, // Bind the port as variable!
      overflowY: 'auto',
      
      open: {
        display: 'block',
      }
    },
    item: {
      padding: t.space.sm,
      cursor: 'pointer',
      background: 'transparent',
      
      // Zag/Ark state element selector (highlighted)
      '&[data-highlighted]': {
        background: t.color.brandSoft,
        color: t.color.brand,
      }
    }
  },
  variants: {
    intent: {
      default: {},
      error: {
        input: { borderColor: t.color.danger },
        label: { color: t.color.danger }
      }
    }
  },
  defaults: { intent: 'default' }
})
```

```vue
<!-- 2. components/AppCombobox.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePorts } from '@mszr/vane-dux/vue'
import type { VaneProps } from '@mszr/vane-dux'
import { combobox, listHeight } from './Combobox.style'

const props = defineProps<VaneProps<typeof combobox> & {
  items: string[]
}>()

const isOpen = ref(false)

// Dynamically bind the dynamic height based on list length
const dynamicHeightStyle = usePorts(() => [
  listHeight.set(props.items.length === 0 ? '0px' : `${Math.min(props.items.length * 40, 240)}px`)
])

// Compute active classes from intent variant
const classes = computed(() => combobox({ intent: props.intent }))
</script>

<template>
  <div :class="classes.root">
    <label :class="classes.label">Choose options</label>
    <div 
      :class="classes.input" 
      :data-state="isOpen ? 'open' : 'closed'" 
      @click="isOpen = !isOpen"
    >
      Click to open...
    </div>
    
    <div 
      :class="classes.content" 
      :style="dynamicHeightStyle"
      :data-state="isOpen ? 'open' : 'closed'"
    >
      <div 
        v-for="item in items" 
        :key="item"
        :class="classes.item"
        data-highlighted
      >
        {{ item }}
      </div>
    </div>
  </div>
</template>
```

#### Narration & In-the-Moment Reaction

* **The friction (Parent-State Styling):** What if I wanted to style the `input` border *when the combobox root* has the `open` state? If `open` is a condition defined as `&[data-state="open"]` in the system, nesting `open: { ... }` inside `input` checks if the *input* is open. Since the state is on the root, I have to step off the clean, typed path and write:

  ```typescript
  input: {
    // Escaped raw selector targeting parent state:
    '[data-state="open"] &': { borderBottomLeftRadius: 0 }
  }
  ```

  While `vane-dux` permits this gracefully (Principle 8), it represents a minor conceptual speedbump.
* **The delight (Dynamic JS bindings):** Using `usePorts` to bind the dynamic list height to the `content` element `:style` is beautiful. The boilerplate is incredibly low: the runtime code never constructs CSS rule blobs. SSR generates standard inline styles, preventing layout shifts.
* **The Vue ergonomics:** Since `combobox` returns an object of part classes, we have to resolve it inside a `computed` and reference it in templates as `classes.root`, `classes.label`. This is standard Vue practice, but does require `.value` syntax if accessed in setup. It feels clean.

---

## 2. API Design Review

### Gut Check

**Verdict: Highly excited.**
This is far from just "fine". It is an extremely well-thought-out system that hits the sweet spot of modern CSS ergonomics. The architectural insight—separating styling into a contract plane, a compiled plane, and a typed port boundary—is exactly what has been missing in the ecosystem. It respects the browser's capabilities (cascade, variables, custom schemes) rather than trying to hide them behind custom JS runtimes.

---

### Delight Moments

1. **Implicit Schemes (`elevation()` & `light-dark()`):**
   Defining dark mode directly within a token via `elevation(n)` and having it output `light-dark()` is a massive win. It moves scheme switching entirely into the CSS engine. The fact that a developer can force dark mode on a container by simply adding `colorScheme: 'dark'` is a spectacular realization of Principle 6 (emit boring CSS).
2. **Ports as a Cascade-Powered Boundary:**
   Ports unify reactive styling, parent->child overrides, library customization, and utility parameters under one primitive. The syntax `...buttonPorts.paddingX.set(t.space.lg)` inside a parent stylesheet is a masterclass in ergonomics. It preserves encapsulation without sacrificing control.
3. **Contrast checks (APCA) at the definition site:**
   Catching color contrast failures at build time as typed diagnostics with direct fix-its is a wonderful implementation of the "guarantees, not guidelines" principle. It brings accessibility directly into the developer's immediate feedback loop.

---

### Friction / Dread Moments

1. **Splitting styles and SFCs:**
   Having to maintain a sibling `Button.style.ts` alongside `Button.vue` is a known chore. While it's necessary for the evaluation-based build model, the lack of inline authoring is going to be the #1 reason Vue/Vite developers hesitate to adopt it.
2. **Separate declaration of ports and recipes:**
   As simulated in Task 2, having to define ports in a separate `const buttonPorts` object and then manually interpolate/export them beside the `button` recipe feels disjointed. A recipe is the component's contract; its ports should ideally be defined inline within its options object (e.g. `recipe({ ports: { paddingX: ... }, base: { ... } })`).
3. **Parent-state state targeting in Anatomies:**
   Stretching the anatomy design to style a child part based on a parent part's condition forces the developer to write un-typed raw selectors like `'[data-state="open"] &': { ... }`. It would be cleaner if the anatomy engine understood relations between parts natively (e.g. `when: { root: 'open' }` or similar).

---

### Mental Model
>
> **vane-dux is a build-time compiler that models design decisions as a typed TypeScript graph, emitting static CSS classes for structural layout, and exposing a typed "port" boundary (CSS custom properties) for any dynamic or cascading value changes at runtime.**

---

### The First Five Minutes

1. **Adoption Friction:**
   The initial setup step requires three files (`tokens.style.ts`, `system.style.ts`, and a bundler plugin configuration). For a developer used to utility classes, this is a high barrier to entry just to see a styled "Hello World".
2. **Where they bounce off:**
   They will bounce off if they misconfigure the bundler integration or if the TS config doesn't resolve paths correctly. Because vane-dux relies on the vanilla-extract child compiler, setup failures will emit complex Node evaluation errors rather than simple syntax squiggles.

---

### Day 50

* **What wears well:**
  The typed token rename (`F2`) and the dead-code audit warnings. When refactoring massive codebases, knowing that deleting a token turns every downstream file red is a developer's superpower.
* **What starts to grate:**
  File clutter. Having every component folder contain `index.vue`, `component.style.ts`, and possibly test files makes file navigation noisier. Developers will start craving the deferred `<style lang="ts">` inline integration.

---

### Compared to Alternatives

* **vs. Tailwind:** vane-dux is vastly superior for design system cohesion, theme switches, and type-safety. However, Tailwind is much faster for writing random one-off layouts because it keeps styles inline.
* **vs. Panda CSS:** vane-dux matches Panda's build-time extraction but does so via *evaluation* instead of static analysis. This makes the JS code much more natural to write (no limits on maps, functions, or external scale libraries).
* **vs. Vanilla-Extract:** vane-dux is a massive DX upgrade. It wraps the raw contracts machinery in a unified `createSystem` boundary and adds clean custom-property declarations (ports) that replace manual `createVar` plumbing.

---

### Forced Choice: Cut & Add

* **One thing to CUT:**
  The standalone `theme()` function for build-time overrides before the system is defined. It feels like a premature optimization that complicates the initial onboarding of the token API. Keep the design contract bound to the system.
* **One thing to ADD:**
  Inline ports definition inside `recipe()` and `anatomy()`. It should be possible to declare ports inside the recipe options so that they are namespace-bound to the recipe automatically.

  ```typescript
  export const button = recipe({
    ports: {
      paddingX: { default: t.space.md }
    },
    base: ({ ports }) => ({
      paddingInline: ports.paddingX
    })
  })
  // Usage on consumer: button.ports.paddingX.set(...)
  ```

---

## 3. Score

### Delight Score: **9 / 10**

### Single highest-leverage change to reach 10/10:

Add inline port definitions inside the `recipe()` and `anatomy()` contracts. This would unify the component's variant space and dynamic/cascade API into a single, cohesive authoring block. It reduces export ceremony, simplifies imports, and matches the developer's component-scoped mental model.
