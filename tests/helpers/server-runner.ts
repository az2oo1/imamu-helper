import { spawn, ChildProcess, execSync } from 'node:child_process';

let serverProcess: ChildProcess | null = null;
const DEFAULT_PORT = Number(process.env.TEST_PORT) || 3001;

function clearPort(port: number) {
  try {
    execSync(`fuser -k -9 ${port}/tcp`, { stdio: 'ignore' });
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

  serverProcess = spawn('npx', ['tsx', 'server.ts'], {
    env: {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout?.on('data', (chunk) => {
    if (process.env.DEBUG_TEST_SERVER) {
      console.log(`[Server stdout] ${chunk.toString().trim()}`);
    }
  });
  serverProcess.stderr?.on('data', (chunk) => {
    if (process.env.DEBUG_TEST_SERVER) {
      console.error(`[Server stderr] ${chunk.toString().trim()}`);
    }
  });

  const startTime = Date.now();
  while (Date.now() - startTime < 10000) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        return baseUrl;
      }
    } catch (_err) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Test server failed to start on port ${port} within timeout`);
}

export function stopServer(): void {
  // Retain server process across test files so mid-suite tests do not get ECONNRESET
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
