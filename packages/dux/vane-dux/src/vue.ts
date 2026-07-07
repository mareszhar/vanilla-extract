import type { ComputedRef, CSSProperties, MaybeRefOrGetter } from 'vue'
import type { VaneRuntimeStyle } from './runtime'
import { computed, toValue } from 'vue'
import { ports } from './runtime'

export type VanePortSource = VaneRuntimeStyle | false | null | undefined
export type VanePortSourceFactory = () => VanePortSource | VanePortSource[]

export function usePorts(source: VanePortSourceFactory): ComputedRef<CSSProperties> {
  return computed(() => {
    const value = source()
    const styles = Array.isArray(value) ? value : [value]

    return ports(...styles) as CSSProperties
  })
}

export type VaneAnatomyResolver<TProps extends object, TParts extends Record<string, string>> = (props: TProps) => TParts

export function useAnatomy<TProps extends object, TParts extends Record<string, string>>(
  anatomy: VaneAnatomyResolver<TProps, TParts>,
  props: MaybeRefOrGetter<TProps>,
): ComputedRef<TParts> {
  return computed(() => anatomy(toValue(props)))
}
