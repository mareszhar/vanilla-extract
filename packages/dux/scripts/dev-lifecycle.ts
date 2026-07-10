import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

const host = '127.0.0.1'
const httpPort = 3210
const hmrPort = 24678

async function main(): Promise<void> {
  await assertPortFree(httpPort)
  await assertPortFree(hmrPort, true)

  for (let cycle = 1; cycle <= 2; cycle++) {
    const child = spawn(
      'pnpm',
      ['--dir', 'sandbox/demo-main', 'run', 'dev', '--host', host, '--port', String(httpPort)],
      {
        cwd: new URL('..', import.meta.url),
        detached: process.platform !== 'win32',
        env: {
          ...process.env,
          CHOKIDAR_USEPOLLING: 'true',
          CHOKIDAR_INTERVAL: '100',
          NO_COLOR: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    let output = ''
    child.stdout?.on('data', chunk => output += String(chunk))
    child.stderr?.on('data', chunk => output += String(chunk))

    try {
      await waitForHttp(`http://${host}:${httpPort}`, child, () => output)
      await assertPortBusy(httpPort)
      await waitForPortBusy(hmrPort, output, true)
    }
    finally {
      await stopProcessTree(child.pid, child.exitCode)
    }

    await waitForPortFree(httpPort, output)
    await waitForPortFree(hmrPort, output, true)
    process.stdout.write(`[vane-dux] Nuxt dev lifecycle ${cycle}/2 released HTTP and HMR ports\n`)
  }
}

async function waitForHttp(url: string, child: ReturnType<typeof spawn>, output: () => string): Promise<void> {
  const deadline = Date.now() + 45_000

  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`Nuxt dev exited before becoming ready (${child.exitCode})\n${output()}`)

    try {
      const response = await fetch(url)

      if (response.ok)
        return
    }
    catch {}

    await delay(100)
  }

  throw new Error(`Nuxt dev did not become ready\n${output()}`)
}

async function stopProcessTree(pid: number | undefined, exitCode: number | null): Promise<void> {
  if (pid === undefined || exitCode !== null)
    return

  const target = process.platform === 'win32' ? pid : -pid

  try {
    process.kill(target, 'SIGTERM')
  }
  catch {
    return
  }

  await delay(250)

  try {
    process.kill(target, 0)
    process.kill(target, 'SIGKILL')
  }
  catch {}
}

async function waitForPortFree(port: number, output: string, anyHost = false): Promise<void> {
  const deadline = Date.now() + 5_000

  while (Date.now() < deadline) {
    if (await canListen(port, anyHost))
      return

    await delay(50)
  }

  throw new Error(`Port ${port} was not released after Nuxt dev stopped\n${output}`)
}

async function waitForPortBusy(port: number, output: string, anyHost = false): Promise<void> {
  const deadline = Date.now() + 5_000

  while (Date.now() < deadline) {
    if (!await canListen(port, anyHost))
      return

    await delay(50)
  }

  throw new Error(`Nuxt dev did not claim expected HMR port ${port}\n${output}`)
}

async function assertPortFree(port: number, anyHost = false): Promise<void> {
  if (!await canListen(port, anyHost))
    throw new Error(`Port ${port} is already occupied before the lifecycle test`)
}

async function assertPortBusy(port: number): Promise<void> {
  if (await canListen(port))
    throw new Error(`Expected Nuxt dev to own port ${port}`)
}

function canListen(port: number, anyHost = false): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.unref()
    server.once('error', () => resolve(false))
    const options = anyHost ? { port } : { host, port }
    server.listen(options, () => server.close(() => resolve(true)))
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
