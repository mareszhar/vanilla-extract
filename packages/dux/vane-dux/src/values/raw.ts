/** Typed escape lane for future CSS syntax vane does not yet understand. */

import type { VaneCssDataType, VaneCssValue } from './types'
import { ExpressionValue, rawNode } from './protocol'

export interface VaneRawValueConstructors {
  unknown: (syntax: string) => VaneCssValue<string, 'unknown'>
  declaration: (syntax: string) => VaneCssValue<string, 'declaration'>
  number: (syntax: string) => VaneCssValue<string, 'number'>
  integer: (syntax: string) => VaneCssValue<string, 'integer'>
  percentage: (syntax: string) => VaneCssValue<string, 'percentage'>
  numberPercentage: (syntax: string) => VaneCssValue<string, 'number-percentage'>
  length: (syntax: string) => VaneCssValue<string, 'length'>
  lengthPercentage: (syntax: string) => VaneCssValue<string, 'length-percentage'>
  angle: (syntax: string) => VaneCssValue<string, 'angle'>
  time: (syntax: string) => VaneCssValue<string, 'time'>
  frequency: (syntax: string) => VaneCssValue<string, 'frequency'>
  resolution: (syntax: string) => VaneCssValue<string, 'resolution'>
  flex: (syntax: string) => VaneCssValue<string, 'flex'>
  color: (syntax: string) => VaneCssValue<string, 'color'>
  image: (syntax: string) => VaneCssValue<string, 'image'>
  position: (syntax: string) => VaneCssValue<string, 'position'>
  easingFunction: (syntax: string) => VaneCssValue<string, 'easing-function'>
  transformFunction: (syntax: string) => VaneCssValue<string, 'transform-function'>
  transformList: (syntax: string) => VaneCssValue<string, 'transform-list'>
  customIdent: (syntax: string) => VaneCssValue<string, 'custom-ident'>
  dashedIdent: (syntax: string) => VaneCssValue<string, 'dashed-ident'>
  string: (syntax: string) => VaneCssValue<string, 'string'>
  url: (syntax: string) => VaneCssValue<string, 'url'>
  plugin: <const Name extends string>(name: Name, syntax: string) => VaneCssValue<string, `plugin:${Name}`>
}

function typed<Type extends VaneCssDataType>(type: Type, syntax: string): VaneCssValue<string, Type> {
  validateRawSyntax(syntax)
  return new ExpressionValue(rawNode(type, syntax, { helper: `rawValue.${type}` }))
}

export const rawValue: VaneRawValueConstructors = Object.freeze({
  unknown: (syntax: string) => typed('unknown', syntax),
  declaration: (syntax: string) => typed('declaration', syntax),
  number: (syntax: string) => typed('number', syntax),
  integer: (syntax: string) => typed('integer', syntax),
  percentage: (syntax: string) => typed('percentage', syntax),
  numberPercentage: (syntax: string) => typed('number-percentage', syntax),
  length: (syntax: string) => typed('length', syntax),
  lengthPercentage: (syntax: string) => typed('length-percentage', syntax),
  angle: (syntax: string) => typed('angle', syntax),
  time: (syntax: string) => typed('time', syntax),
  frequency: (syntax: string) => typed('frequency', syntax),
  resolution: (syntax: string) => typed('resolution', syntax),
  flex: (syntax: string) => typed('flex', syntax),
  color: (syntax: string) => typed('color', syntax),
  image: (syntax: string) => typed('image', syntax),
  position: (syntax: string) => typed('position', syntax),
  easingFunction: (syntax: string) => typed('easing-function', syntax),
  transformFunction: (syntax: string) => typed('transform-function', syntax),
  transformList: (syntax: string) => typed('transform-list', syntax),
  customIdent: (syntax: string) => typed('custom-ident', syntax),
  dashedIdent: (syntax: string) => typed('dashed-ident', syntax),
  string: (syntax: string) => typed('string', syntax),
  url: (syntax: string) => typed('url', syntax),
  plugin: <const Name extends string>(name: Name, syntax: string) => {
    if (name.trim().length === 0)
      throw new TypeError('[vane] a raw plugin value needs a non-empty data-type name')
    return typed(`plugin:${name}` as const, syntax)
  },
})

/** Broad token/balance safety without pretending to parse future grammar. */
function validateRawSyntax(syntax: string): void {
  if (syntax.trim().length === 0)
    throw new TypeError('[vane] a raw CSS value cannot be empty')
  if (syntax.includes('\0'))
    throw new TypeError('[vane] a raw CSS value cannot contain U+0000')

  const stack: string[] = []
  let quote: '"' | '\'' | undefined
  let escaped = false

  for (let index = 0; index < syntax.length; index++) {
    const char = syntax[index]!
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (quote) {
      if (char === quote)
        quote = undefined
      continue
    }
    if (char === '/' && syntax[index + 1] === '*') {
      const end = syntax.indexOf('*/', index + 2)
      if (end < 0)
        throw new TypeError('[vane] raw CSS has an unterminated comment')
      index = end + 1
      continue
    }
    if (char === '"' || char === '\'') {
      quote = char
      continue
    }
    if (char === '(' || char === '[' || char === '{') {
      stack.push(char)
    }
    else if (char === ')' || char === ']' || char === '}') {
      const opening = stack.pop()
      if (!opening || !matches(opening, char))
        throw new TypeError(`[vane] raw CSS has an unmatched '${char}'`)
    }
  }

  if (quote)
    throw new TypeError('[vane] raw CSS has an unterminated string')
  if (escaped)
    throw new TypeError('[vane] raw CSS has a dangling escape')
  if (stack.length > 0)
    throw new TypeError(`[vane] raw CSS has an unmatched '${stack.at(-1)}'`)
}

function matches(opening: string, closing: string): boolean {
  return (opening === '(' && closing === ')')
    || (opening === '[' && closing === ']')
    || (opening === '{' && closing === '}')
}
