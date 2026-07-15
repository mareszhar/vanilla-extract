import type {
  VaneRuntimeSnapshotV1,
  VaneRuntimeStyleDeclaration,
  VaneRuntimeTarget,
} from '@mszr/vane-dux'
import {
  createEngine,
  customProperty,
} from '@mszr/vane-dux'
import { setCustomProperties, setCustomProperty } from '@mszr/vane-dux/runtime'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'
import { collectInspection } from '../internal/inspect'
import { buildManifest } from '../introspect/manifest'

class MemoryStyle implements VaneRuntimeStyleDeclaration {
  readonly values = new Map<string, string>()
  writes = 0
  removals = 0

  setProperty(name: string, value: string): void {
    this.writes++
    this.values.set(name, value)
  }

  removeProperty(name: string): string {
    this.removals++
    const prior = this.values.get(name) ?? ''
    this.values.delete(name)
    return prior
  }

  getPropertyValue(name: string): string {
    return this.values.get(name) ?? ''
  }
}

class MemoryRoot implements VaneRuntimeTarget {
  readonly style = new MemoryStyle()
  readonly attributes = new Map<string, string>()
  attributeWrites = 0
  readonly ownerDocument = null

  setAttribute(name: string, value: string): void {
    this.attributeWrites++
    this.attributes.set(name, value)
  }

  removeAttribute(name: string): void {
    this.attributeWrites++
    this.attributes.delete(name)
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null
  }

  matches(selector: string): boolean {
    return selector === '#app'
  }
}

function createFixture(extra = false) {
  const positive = {
    '~standard': {
      version: 1 as const,
      vendor: 'phase-5-fixture',
      validate: (input: unknown) => typeof input === 'number' && input > 0
        ? { value: Math.round(input * 10) / 10 }
        : { issues: [{ message: 'expected a positive number' }] },
    },
  }
  const de = createEngine().axes(({ axis, data, defaultMode, scheme }) => ({
    scheme: scheme({ locality: 'root' }),
    density: axis({
      modes: {
        cozy: defaultMode(),
        compact: data('density', 'compact'),
      },
      default: 'cozy',
    }),
  }))
  const { returned: ds, css } = emit(() => de.createSystem({
    prefix: 'app',
    root: '#app',
    tokens: {
      color: {
        brand: de.token.color({
          val: de.oklch(0.62, 0.18, 285),
          mutable: true,
          axes: { scheme: { dark: null } },
        }),
        fixed: de.oklch(0.4, 0.1, 120),
      },
      space: {
        control: de.token.length({ mutable: true, register: { initialVal: de.length.px(16) } }),
      },
      shadow: {
        card: de.token({
          val: '0 1px 2px #0002',
          mutable: true,
          axes: { density: { compact: '0 2px 4px #0003' } },
          cases: [{ when: { scheme: 'dark', density: 'compact' }, val: null }],
        }),
      },
      ratio: de.token.number({
        mutable: true,
        validate: {
          id: 'positive-ratio',
          schema: positive,
          runtime: 'always',
          onInvalid: 'throw',
        },
      }),
      fallbackRatio: de.token.number({
        mutable: true,
        validate: {
          id: 'positive-ratio',
          schema: positive,
          runtime: 'always',
          onInvalid: 'fallback',
          fallback: 1,
        },
      }),
      optionalRatio: de.token.number({
        mutable: true,
        validate: {
          id: 'positive-ratio',
          schema: positive,
          runtime: 'always',
          onInvalid: 'omit',
        },
      }),
      ...(extra ? { added: de.token.length({ mutable: true }) } : {}),
    },
  }))
  return { de, ds, css, positive }
}

describe('phase 5 mutable runtime', () => {
  it('keeps generic custom-property writes explicit and provenance-free', () => {
    const root = new MemoryRoot()
    const external = customProperty('--external-space', { type: 'length' })
    const { ds } = createFixture()

    setCustomProperty(root, external, '2rem')
    setCustomProperty(root.style, ds.t.color.fixed, 'hotpink')
    setCustomProperties(root, {
      '--external-alpha': 0.6,
      '--external-motion': '180ms',
    })
    setCustomProperties(root, [[external, '3rem']])

    expect(root.style.values.get('--external-space')).toBe('3rem')
    expect(root.style.values.get(ds.t.color.fixed.$name)).toBe('hotpink')
    expect(root.style.values.get('--external-alpha')).toBe('0.6')
    expect(() => setCustomProperty(root as any, 'not-a-custom-property' as any, 'x')).toThrow(/valid CSS custom-property/)
    expect(() => (setCustomProperty as any)('#app', '--x', 'x')).toThrow(/explicit element/)
  })

  it('binds base, authored mode, and reserved case handles to opaque slots', () => {
    const { ds, css } = createFixture()
    const root = new MemoryRoot()
    const runtime = ds.runtime(root)

    runtime.t.color.brand.$set('oklch(0.7 0.2 300)')
    runtime.t.color.brand.$axes.scheme.dark.$set('black')
    runtime.t.shadow.card.$case({ scheme: 'dark', density: 'compact' }).$set('none')
    runtime.applyTokenOverrides({ space: { control: '1.25rem' } })
    runtime.applyTokenOverrides([
      [ds.t.shadow.card.$axes.density.compact, '0 3px 8px #0004'],
    ])

    const snapshot = runtime.snapshot()
    expect(snapshot.version).toBe(1)
    expect(snapshot.overrides.map(entry => [entry.token.join('.'), entry.address.kind])).toEqual([
      ['color.brand', 'base'],
      ['color.brand', 'axis'],
      ['shadow.card', 'axis'],
      ['shadow.card', 'case'],
      ['space.control', 'base'],
    ])
    expect(Object.keys(ds.runtimeStyle(snapshot))).toHaveLength(5)
    expect(Object.keys(ds.runtimeStyle(snapshot))).not.toContain(ds.t.color.brand.$name)
    expect(css).toContain('var(--app-v-')

    const before = runtime.snapshot().overrides.length
    runtime.t.color.brand.$axes.scheme.dark.$unset()
    expect(runtime.snapshot().overrides).toHaveLength(before - 1)
    expect(root.style.removals).toBe(1)
    expect(() => runtime.applyTokenOverrides([[ds.t.color.fixed as any, 'red']])).toThrow(/no runtime address/)
  })

  it('selects runtime-capable axis modes and projects them for SSR', () => {
    const { ds } = createFixture()
    const root = new MemoryRoot()
    const runtime = ds.runtime(root)

    runtime.setMode('density', 'compact')
    runtime.setScheme('dark')
    expect(root.attributes).toEqual(new Map([
      ['data-density', 'compact'],
      ['data-scheme', 'dark'],
    ]))

    runtime.setMode('density', 'cozy')
    expect(root.attributes.has('data-density')).toBe(false)
    const snapshot = runtime.snapshot()
    expect(snapshot.modes).toEqual({ scheme: 'dark', density: 'cozy' })
    expect(ds.runtimeProps(snapshot)).toEqual({
      style: {},
      attributes: { 'data-scheme': 'dark' },
    })

    runtime.clearMode('scheme')
    expect(root.attributes.has('data-scheme')).toBe(false)
  })

  it('round-trips SSR state and hydrates without redundant DOM writes', () => {
    const { ds } = createFixture()
    const source = ds.runtime(new MemoryRoot())
    source.t.color.brand.$set('rebeccapurple')
    source.t.shadow.card.$axes.density.compact.$set('none')
    source.setScheme('dark')
    const snapshot = source.snapshot()
    const props = ds.runtimeProps(snapshot)

    const root = new MemoryRoot()
    for (const [name, value] of Object.entries(props.style))
      root.style.values.set(name, value)
    for (const [name, value] of Object.entries(props.attributes))
      root.attributes.set(name, value)

    const hydrated = ds.runtime(root, { initial: snapshot })
    expect(root.style.writes).toBe(0)
    expect(root.attributeWrites).toBe(0)
    expect(hydrated.snapshot()).toEqual(snapshot)
  })

  it('reconciles schema changes entry by entry and rejects protocol changes wholesale', () => {
    const first = createFixture().ds
    const old = first.runtime(new MemoryRoot())
    old.t.color.brand.$set('red')
    const prior = old.snapshot()

    const next = createFixture(true).ds
    expect(Object.keys(next.runtimeProps(prior).style)).toHaveLength(1)
    expect(Object.keys(next.runtimeProps(prior).style)[0]).toMatch(/^--app-v-/)
    const result = next.reconcileRuntimeSnapshot(prior)
    expect(result.snapshot.overrides).toHaveLength(1)
    expect(result.snapshot.system).not.toBe(prior.system)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'VANE_RUNTIME_SCHEMA_MISMATCH' }))

    const removed: VaneRuntimeSnapshotV1 = {
      ...prior,
      overrides: [...prior.overrides, {
        token: ['gone'],
        address: { kind: 'base' },
        val: 'red',
      }],
    }
    expect(next.reconcileRuntimeSnapshot(removed).diagnostics)
      .toContainEqual(expect.objectContaining({ code: 'VANE_RUNTIME_UNKNOWN_TOKEN', token: ['gone'] }))
    const incompatible: VaneRuntimeSnapshotV1 = {
      ...prior,
      overrides: [...prior.overrides, {
        token: ['color', 'brand'],
        address: { kind: 'axis', axis: 'scheme', mode: 'light' },
        val: 'red',
      }, {
        token: ['ratio'],
        address: { kind: 'base' },
        val: 'not-a-number',
      }],
      modes: { motion: 'none' },
    }
    const diagnostics = next.reconcileRuntimeSnapshot(incompatible).diagnostics
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'VANE_RUNTIME_UNKNOWN_ADDRESS' }))
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'VANE_RUNTIME_INVALID_VALUE', token: ['ratio'] }))
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'VANE_RUNTIME_UNKNOWN_MODE', axis: 'motion' }))
    expect(() => next.reconcileRuntimeSnapshot({ ...prior, version: 2 })).toThrow(/unsupported runtime snapshot protocol/)
  })

  it('uses synchronous Standard Schema output and app-supplied schema registries', () => {
    const { ds, positive } = createFixture()
    const root = new MemoryRoot()
    const runtime = ds.runtime(root)

    runtime.t.ratio.$set(1.26)
    expect(runtime.snapshot().overrides[0]?.val).toBe('1.3')
    expect(ds.reconcileRuntimeSnapshot(runtime.snapshot()).snapshot.overrides[0]?.val).toBe('1.3')
    expect(() => runtime.t.ratio.$set(-1)).toThrow(/positive number/)
    runtime.t.fallbackRatio.$set(-1)
    expect(runtime.snapshot().overrides.find(entry => entry.token.join('.') === 'fallbackRatio')?.val).toBe('1')
    const beforeOmit = runtime.snapshot().overrides.length
    runtime.t.optionalRatio.$set(-1)
    expect(runtime.snapshot().overrides).toHaveLength(beforeOmit)

    const restored = ds.runtime(new MemoryRoot(), {
      validators: { 'positive-ratio': positive },
    })
    restored.t.ratio.$set(2)
    expect(restored.snapshot().overrides[0]?.val).toBe('2')

    const asyncSchema = {
      '~standard': {
        version: 1 as const,
        vendor: 'async-fixture',
        validate: async (input: unknown) => ({ value: input }),
      },
    }
    expect(() => ds.runtime(new MemoryRoot(), {
      validators: { 'positive-ratio': asyncSchema },
    }).t.ratio.$set(1)).toThrow(/async.*synchronous/)
  })

  it('rejects other-system handles while preserving compatible semantic snapshots', () => {
    const left = createFixture().ds
    const otherEngine = createEngine()
    const { returned: right } = emit(() => otherEngine.createSystem({
      prefix: 'other',
      root: '#app',
      tokens: { color: { brand: otherEngine.token.color({ mutable: true }) } },
    }))
    const runtime = left.runtime(new MemoryRoot())
    expect(() => runtime.applyTokenOverrides([[right.t.color.brand, 'red']])).toThrow(/another system/)
  })

  it('rebinds compatible HMR state by semantic address and supersedes stale controllers', () => {
    const root = new MemoryRoot()
    const first = createFixture().ds.runtime(root)
    first.t.color.brand.$set('hotpink')
    first.setScheme('dark')

    const nextSystem = createFixture(true).ds
    const rebound = nextSystem.runtime(root)
    expect(rebound.snapshot().overrides).toEqual([
      expect.objectContaining({ token: ['color', 'brand'], address: { kind: 'base' }, val: 'hotpink' }),
    ])
    expect(rebound.snapshot().modes).toEqual({ scheme: 'dark' })
    expect(rebound.diagnostics).toContainEqual(expect.objectContaining({ code: 'VANE_RUNTIME_SCHEMA_MISMATCH' }))
    expect(() => first.t.color.brand.$set('red')).toThrow(/superseded/)
  })

  it('records runtime schema identity and opaque address provenance in inspection data', () => {
    const { records } = collectInspection(() => createFixture())
    const system = records.find(record => record.kind === 'system')
    const token = records.find(record => record.kind === 'token' && record.path === 'color.brand')
    expect(system).toMatchObject({
      kind: 'system',
      runtime: { protocol: 1, root: '#app', system: expect.stringMatching(/^vane-runtime-1-/) },
    })
    expect(token).toMatchObject({
      kind: 'token',
      runtime: {
        type: 'color',
        addresses: [
          { address: { kind: 'base' }, slot: expect.stringMatching(/^--app-v-/) },
          { address: { kind: 'axis', axis: 'scheme', mode: 'dark' }, slot: expect.stringMatching(/^--app-v-/) },
        ],
      },
    })
    const manifest = buildManifest(records, '')
    expect(manifest.runtime?.system).toMatch(/^vane-runtime-1-/)
    expect(manifest.tokens['color.brand']?.runtime?.addresses).toHaveLength(2)
  })
})
