/**
 * Python sandbox for the code lab: a small pool of locked-down child processes (pyRunner.js).
 * Each process may only read Pyodide's files (Node permission model), gets no environment
 * variables, and is killed and replaced when a run passes its time limit. Processes are also
 * recycled every RECYCLE_AFTER runs so no state can build up between students.
 */
import { fork } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CODE_LAB_LIMITS } from '@acet/shared';
import { logger } from '../../lib/logger.js';

const require = createRequire(import.meta.url);
const RUNNER = fileURLToPath(new URL('./pyRunner.js', import.meta.url));
const RECYCLE_AFTER = 100;
/** Pyodide takes a few seconds to boot; that is not part of a run's time limit. */
const BOOT_TIMEOUT_MS = 60_000;

const PYODIDE_DIR = path.dirname(require.resolve('pyodide/package.json'));

function permissionArgs() {
  // Read: the runner, the package.json that makes it an ES module, and Pyodide. Nothing else,
  // and no write access at all.
  const readable = [RUNNER, path.join(path.dirname(RUNNER), '../../../package.json'), PYODIDE_DIR];
  const major = Number(process.versions.node.split('.')[0]);
  const flag = major >= 22 ? '--permission' : '--experimental-permission';
  return [flag, ...readable.map((p) => `--allow-fs-read=${p}`), '--max-old-space-size=192'];
}

class PyProcess {
  constructor() {
    this.busy = false;
    this.runs = 0;
    this.child = fork(RUNNER, [PYODIDE_DIR], {
      execArgv: permissionArgs(),
      env: {},
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      serialization: 'json',
    });
    this.child.stderr.on('data', (d) => logger.debug({ msg: String(d) }, 'python runner stderr'));
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Python sandbox did not start')),
        BOOT_TIMEOUT_MS,
      );
      const onMsg = (m) => {
        if (m?.ready) {
          clearTimeout(timer);
          this.child.off('message', onMsg);
          resolve();
        }
      };
      this.child.on('message', onMsg);
      this.child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Python sandbox exited during start (${code})`));
      });
    });
    this.ready.catch((err) => logger.error({ err }, 'python sandbox failed to start'));
  }

  kill() {
    this.child.kill('SIGKILL');
  }

  async run(job, timeoutMs) {
    await this.ready;
    this.runs += 1;
    const id = `${process.pid}-${this.runs}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      const finish = (result, dead = false) => {
        clearTimeout(timer);
        this.child.off('message', onMsg);
        this.child.off('exit', onExit);
        resolve({ result, dead });
      };
      const onMsg = (m) => m?.id === id && finish(m.result);
      const onExit = () =>
        finish(
          {
            ok: false,
            stage: 'engine',
            error: 'The program used too much memory.',
            stdout: '',
            stderr: '',
          },
          true,
        );
      const timer = setTimeout(() => {
        this.kill();
        finish(
          {
            ok: false,
            stage: 'timeout',
            error: `Stopped after ${timeoutMs / 1000} s. Look for a loop that never ends (check the loop condition and that the counter changes).`,
            stdout: '',
            stderr: '',
          },
          true,
        );
      }, timeoutMs);
      this.child.on('message', onMsg);
      this.child.once('exit', onExit);
      this.child.send({ id, job });
    });
  }
}

class PyPool {
  constructor(size) {
    this.procs = Array.from({ length: size }, () => new PyProcess());
    this.waiting = [];
  }

  acquire() {
    const free = this.procs.find((p) => !p.busy);
    if (free) {
      free.busy = true;
      return Promise.resolve(free);
    }
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  release(p) {
    const next = this.waiting.shift();
    if (next) next(p);
    else p.busy = false;
  }

  replace(p) {
    p.kill();
    const fresh = new PyProcess();
    fresh.busy = true;
    this.procs[this.procs.indexOf(p)] = fresh;
    return fresh;
  }

  async run(job, timeoutMs) {
    let p = await this.acquire();
    try {
      const { result, dead } = await p.run(job, timeoutMs);
      if (dead || p.runs >= RECYCLE_AFTER) p = this.replace(p);
      return result;
    } finally {
      this.release(p);
    }
  }

  close() {
    for (const p of this.procs) p.kill();
  }
}

let pool;
let idleTimer;
const getPool = () => {
  pool ??= new PyPool(CODE_LAB_LIMITS.pythonWorkers);
  // Interpreters hold memory: stop them after a quiet spell, start again on demand.
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => void closePythonSandbox(), CODE_LAB_LIMITS.pythonIdleMs);
  idleTimer.unref();
  return pool;
};

/**
 * Runs Python `code` with `input` as stdin.
 * @returns {Promise<{ ok: boolean, stdout: string, stderr: string, error?: string, stage?: string, truncated?: boolean, timeMs?: number }>}
 */
export function runPython(code, input = '', { timeoutMs = CODE_LAB_LIMITS.pythonTimeoutMs } = {}) {
  return getPool().run({ code, input, maxOutput: CODE_LAB_LIMITS.maxOutputChars }, timeoutMs);
}

/** Starts the processes early so the first student doesn't wait for Pyodide to boot. */
export function warmPythonSandbox() {
  getPool();
}

export async function closePythonSandbox() {
  if (pool) pool.close();
  pool = undefined;
}
