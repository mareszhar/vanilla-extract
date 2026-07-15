/**
 * The live plane: the framework-free code that runs in the browser. Runtime code
 * writes custom-property values and attributes — it never constructs CSS rules
 * ([dux-patterns.md §1]).
 */

import type { VaneAtoms, VaneAtomsRuntime } from './atoms/types'
import type { VaneRuntimeHandle } from './internal/handle'
import type { VanePort, VanePortBindingOptions, VanePortMeta } from './ports/types'
import type { VaneAnatomy, VaneAnatomyRuntime, VaneRecipe, VaneRecipeRuntime } from './recipes/types'
import { createAtomsHandle } from './atoms/handle'
import { createHandle } from './internal/handle'
import { createPortHandle } from './ports/handle'
import { ports } from './ports/ports'
import { createAnatomyHandle, createRecipeHandle } from './recipes/handle'

export type { VaneAtomsRuntime } from './atoms/types'
export type { VanePort, VanePortBindingOptions, VanePortMeta, VanePortStyle, VanePortValue } from './ports/types'
export type { VaneAnatomyRuntime, VaneRecipeRuntime } from './recipes/types'
export {
  restoreRuntimeFactory,
  restoreRuntimeProps,
  restoreRuntimeReconciler,
  restoreRuntimeStyle,
  setCustomProperties,
  setCustomProperty,
} from './system/live'
export type {
  VaneBoundRuntime,
  VaneCustomPropertyEntries,
  VaneCustomPropertyReference,
  VaneCustomPropertyTarget,
  VaneRuntimeBaseOverrides,
  VaneRuntimeDiagnostic,
  VaneRuntimeDiagnosticCode,
  VaneRuntimeFactory,
  VaneRuntimeInput,
  VaneRuntimeOptions,
  VaneRuntimeReconciliation,
  VaneRuntimeRootProps,
  VaneRuntimeSnapshotOverride,
  VaneRuntimeSnapshotV1,
  VaneRuntimeStyleDeclaration,
  VaneRuntimeTarget,
  VaneRuntimeTokens,
} from './system/live'

/** Merge port/style fragments, skipping falsy entries. Re-exported from core. */
export { ports }

/**
 * Restores a token handle when a style module's exports are serialized for app
 * code. Generated import target — not for hand-written code.
 */
export function restoreToken(meta: Parameters<typeof createHandle>[0]): VaneRuntimeHandle {
  return createHandle(meta)
}

/**
 * Restores a port handle when a style module's exports are serialized for app
 * code. Generated import target — not for hand-written code.
 */
export function restorePort(meta: VanePortMeta): VanePort {
  return createPortHandle(meta)
}

/** Bind app/SSR validator implementations to a restored port without globals. */
export function bindPort<Port extends VanePort>(port: Port, options: VanePortBindingOptions): Port {
  return port.bind(options) as Port
}

/**
 * Restores a recipe handle from its serialized class table. Generated import
 * target — not for hand-written code.
 */
export function restoreRecipe(runtime: VaneRecipeRuntime): VaneRecipe<Record<string, unknown>> {
  return createRecipeHandle(runtime)
}

/**
 * Restores an anatomy handle from its serialized part-class tables. Generated
 * import target — not for hand-written code.
 */
export function restoreAnatomy(runtime: VaneAnatomyRuntime): VaneAnatomy<string, Record<string, unknown>> {
  return createAnatomyHandle(runtime)
}

/**
 * Restores an atoms handle from its serialized class tables. Runtime calls
 * resolve among the precompiled classes; an unsafe value gets the ports-lane
 * redirect. Generated import target — not for hand-written code.
 */
export function restoreAtoms(runtime: VaneAtomsRuntime): VaneAtoms<Record<string, unknown>> {
  return createAtomsHandle(runtime)
}

/**
 * Restores a build-plane authoring function as a throwing stub, so importing a
 * system style module from app code stays legal (`t`, override classes) while
 * calling `css`/`recipe`/`port` there fails with the lane redirect instead of
 * silently doing nothing. Generated import target — not for hand-written code.
 */
export function restoreBuildPlane(meta: { name: string }): () => never {
  return () => {
    throw new Error(
      `[vane] ${meta.name} is build-plane — it runs inside *.style.ts modules the compiler evaluates. `
      + `App code receives its results (classes, tokens, ports), never the function.`,
    )
  }
}
