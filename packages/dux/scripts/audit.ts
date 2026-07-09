/**
 * `pnpm run audit` — the introspection audits ([dux-spec-introspection.md §3])
 * over a real plugin build. Defaults to the package's fixture app; point it at
 * any Vite-rooted style app: `pnpm run audit -- sandbox/demo-minimal/app`.
 *
 * Findings print grouped and deep-linked; the exit code is 1 only when the
 * system's own config promoted a lane to a hard gate.
 */

import { cp, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { audit, formatAuditFindings } from '../vane-dux/src/introspect/audit'

const here = fileURLToPath(new URL('.', import.meta.url))
const packageDir = join(here, '..', 'vane-dux')

/** Tooling resolves from the package, exactly as the plugin ships it. */
const requireFromPackage = createRequire(join(packageDir, 'package.json'))

async function main(): Promise<void> {
  const target = process.argv[2]
  const source = target === undefined ? join(packageDir, 'src', 'test-support', 'vite-app') : resolve(target)

  // Build in a copy, so the manifest artifact never lands in a source tree.
  const root = await realpath(await mkdtemp(join(tmpdir(), 'vane-audit-')))
  await cp(source, root, { recursive: true })
  await writeFile(join(root, 'package.json'), '{ "name": "vane-audit-surface", "type": "module" }')

  const { build } = await import(pathToFileURL(requireFromPackage.resolve('vite')).href) as typeof import('vite')
  const { default: vaneDuxPlugin } = await import('../vane-dux/src/vite')

  const result = await build({
    configFile: false,
    logLevel: 'silent',
    root,
    plugins: [vaneDuxPlugin({ identifiers: 'debug' })],
    resolve: {
      alias: {
        '@mszr/vane-dux/runtime': join(packageDir, 'src', 'runtime.ts'),
        '@mszr/vane-dux': join(packageDir, 'src', 'index.ts'),
      },
    },
    build: {
      write: false,
      // The audit reads declarations as authored — minification would rewrite them.
      cssMinify: false,
      lib: { entry: join(root, 'entry.ts'), formats: ['es'], fileName: 'entry' },
    },
  })

  const { output } = (Array.isArray(result) ? result[0] : result) as import('vite').Rollup.RollupOutput
  const css = output
    .filter(item => item.type === 'asset' && item.fileName.endsWith('.css'))
    .map(item => String((item as { source: unknown }).source))
    .join('\n')

  const manifest = JSON.parse(await readFile(join(root, '.vane', 'manifest.json'), 'utf-8'))
  await rm(root, { recursive: true, force: true })

  const findings = audit(manifest, css)

  console.log(`[vane-dux] audit over ${target ?? 'the fixture app'}\n`)
  console.log(formatAuditFindings(findings))

  if (findings.some(finding => finding.level === 'error'))
    process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
