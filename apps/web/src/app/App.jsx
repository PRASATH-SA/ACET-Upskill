import { useEffect, useState } from 'react';
import { fetchHealth } from '../api/health';

function StatusRow({ label, value, good }) {
  return (
    <div className="flex items-center justify-between border-t border-line py-3 first:border-t-0">
      <span className="font-medium text-navy">{label}</span>
      <span className={`font-semibold ${good ? 'text-blue' : 'text-red'}`}>{value}</span>
    </div>
  );
}

export function App() {
  const [state, setState] = useState({ kind: 'loading' });

  const load = () => {
    setState({ kind: 'loading' });
    const ctrl = new AbortController();
    fetchHealth(ctrl.signal)
      .then((health) => setState({ kind: 'ok', health }))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState({ kind: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      });
    return () => ctrl.abort();
  };

  useEffect(load, []);

  return (
    <div className="min-h-screen">
      <header className="border-b-2 border-red bg-card">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-4">
          <span className="font-heading text-xl font-extrabold text-navy">SkillUp</span>
          <span className="ml-2 text-sm">ACET</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="eyebrow">System status</p>
        <h1 className="mt-2 text-3xl">Learn the flow, not the list</h1>
        <p className="mt-3 max-w-prose">
          This is the Phase 0 placeholder page. It checks that the web app can reach the API and
          that the API can reach MongoDB.
        </p>

        <section className="card mt-8 max-w-md p-6" aria-live="polite">
          {state.kind === 'loading' && <p>Checking the API…</p>}
          {state.kind === 'ok' && (
            <>
              <StatusRow
                label="API"
                value={state.health.status}
                good={state.health.status === 'ok'}
              />
              <StatusRow
                label="Mongo"
                value={state.health.mongo}
                good={state.health.mongo === 'ok'}
              />
              {state.health.version && (
                <StatusRow label="Version" value={state.health.version} good />
              )}
            </>
          )}
          {state.kind === 'error' && (
            <>
              <StatusRow label="API" value="offline" good={false} />
              <p className="mt-3 text-sm">
                The API could not be reached ({state.message}). Start it, then try again.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={load}
            className="mt-6 min-h-[44px] rounded-full bg-red px-6 font-semibold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
          >
            Check again
          </button>
        </section>
      </main>
    </div>
  );
}
