/**
 * The release pipeline ([dux-workspace.md §8]) — house release machinery:
 *
 *   pnpm run publish:sdk:dry-run          gate + packaging rehearsal
 *   pnpm run publish:sdk:<patch|minor|major>   the release
 *   pnpm run publish:subtree:squash       re-push the public mirror, no release
 *
 * One shared gate (build · lint · typecheck · test · audit) runs once, with a
 * content-keyed receipt so a resumed release doesn't re-verify unchanged
 * inputs. `VANE_FORCE_VERIFY=1` ignores the receipt; the deliberately awkward
 * `VANE_UNSAFE_PUBLISH_SKIP_CHECKS=1` skips the gate outright.
 *
 * Failure before `npm publish` restores the manifest and records nothing.
 * Once published, the bump is permanent and the remaining steps ride a
 * resumable release record (gitignored, `.dux/release.json`): registry
 * propagation → release commit + tag → subtree squash-push to the public
 * repo (`VANE_MIRROR_REMOTE` overrides the default remote).
 */

import { execSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const duxDir = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const packageDir = join(duxDir, 'vane-dux')
const manifestPath = join(packageDir, 'package.json')
const stateDir = join(duxDir, '.dux')
const receiptPath = join(stateDir, 'verify-receipt.json')
const releasePath = join(stateDir, 'release.json')

const MIRROR_REMOTE = process.env.VANE_MIRROR_REMOTE ?? 'git@github.com:mareszhar/vane-dux.git'
const MIRROR_BRANCH = 'main'

// ─── Small process helpers ───────────────────────────────────────────────────

function run(command: string, options: { cwd?: string, quiet?: boolean } = {}): string {
  if (!options.quiet)
    console.log(`\n$ ${command}`)

  return execSync(command, {
    cwd: options.cwd ?? duxDir,
    stdio: options.quiet ? ['ignore', 'pipe', 'pipe'] : ['inherit', 'pipe', 'inherit'],
    encoding: 'utf-8',
  }).trim()
}

function step(title: string): void {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`)
}

function fail(message: string): never {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

// ─── The shared gate ─────────────────────────────────────────────────────────

/** The inputs that decide the gate: the committed dux tree plus any working-tree drift. */
function contentKey(): string {
  const tree = run(`git rev-parse HEAD:packages/dux`, { quiet: true })
  const drift = run(`git status --porcelain -- packages/dux`, { quiet: true })
  const dirty = drift
    .split('\n')
    .filter(line => line.length > 0)
    .map((line) => {
      const file = line.slice(3)
      const path = join(duxDir, '..', '..', file)
      return `${file}:${existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : 'gone'}`
    })
    .join('\n')

  return createHash('sha256').update(`${tree}\n${dirty}`).digest('hex')
}

function gate(): void {
  if (process.env.VANE_UNSAFE_PUBLISH_SKIP_CHECKS === '1') {
    console.log('⚠ VANE_UNSAFE_PUBLISH_SKIP_CHECKS=1 — the gate was skipped, on your head be it')
    return
  }

  const key = contentKey()

  if (process.env.VANE_FORCE_VERIFY !== '1' && existsSync(receiptPath)) {
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf-8')) as { key?: string, at?: string }

    if (receipt.key === key) {
      console.log(`✓ gate receipt matches current content (verified ${receipt.at}) — skipping re-verify`)
      return
    }
  }

  step('gate: build · lint · typecheck · test · audit')
  run('pnpm run sdk:build')
  run('pnpm run lint')
  run('pnpm run sdk:typecheck')
  run('pnpm run sdk:test')
  run('pnpm run audit')

  mkdirSync(stateDir, { recursive: true })
  writeFileSync(receiptPath, `${JSON.stringify({ key, at: new Date().toISOString() }, null, 2)}\n`)
  console.log('\n✓ gate green — receipt recorded')
}

// ─── Versioning ──────────────────────────────────────────────────────────────

type Bump = 'patch' | 'minor' | 'major'

function bumpVersion(current: string, bump: Bump): string {
  const [major = 0, minor = 0, patch = 0] = current.split('.').map(Number)

  switch (bump) {
    case 'major': return `${major + 1}.0.0`
    case 'minor': return `${major}.${minor + 1}.0`
    case 'patch': return `${major}.${minor}.${patch + 1}`
  }
}

interface ReleaseState {
  version: string
  published?: boolean
  committed?: boolean
  pushedMirror?: boolean
}

function readRelease(): ReleaseState | undefined {
  return existsSync(releasePath) ? JSON.parse(readFileSync(releasePath, 'utf-8')) as ReleaseState : undefined
}

function writeRelease(state: ReleaseState): void {
  mkdirSync(stateDir, { recursive: true })
  writeFileSync(releasePath, `${JSON.stringify(state, null, 2)}\n`)
}

// ─── The subtree mirror ──────────────────────────────────────────────────────

/**
 * Push the tracked `vane-dux/` subtree to the public repo as one squashed
 * commit on top of its history — the mirror is the package face, the fork
 * stays the development home.
 */
function pushMirror(message: string): void {
  step(`mirror: squash-push vane-dux/ → ${MIRROR_REMOTE}`)

  const workDir = join(tmpdir(), `vane-mirror-${Date.now()}`)
  mkdirSync(workDir, { recursive: true })

  try {
    run(`git clone --depth 1 --branch ${MIRROR_BRANCH} ${MIRROR_REMOTE} ${workDir}`, { quiet: true })
  }
  catch {
    // A fresh or empty mirror: start its history here.
    run(`git init -b ${MIRROR_BRANCH} ${workDir}`, { quiet: true })
    run(`git -C ${workDir} remote add origin ${MIRROR_REMOTE}`, { quiet: true })
  }

  // Replace the mirror's tree with the tracked subtree content.
  for (const entry of run(`git -C ${workDir} ls-files`, { quiet: true }).split('\n').filter(Boolean))
    rmSync(join(workDir, entry), { force: true })

  const files = run('git ls-files -- vane-dux', { quiet: true }).split('\n').filter(Boolean)

  for (const file of files) {
    const target = join(workDir, file.replace(/^vane-dux\//, ''))
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, readFileSync(join(duxDir, file)))
  }

  run(`git -C ${workDir} add -A`, { quiet: true })

  const status = run(`git -C ${workDir} status --porcelain`, { quiet: true })

  if (status === '') {
    console.log('✓ mirror already matches — nothing to push')
  }
  else {
    run(`git -C ${workDir} commit -m ${JSON.stringify(message)}`, { quiet: true })
    run(`git -C ${workDir} push origin ${MIRROR_BRANCH}`)
    console.log(`✓ mirror updated: ${message}`)
  }

  rmSync(workDir, { recursive: true, force: true })
}

// ─── Commands ────────────────────────────────────────────────────────────────

function dryRun(): void {
  gate()
  step('packaging rehearsal (nothing is published)')
  run('npm pack --dry-run', { cwd: packageDir })
  console.log('\n✓ dry run complete — the package is release-ready')
}

function release(bump: Bump): void {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { version: string }
  const resumed = readRelease()

  if (resumed !== undefined && !resumed.pushedMirror) {
    console.log(`↻ resuming release v${resumed.version}`)
    finishRelease(resumed)
    return
  }

  gate()

  step('npm auth')
  const account = run('npm whoami', { quiet: true })
  console.log(`✓ publishing as ${account}`)

  const version = bumpVersion(manifest.version, bump)
  const original = readFileSync(manifestPath, 'utf-8')

  step(`bump ${manifest.version} → ${version}`)
  // Never `npm version` — it would try to reify the outer pnpm workspace.
  writeFileSync(manifestPath, original.replace(`"version": "${manifest.version}"`, `"version": "${version}"`))

  try {
    run('pnpm run sdk:build')
    run('npm publish --access public', { cwd: packageDir })
  }
  catch (error) {
    // Nothing escaped: restore the manifest, record nothing.
    writeFileSync(manifestPath, original)
    fail(`publish failed — manifest restored, nothing recorded\n${error}`)
  }

  const state: ReleaseState = { version, published: true }
  writeRelease(state)
  finishRelease(state)
}

/** Everything after the point of no return — resumable from the release record. */
function finishRelease(state: ReleaseState): void {
  step(`registry propagation for v${state.version}`)
  waitForRegistry(state.version)

  if (!state.committed) {
    step('release commit + tag')
    run(`git add ${manifestPath}`, { quiet: true })
    run(`git commit -m ${JSON.stringify(`🔖 release v${state.version}`)}`)
    run(`git tag vane-dux@${state.version}`)
    state.committed = true
    writeRelease(state)
  }

  if (!state.pushedMirror) {
    pushMirror(`🔖 release v${state.version}`)
    state.pushedMirror = true
    writeRelease(state)
  }

  rmSync(releasePath, { force: true })
  console.log(`\n✓ released @mszr/vane-dux v${state.version}`)
  console.log('  (the fork itself is not pushed — push the dux branch when ready)')
}

function waitForRegistry(version: string): void {
  const deadline = Date.now() + 120_000

  for (;;) {
    const probe = spawnSync('npm', ['view', `@mszr/vane-dux@${version}`, 'version'], { encoding: 'utf-8' })

    if (probe.stdout.trim() === version) {
      console.log('✓ version visible on the registry')
      return
    }

    if (Date.now() > deadline) {
      console.log('⚠ registry still propagating after 2m — continuing; resume later if a step fails')
      return
    }

    execSync('sleep 5')
  }
}

// ─── Entry ───────────────────────────────────────────────────────────────────

const command = process.argv[2]

switch (command) {
  case 'dry-run':
    dryRun()
    break
  case 'patch':
  case 'minor':
  case 'major':
    release(command)
    break
  case 'subtree':
    pushMirror('🚚 sync vane-dux subtree')
    break
  default:
    fail(`unknown command '${command}' — use dry-run, patch, minor, major, or subtree`)
}
