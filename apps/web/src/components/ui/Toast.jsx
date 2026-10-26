import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { create } from 'zustand';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';
import { bouncy } from '../../lib/motion';

let nextId = 1;

/** Toast queue (UI state only, so it lives in Zustand). */
export const useToastStore = create((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((s) => ({
      toasts: [...s.toasts.filter((t) => t.key !== toast.key || !toast.key), { id, ...toast }],
    }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Shows a toast. `key` replaces an existing toast with the same key (e.g. one "offline" toast).
 * @param {{ title: string, description?: string, tone?: 'info'|'success'|'error', key?: string, duration?: number }} t
 */
export const toast = (t) => useToastStore.getState().push(t);
toast.success = (title, description) => toast({ title, description, tone: 'success' });
toast.error = (title, description) => toast({ title, description, tone: 'error' });
toast.info = (title, description) => toast({ title, description, tone: 'info' });

const ICONS = { info: Info, success: CheckCircle2, error: AlertCircle };
// The tone shows in the icon chip; the glass panel itself stays neutral.
const TONES = {
  info: 'bg-blue/10 text-blue',
  success: 'bg-success/10 text-success',
  error: 'bg-red/10 text-red',
};

function ToastItem({ t }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const tone = t.tone ?? 'info';
  const Icon = ICONS[tone];
  useEffect(() => {
    const ms = t.duration ?? (tone === 'error' ? 8000 : 5000);
    const timer = setTimeout(() => dismiss(t.id), ms);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, tone, dismiss]);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } }}
      transition={bouncy}
      role={tone === 'error' ? 'alert' : 'status'}
      className="glass-strong pointer-events-auto flex w-full items-start gap-3 rounded-2xl p-3.5"
    >
      <motion.span
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...bouncy, delay: 0.08 }}
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          TONES[tone],
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </motion.span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-navy">{t.title}</p>
        {t.description && <p className="mt-0.5 text-sm text-body">{t.description}</p>}
      </div>
      <IconButton
        icon={X}
        label="Dismiss notification"
        onClick={() => dismiss(t.id)}
        className="-m-2"
      />
    </motion.div>
  );
}

/** Mount once at the app root. Sits above the mobile bottom tab bar. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] mx-auto flex max-w-md flex-col gap-2 px-4 md:bottom-6 md:right-6 md:left-auto md:mx-0"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
