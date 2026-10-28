/**
 * Worker thread for the code lab: runs SQL in SQLite compiled to WebAssembly (sql.js).
 * Every job gets a fresh in-memory database, so nothing a student writes survives the job,
 * and sql.js has no access to the host file system or network. The parent kills this
 * worker if a job runs past its time limit (see sandbox.js).
 */
import { createRequire } from 'node:module';
import { parentPort } from 'node:worker_threads';

const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');
const SQL = await initSqlJs({ locateFile: (f) => require.resolve(`sql.js/dist/${f}`) });

/**
 * Never called. sql.js finds its .wasm through locateFile, which Vercel's file tracer
 * (@vercel/nft) cannot follow, so without this literal require() the deployed API has no
 * SQLite and every SQL challenge fails with a 500.
 */
export const bundledSqlWasm = () => require('sql.js/dist/sql-wasm.wasm');

/** SQLite's own allocator cap. The pragma can lower this limit but never raise it. */
const HEAP_LIMIT_BYTES = 64 * 1024 * 1024;

/** The last statement that returned columns, as { columns, rows }. */
function lastResult(results) {
  const r = results.at(-1);
  return r ? { columns: r.columns, rows: r.values } : { columns: [], rows: [] };
}

function runJob({ steps, maxRows }) {
  const db = new SQL.Database();
  try {
    db.exec(`PRAGMA hard_heap_limit = ${HEAP_LIMIT_BYTES};`);
    let out = { columns: [], rows: [] };
    for (const step of steps) {
      try {
        const res = db.exec(step.sql);
        if (step.capture) out = lastResult(res);
      } catch (err) {
        return { ok: false, stage: step.stage, error: String(err?.message ?? err) };
      }
    }
    const truncated = out.rows.length > maxRows;
    return {
      ok: true,
      columns: out.columns,
      rows: truncated ? out.rows.slice(0, maxRows) : out.rows,
      rowCount: out.rows.length,
      truncated,
    };
  } finally {
    db.close();
  }
}

parentPort.on('message', ({ id, job }) => {
  let result;
  try {
    result = runJob(job);
  } catch (err) {
    result = { ok: false, stage: 'engine', error: String(err?.message ?? err) };
  }
  // Blobs become hex so results stay plain JSON.
  if (result.rows)
    result.rows = result.rows.map((row) =>
      row.map((v) => (v instanceof Uint8Array ? `x'${Buffer.from(v).toString('hex')}'` : v)),
    );
  parentPort.postMessage({ id, result });
});

parentPort.postMessage({ ready: true });
