import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellRing, CheckCheck, ClipboardList, Trophy } from 'lucide-react';
import { Button, Drawer, EmptyState, IconButton, LoadingBlock, toast } from '../../components/ui';
import { cn } from '../../lib/cn';
import { bouncy, item, stagger } from '../../lib/motion';
import { useMarkRead, useNotifications } from './api';

const ICONS = { 'form.published': ClipboardList, 'form.scoreReleased': Trophy };

const ago = (d) => {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });
};

/**
 * Top-bar bell (ADR 0015): unread count, a toast when something new arrives while the app is
 * open, and a drawer listing recent notifications. Opening one marks it read and follows its link.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const feed = useNotifications();
  const markRead = useMarkRead();
  const unread = feed.data?.unread ?? 0;
  const seen = useRef(null);

  // Toast the newest unread item once per new arrival (not on the first load).
  useEffect(() => {
    const newest = feed.data?.items.find((n) => !n.readAt);
    if (!feed.data) return;
    if (seen.current !== null && newest && newest.id !== seen.current && unread > 0) {
      toast({ title: newest.title, description: newest.body, tone: 'info', key: 'notification' });
    }
    seen.current = newest?.id ?? '';
  }, [feed.data, unread]);

  const openItem = (n) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <>
      <span className="relative inline-flex">
        <IconButton
          icon={unread ? BellRing : Bell}
          label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          onClick={() => setOpen(true)}
        />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="count"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={bouncy}
              aria-hidden
              className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white ring-2 ring-card"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        footer={
          unread > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              icon={CheckCheck}
              loading={markRead.isPending}
              onClick={() => markRead.mutate(undefined)}
            >
              Mark all as read
            </Button>
          ) : null
        }
      >
        {feed.isPending ? (
          <LoadingBlock />
        ) : !feed.data?.items.length ? (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="New forms and released quiz scores show up here."
          />
        ) : (
          <motion.ul className="space-y-2" {...stagger}>
            {feed.data.items.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              return (
                <motion.li key={n.id} {...item}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors hover:border-brand/40 hover:bg-brand-soft',
                      n.readAt ? 'border-line bg-card' : 'border-brand/30 bg-brand-soft/60',
                    )}
                  >
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-navy">{n.title}</span>
                      {n.body && <span className="mt-0.5 block text-xs">{n.body}</span>}
                      <span className="mt-1 block text-xs text-ink-subtle">{ago(n.updatedAt)}</span>
                    </span>
                    {!n.readAt && (
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand">
                        <span className="sr-only">Unread</span>
                      </span>
                    )}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </Drawer>
    </>
  );
}
