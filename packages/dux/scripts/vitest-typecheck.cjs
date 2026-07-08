#!/usr/bin/env node

const { spawn } = require('node:child_process')
const { createRequire } = require('node:module')

const requireFromCwd = createRequire(`${process.cwd()}/package.json`)
const tscBin = requireFromCwd.resolve('typescript/bin/tsc')

const args = []

for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i]

  if (arg === '--incremental') {
    continue
  }

  if (arg === '--tsBuildInfoFile') {
    i += 1
    continue
  }

  if (arg.startsWith('--tsBuildInfoFile=')) {
    continue
  }

  args.push(arg)
}

const child = spawn(process.execPath, [tscBin, ...args], {
  cwd: process.cwd(),
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(signal === 'SIGINT' ? 130 : 143)
  }

  process.exit(code ?? 1)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal)
  })
}
