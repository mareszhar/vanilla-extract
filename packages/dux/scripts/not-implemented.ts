import process from 'node:process'

const [, , command = 'command', phase = 'a later phase'] = process.argv

console.error(`[vane-dux] ${command} is scheduled for ${phase} and is not part of phase 0.`)
process.exit(1)
