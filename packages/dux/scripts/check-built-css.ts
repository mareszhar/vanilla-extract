import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function cssIn(directory: string): string {
  const files = readdirSync(directory)
    .filter(file => file.endsWith('.css'))
    .sort()

  if (files.length === 0)
    throw new Error(`No built CSS found in ${directory}; run pnpm run demo:build first`)

  return files.map(file => readFileSync(join(directory, file), 'utf8')).join('\n')
}

function requirePattern(css: string, pattern: RegExp, label: string): void {
  if (!pattern.test(css))
    throw new Error(`Built CSS lost ${label}: ${pattern}`)
}

function rejectPattern(css: string, pattern: RegExp, label: string): void {
  if (pattern.test(css))
    throw new Error(`Built CSS contains ${label}: ${pattern}`)
}

const main = cssIn(join(root, 'sandbox', 'demo-main', '.output', 'public', '_nuxt'))
const comparison = cssIn(join(root, 'sandbox', 'demo-comparisons', 'dist', 'assets'))

requirePattern(main, /@property --prism-color-brand/, 'the typed brand registration')
requirePattern(main, /@container application\s*\(min-width:\s*44rem\)/, 'the named application container query')
requirePattern(main, /@starting-style/, 'raw @starting-style output')
requirePattern(main, /oklch\(from var\(--prism-color-brand/, 'relative-color derivation')
requirePattern(main, /color-mix\(in oklab,light-dark\(/, 'native light-dark inside color-mix')
requirePattern(main, /--prism-v-[a-z0-9-]+/, 'opaque mutable slots')

requirePattern(comparison, /@layer compare\.tokens\.base/, 'vane token layers beside peer layers')
requirePattern(comparison, /@layer panda-(?:tokens|utilities)/, 'Panda layers')
requirePattern(comparison, /@layer theme/, 'Tailwind theme layer')
requirePattern(comparison, /oklch\(from var\(--compare-color-brand/, 'comparison relative-color derivation')
requirePattern(comparison, /(?:light-dark\(|--lightningcss-light)/, 'native or optimizer-lowered scheme selection')
requirePattern(comparison, /--compare-v-[a-z0-9-]+/, 'comparison mutable slot')

for (const [label, css] of [['flagship', main], ['comparison', comparison]] as const) {
  rejectPattern(css, /\[object Object\]|\bundefined\b|\bNaN\b/, `${label} serialization debris`)
}

console.log('✓ built CSS: registrations, modern color, containers, raw rules, layers, and mutable slots survived both optimizer pipelines')
