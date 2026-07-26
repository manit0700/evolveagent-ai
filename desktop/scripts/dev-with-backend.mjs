import http from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const desktopDir = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(desktopDir, '..')
const backendDir = path.join(repoRoot, 'backend')
const frontendDir = path.join(repoRoot, 'frontend')
const backendUrl = process.env.EVOLVEAGENT_BACKEND_URL || 'http://127.0.0.1:8000'
const healthUrl = `${backendUrl.replace(/\/$/, '')}/health`
const parsedBackendUrl = new URL(backendUrl)
const backendHost = parsedBackendUrl.hostname
const backendPort = parsedBackendUrl.port || '8000'
const localBackendHosts = new Set(['127.0.0.1', 'localhost', '::1'])

let backendProcess = null
let frontendProcess = null
let shuttingDown = false

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function checkHealth(timeoutMs = 700) {
  return new Promise((resolve) => {
    const req = http.get(healthUrl, { timeout: timeoutMs }, (res) => {
      res.resume()
      resolve(res.statusCode >= 200 && res.statusCode < 300)
    })
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
    req.on('error', () => resolve(false))
  })
}

async function waitForBackend() {
  for (let i = 0; i < 60; i += 1) {
    if (await checkHealth(1000)) return
    if (backendProcess && backendProcess.exitCode !== null) {
      throw new Error(
        `Backend exited before becoming healthy. Run "cd backend && source venv/bin/activate && python -m uvicorn app.main:app --reload --port ${backendPort}" to see the backend error.`,
      )
    }
    await wait(500)
  }
  throw new Error(`Backend did not become healthy at ${healthUrl}`)
}

function startBackend() {
  if (!localBackendHosts.has(backendHost)) {
    throw new Error(
      `EVOLVEAGENT_BACKEND_URL points to ${backendHost}. Start that backend yourself, or use a local URL such as http://127.0.0.1:8000.`,
    )
  }
  if (!existsSync(backendDir)) {
    throw new Error(`Backend directory not found: ${backendDir}`)
  }
  const venvPython = path.join(backendDir, 'venv', 'bin', 'python')
  const python = existsSync(venvPython) ? venvPython : 'python3'
  backendProcess = spawn(
    python,
    ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', backendHost, '--port', backendPort],
    {
      cwd: backendDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        PYTHONPATH: backendDir,
      },
    },
  )
  backendProcess.on('error', (error) => {
    console.error(`[desktop] failed to start backend: ${error.message}`)
  })
  backendProcess.on('exit', (code, signal) => {
    if (!shuttingDown && frontendProcess && frontendProcess.exitCode === null) {
      console.error(`[desktop] backend exited early (${signal || code})`)
      frontendProcess.kill('SIGTERM')
    }
  })
}

function startFrontend() {
  if (!existsSync(frontendDir)) {
    throw new Error(`Frontend directory not found: ${frontendDir}`)
  }
  frontendProcess = spawn(
    'npm',
    ['--prefix', frontendDir, 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_API_BASE: backendUrl,
      },
    },
  )
  frontendProcess.on('error', (error) => {
    console.error(`[desktop] failed to start frontend dev server: ${error.message}`)
  })
}

function shutdown() {
  shuttingDown = true
  if (frontendProcess && frontendProcess.exitCode === null) frontendProcess.kill('SIGTERM')
  if (backendProcess && backendProcess.exitCode === null) backendProcess.kill('SIGTERM')
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(130)
})
process.on('SIGTERM', () => {
  shutdown()
  process.exit(143)
})

try {
  const backendAlreadyRunning = await checkHealth()
  if (backendAlreadyRunning) {
    console.log(`[desktop] backend already healthy at ${healthUrl}`)
  } else {
    console.log(`[desktop] starting backend at ${backendUrl}`)
    startBackend()
    await waitForBackend()
    console.log(`[desktop] backend healthy at ${healthUrl}`)
  }

  console.log('[desktop] starting frontend dev server for Tauri')
  startFrontend()

  frontendProcess.on('exit', (code) => {
    if (!backendAlreadyRunning && backendProcess && backendProcess.exitCode === null) {
      shutdown()
    }
    process.exit(code ?? 0)
  })
} catch (error) {
  console.error(`[desktop] ${error.message}`)
  shutdown()
  process.exit(1)
}
