import { spawn, ChildProcess, execSync } from 'node:child_process';

let serverProcess: ChildProcess | null = null;
const DEFAULT_PORT = Number(process.env.TEST_PORT) || 3001;

function clearPort(port: number) {
  try {
    if (process.platform === 'win32') {
      execSync(`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' });
    } else {
      execSync(`fuser -k -9 ${port}/tcp`, { stdio: 'ignore' });
    }
  } catch (_e) {}
}

export async function ensureServerRunning(port: number = DEFAULT_PORT): Promise<string> {
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const testRes = await fetch(`${baseUrl}/api/health`);
    if (testRes.ok) {
      return baseUrl;
    }
  } catch (_e) {}

  clearPort(port);
  await new Promise((r) => setTimeout(r, 200));

  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  let startupError = '';
  serverProcess = spawn(npxCmd, ['tsx', 'server.ts'], {
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stderr?.on('data', (chunk) => {
    startupError += chunk.toString();
  });

  const startTime = Date.now();
  while (Date.now() - startTime < 25000) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        return baseUrl;
      }
    } catch (_err) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  throw new Error(`Test server failed to start on port ${port} within timeout: ${startupError}`);
}

export function stopServer(): void {
  if (serverProcess) {
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGKILL');
      }
    } catch (_e) {}
    serverProcess = null;
  }
}

process.on('exit', () => {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGKILL');
    } catch (_e) {}
    serverProcess = null;
  }
  clearPort(DEFAULT_PORT);
});
