# ADR 0007: Python code lab in a Pyodide sandbox

- **Status:** Accepted
- **Date:** 2026-10-21

Faculty added Problem Solving and Python Programming (CSC26103) next to DBMS and asked for the
same LeetCode-style practice. Students in that subject write Python, so the code lab now runs
Python as well as SQL (ADR 0005).

## Decision

- **Engine:** Pyodide 0.28.3 (CPython compiled to WebAssembly), from npm. It is pure JS + WASM,
  so it needs no native build and no Python install, in Docker or on a laptop.
- **Process isolation:** each run executes in a child Node process (`pyRunner.js`), not a worker
  thread. The process starts with Node's permission model and may read only its own file,
  `apps/api/package.json` and the Pyodide folder. It cannot write files, spawn processes or open
  network connections. It gets an empty environment (`env: {}`), so no secrets are visible, and
  Pyodide's JavaScript bridge sees an empty `jsglobals`.
- **Python-level blocks:** `js`, `pyodide_js`, `os`, `subprocess`, `socket` and similar modules
  are set to `None` in `sys.modules`. After every run, `sys.modules` and module dictionaries are
  restored from a snapshot taken at startup, so one student's monkey-patching cannot leak into
  the next run.
- **Limits:** 3 s per run (the process is killed and a fresh one starts), 64 KB of output,
  5,000 characters of code and 2,000 of input. The process is recycled after 100 runs, stops
  after 10 idle minutes, and exits if the API goes away. Runs share the 40-per-minute limit.
- **Grading:** stdin/stdout, like competitive programming. A problem has up to 10 test inputs,
  some visible as examples and some hidden. The expected output comes from running the faculty
  solution (cached by problem version), so faculty never type expected output by hand. Output is
  compared after normalising line endings, trailing spaces and trailing blank lines.

## Consequences

- The first Python run after start-up or idle takes about 1–2 s while Pyodide loads; later runs
  take milliseconds. `warmPythonSandbox()` can preload it; the API does not call it at start-up,
  so instances that never serve Python never pay the memory cost.
- One Python process per API worker uses about 60–100 MB of memory. Raise
  `CODE_LAB_LIMITS.pythonWorkers` only on hosts with memory to spare.
- Only the standard library is available. Packages such as numpy are not loaded; first-year
  problems do not need them.
- Node's permission model is the main boundary. It is stable in Node 22 and experimental in
  Node 20. The hostile-code tests in `codelab.test.js` were run on Node 22; run them on the
  production Node version before deploying.
