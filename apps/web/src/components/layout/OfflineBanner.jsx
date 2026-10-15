import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** True while the browser reports a network connection. */
export function useOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** A clear banner while offline (F7). Cached screens keep working underneath. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-navy px-4 py-2 text-sm text-white"
    >
      <WifiOff className="h-4 w-4" aria-hidden />
      You are offline. Showing saved content; changes sync when you reconnect.
    </div>
  );
}
