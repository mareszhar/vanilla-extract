/**
 * Publication smoke: pack the SDK, install that tarball into two tiny apps,
 * then exercise strict types, production builds, and real dev HTTP lifecycles.
 * No workspace link or source alias is allowed to make this pass.
 */

import type { ChildProcess } from 'node:child_process'
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const duxDir = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const packageDir = join(duxDir, 'vane-dux')
const root = mkdtempSync(join(tmpdir(), 'vane-fresh-'))
const plainDir = join(root, 'plain-vite')
const nuxtDir = join(root, 'nuxt-app')
const nuxtHmrPort = 24678

function write(path: string, source: string): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, source)
}

function run(command: string, args: string[], cwd = root): void {
  console.log(`$ ${command} ${args.join(' ')}`)
  execFileSync(command, args, { cwd, stdio: 'inherit' })
}

async function openPort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  const port = typeof address === 'object' && address !== null ? address.port : 0
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  return port
}

async function waitForHttp(url: string, child: ChildProcess, output: () => string): Promise<string> {
  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`Dev server exited before serving ${url}\n${output()}`)

    try {
      const response = await fetch(url)
      if (response.ok)
        return await response.text()
    }
    catch {}

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  throw new Error(`Timed out waiting for ${url}\n${output()}`)
}

async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null)
    return

  const target = process.platform === 'win32' ? child.pid : child.pid === undefined ? undefined : -child.pid

  if (target === undefined)
    return

  try {
    process.kill(target, 'SIGTERM')
  }
  catch {
    return
  }

  await Promise.race([
    new Promise<void>(resolve => child.once('exit', () => resolve())),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        try {
          process.kill(target, 'SIGKILL')
        }
        catch {}
        resolve()
      }, 5_000)
    }),
  ])
}

async function assertPortReleased(port: number, anyHost = false): Promise<void> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    if (anyHost)
      server.listen(port, resolve)
    else server.listen(port, '127.0.0.1', resolve)
  })
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
}

async function smokeDev(directory: string, command: string[], port: number, expected: RegExp): Promise<void> {
  let output = ''
  const child = spawn('pnpm', ['--dir', directory, 'exec', ...command], {
    cwd: root,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      CHOKIDAR_INTERVAL: '100',
      CHOKIDAR_USEPOLLING: 'true',
      NODE_ENV: 'development',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.on('data', chunk => output += String(chunk))
  child.stderr?.on('data', chunk => output += String(chunk))

  try {
    const html = await waitForHttp(`http://127.0.0.1:${port}/`, child, () => output)
    if (!expected.test(html))
      throw new Error(`Fresh dev response did not contain ${expected}\n${html.slice(0, 2_000)}`)
  }
  finally {
    await stop(child)
  }

  await assertPortReleased(port)
}

async function main(): Promise<void> {
  const nuxtHttpPort = await openPort()
  const vitePort = await openPort()
  const tarballName = execFileSync('npm', ['pack', '--pack-destination', root], {
    cwd: packageDir,
    encoding: 'utf-8',
    env: { ...process.env, npm_config_cache: join(root, '.npm-cache') },
  }).trim().split('\n').at(-1)!
  const tarball = join(root, tarballName)
  const packedDependency = `file:${tarball}`

  write(join(root, 'package.json'), JSON.stringify({ private: true, packageManager: 'pnpm@11.8.0' }, null, 2))
  write(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - plain-vite\n  - nuxt-app\n')

  write(join(plainDir, 'package.json'), JSON.stringify({
    name: 'vane-fresh-plain',
    private: true,
    type: 'module',
    dependencies: { '@mszr/vane-dux': packedDependency },
    devDependencies: { typescript: '5.8.3', vite: '8.1.3' },
  }, null, 2))
  write(join(plainDir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      module: 'ESNext',
      moduleResolution: 'Bundler',
      target: 'ES2022',
      lib: ['ES2022', 'DOM'],
      plugins: [{ name: '@mszr/vane-dux/typescript' }],
    },
    include: ['src'],
  }, null, 2))
  write(join(plainDir, 'vite.config.ts'), `import { defineConfig } from 'vite'
import { vaneDuxPlugin } from '@mszr/vane-dux/vite'

export default defineConfig({ plugins: [vaneDuxPlugin()] })
`)
  write(join(plainDir, 'index.html'), '<main id="app"></main><script type="module" src="/src/main.ts"></script>\n')
  write(join(plainDir, 'src/palette.tokens.ts'), `import { alpha, defineTokens, oklch } from '@mszr/vane-dux'

export const palette = defineTokens({ color: { brand: oklch(0.58, 0.2, 285).live() } })
  .derive(({ color }) => ({ color: { brandSoft: alpha(color.brand, 0.12) } }))
`)
  write(join(plainDir, 'src/system.style.ts'), `import { createSystem, defineTokens } from '@mszr/vane-dux'
import { palette } from './palette.tokens'

export const { css, t } = createSystem({ tokens: defineTokens().compose(palette) })
`)
  write(join(plainDir, 'src/card.style.ts'), `import { css, t } from './system.style'

export const card = css({ color: t.color.brand, background: t.color.brandSoft, padding: '1rem' })
`)
  write(join(plainDir, 'src/main.ts'), `import { card } from './card.style'

document.querySelector('#app')!.innerHTML = '<button class="' + card + '">Fresh Vite</button>'
`)

  write(join(nuxtDir, 'package.json'), JSON.stringify({
    name: 'vane-fresh-nuxt',
    private: true,
    type: 'module',
    dependencies: { '@mszr/vane-dux': packedDependency, 'nuxt': '4.4.8', 'vue': '3.5.39' },
    devDependencies: { 'typescript': '5.8.3', 'vue-tsc': '3.2.0' },
  }, null, 2))
  write(join(nuxtDir, 'tsconfig.json'), '{ "extends": "./.nuxt/tsconfig.json" }\n')
  write(join(nuxtDir, 'nuxt.config.ts'), `export default defineNuxtConfig({
  modules: ['@mszr/vane-dux/nuxt'],
  vane: { system: '~/design/system.style.ts' },
  devtools: { enabled: false },
  compatibilityDate: '2026-07-10',
  watchers: { chokidar: { usePolling: true, interval: 100 } },
  vite: { server: { watch: { usePolling: true, interval: 100 } } },
})
`)
  write(join(nuxtDir, 'app/design/palette.tokens.ts'), `import { alpha, defineTokens, oklch } from '@mszr/vane-dux'

export const palette = defineTokens({ color: { brand: oklch(0.58, 0.2, 285).live() } })
  .derive(({ color }) => ({ color: { brandSoft: alpha(color.brand, 0.12) } }))
`)
  write(join(nuxtDir, 'app/design/system.style.ts'), `import { createSystem, defineTokens } from '@mszr/vane-dux'
import { palette } from './palette.tokens'

export const { css, t } = createSystem({ tokens: defineTokens().compose(palette) })
`)
  write(join(nuxtDir, 'app/app.style.ts'), `export const page = css({ color: t.color.brand, background: t.color.brandSoft, padding: '2rem' })
`)
  write(join(nuxtDir, 'app/app.vue'), `<script setup lang="ts">
import { page } from './app.style'
</script>

<template><main :class="page">Fresh Nuxt</main></template>
`)

  run('pnpm', ['install', '--ignore-scripts'])

  run('pnpm', ['--dir', plainDir, 'exec', 'tsc', '--noEmit'])
  run('pnpm', ['--dir', plainDir, 'exec', 'vite', 'build'])
  await smokeDev(plainDir, ['vite', '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'], vitePort, /src\/main\.ts/)
  console.log('✓ fresh plain Vite: strict types, build, and dev lifecycle')

  run('pnpm', ['--dir', nuxtDir, 'exec', 'nuxt', 'prepare'])
  run('pnpm', ['--dir', nuxtDir, 'exec', 'nuxi', 'typecheck'])
  run('pnpm', ['--dir', nuxtDir, 'exec', 'nuxt', 'build'])
  await assertPortReleased(nuxtHmrPort, true)
  await smokeDev(nuxtDir, ['nuxt', 'dev', '--host', '127.0.0.1', '--port', String(nuxtHttpPort)], nuxtHttpPort, /Fresh Nuxt/)
  await assertPortReleased(nuxtHmrPort, true)
  console.log('✓ fresh Nuxt: strict types, build, and HTTP/HMR lifecycle')
  console.log(`✓ packed SDK smoke passed (${tarballName})`)
}

try {
  await main()
}
finally {
  rmSync(root, { recursive: true, force: true })
}
