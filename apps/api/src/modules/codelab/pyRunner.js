/**
 * Child process for the Python code lab (CPython 3.13 compiled to WebAssembly, via Pyodide).
 * Started by pySandbox.js with Node's permission model: it may only READ Pyodide's own files,
 * cannot write files, spawn processes or threads, and gets an empty environment, so student code
 * that escaped Python could still reach no secrets. Inside, Python sees no JavaScript globals
 * (`jsglobals: {}`) and cannot import the JS bridge modules.
 *
 * Protocol (IPC): { id, job: { code, input, maxOutput } } → { id, result }
 */
import { constants as fsConstants } from 'node:fs';
import { createRequire } from 'node:module';
import { constants as osConstants } from 'node:os';
import path from 'node:path';

// Pyodide's start-up reads fs flag constants through process.binding, which the permission
// model forbids. Answer only that, from the public modules; every other binding stays blocked.
process.binding = (name) => {
  if (name === 'constants') return { fs: fsConstants, os: osConstants };
  throw new Error(`process.binding('${name}') is not available`);
};

// The parent passes Pyodide's folder: module lookup would need to read files we may not read.
const pyodideDir = process.argv[2];
const require = createRequire(import.meta.url);
const { loadPyodide } = require(path.join(pyodideDir, 'pyodide.js'));
const indexURL = pyodideDir + path.sep;

const py = await loadPyodide({ indexURL, jsglobals: {}, stdout: () => {}, stderr: () => {} });

// Nothing below may be reachable from student code.
for (const name of ['fetch', 'WebSocket', 'EventSource', 'XMLHttpRequest', 'navigator']) {
  try {
    delete globalThis[name];
  } catch {
    // not deletable: fine
  }
}

// Python-side hardening, run once: no JS bridge, no package installs, no recursion bombs.
py.runPython(`
import sys
for _name in list(sys.modules):
    if _name.split('.')[0] in ('js', 'pyodide_js', 'micropip'):
        del sys.modules[_name]
for _name in ('js', 'pyodide_js', 'micropip', 'pyodide.ffi', 'pyodide.http', 'pyodide.webloop', 'ctypes', '_ctypes'):
    sys.modules[_name] = None   # import now raises ImportError
sys.setrecursionlimit(400)
del _name
`);

// Snapshot of the interpreter's shared state, taken in a private namespace (not __main__).
// reset() runs before every job, so nothing one program changes (print, sys.stdout, math.pi,
// imported modules) can affect the next student's run in this process.
const resetNs = py.globals.get('dict')();
py.runPython(
  `
import builtins, sys
_snapshot = {name: (mod, dict(mod.__dict__)) for name, mod in sys.modules.items() if mod is not None}
_blocked = {name for name, mod in sys.modules.items() if mod is None}

def reset():
    for name in list(sys.modules):
        if name not in _snapshot and name not in _blocked:
            del sys.modules[name]
    for name, (mod, saved) in _snapshot.items():
        sys.modules[name] = mod
        d = mod.__dict__
        if d != saved:
            d.clear()
            d.update(saved)
    for name in _blocked:
        sys.modules[name] = None
    sys.setrecursionlimit(400)
`,
  { globals: resetNs },
);
const reset = resetNs.get('reset');

const makeDict = py.globals.get('dict');

function run({ code, input = '', maxOutput = 65_536 }) {
  let stdout = '';
  let stderr = '';
  let truncated = false;
  const write = (which) => (text) => {
    const add = `${text}\n`;
    if (which === 'out') {
      if (stdout.length + add.length > maxOutput) {
        truncated = true;
        stdout += add.slice(0, Math.max(0, maxOutput - stdout.length));
        throw new Error('Output limit reached');
      }
      stdout += add;
    } else if (stderr.length < 8192) stderr += add;
  };
  const lines = input.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  let next = 0;
  reset();
  py.setStdin({ stdin: () => (next < lines.length ? lines[next++] : undefined) });
  py.setStdout({ batched: write('out') });
  py.setStderr({ batched: write('err') });

  const globals = makeDict();
  globals.set('__name__', '__main__');
  const t0 = performance.now();
  try {
    py.runPython(code, { globals, filename: 'solution.py' });
    return { ok: true, stdout, stderr, truncated, timeMs: Math.round(performance.now() - t0) };
  } catch (err) {
    const message = String(err?.message ?? err);
    // Keep only the student's part of the traceback.
    const lines2 = message.split('\n');
    const start = lines2.findIndex((l) => l.includes('File "solution.py"'));
    let error = (
      start >= 0 ? ['Traceback (most recent call last):', ...lines2.slice(start)] : lines2
    )
      .join('\n')
      .trim();
    if (!error || /MemoryError/.test(error))
      error = 'MemoryError: the program used too much memory.';
    return {
      ok: false,
      stage: truncated ? 'output' : 'code',
      error: truncated ? 'Your program printed too much output.' : error,
      stdout,
      stderr,
      truncated,
      timeMs: Math.round(performance.now() - t0),
    };
  } finally {
    globals.destroy();
  }
}

process.on('message', ({ id, job }) => {
  let result;
  try {
    result = run(job);
  } catch (err) {
    result = {
      ok: false,
      stage: 'engine',
      error: String(err?.message ?? err),
      stdout: '',
      stderr: '',
    };
  }
  process.send({ id, result });
});

// The API went away (crash, restart): don't linger.
process.on('disconnect', () => process.exit(0));

process.send({ ready: true });
