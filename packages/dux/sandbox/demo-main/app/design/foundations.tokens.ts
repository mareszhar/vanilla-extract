import { defineTokens, scale } from '@mszr/vane-dux'

/** Independently buildable metric/type module; no palette opinion is hidden in it. */
export const foundationTokens = defineTokens({
  space: scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6, xl: 10 } }).tokens(),
  radius: { sm: '6px', md: '10px', pill: '999px' },
  duration: { fast: '120ms', normal: '200ms' },
  font: { sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  text: {
    small: { fontSize: '0.875rem', lineHeight: 1.45, fontWeight: 400 },
    body: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 400 },
    title: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 600 },
    display: { fontSize: '2.25rem', lineHeight: 1.1, fontWeight: 700 },
  },
})
