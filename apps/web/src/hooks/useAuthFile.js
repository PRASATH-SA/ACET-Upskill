import { useEffect, useState } from 'react';
import { api, API_BASE } from '../api/client';

/**
 * Fetches a protected file (videos, uploads) with the Bearer token and returns an object URL.
 * Plain `<video src>` can't send the token. Pass `enabled: false` to defer (low-data mode).
 * @param {string|undefined} url  absolute API path such as /api/v1/resources/:id/file
 */
export function useAuthFile(url, enabled = true) {
  const [state, setState] = useState({ src: null, error: null, loading: false });
  useEffect(() => {
    if (!url || !enabled) return undefined;
    const ctrl = new AbortController();
    let objectUrl;
    setState({ src: null, error: null, loading: true });
    const path = url.startsWith(API_BASE) ? url.slice(API_BASE.length) : url;
    api(path, { raw: true, signal: ctrl.signal })
      .then((res) => res.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setState({ src: objectUrl, error: null, loading: false });
      })
      .catch((error) => {
        if (!ctrl.signal.aborted) setState({ src: null, error, loading: false });
      });
    return () => {
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, enabled]);
  return state;
}

/** Downloads a protected file and saves it with the given name. */
export async function downloadAuthFile(path, filename) {
  const res = await api(path, { raw: true });
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
