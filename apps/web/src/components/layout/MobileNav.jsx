import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight, Compass, LayoutGrid, User } from 'lucide-react';
import { matchesNav, onboardingEnabled, useOnboarding } from '../../lib/onboarding';
import { cn } from '../../lib/cn';
import { bouncy } from '../../lib/motion';
import { Drawer, ProgressBar, focusRing } from '../ui';

/** Names for pages that are not in the menu, shown in the back bar ("Studio › Topic editor"). */
const PAGE_TITLES = [
  [/^\/topics\/[^/]+\/quiz$/, 'Quiz'],
  [/^\/topics\/[^/]+$/, 'Topic'],
  [/^\/subjects\/[^/]+$/, 'Subject'],
  [/^\/learn\/[^/]+$/, 'Concept map'],
  [/^\/labs\/[^/]+$/, 'Lab'],
  [/^\/code\/[^/]+$/, 'Problem'],
  [/^\/code-lab\/[^/]+$/, 'Problems'],
  [/^\/exam-prep\/[^/]+$/, 'Subject'],
  [/^\/forms\/[^/]+$/, 'Form'],
  [/^\/studio\/forms\/[^/]+$/, 'Form editor'],
  [/^\/studio\/labs\/[^/]+$/, 'Lab editor'],
  [/^\/studio\/students\/[^/]+$/, 'Student report'],
  [/^\/studio\/subjects\/[^/]+\/content$/, 'Content upload'],
  [/^\/studio\/subjects\/[^/]+\/insights$/, 'Insights'],
  [/^\/studio\/subjects\/[^/]+\/overview$/, 'Overview editor'],
  [/^\/studio\/subjects\/[^/]+$/, 'Subject builder'],
  [/^\/studio\/topics\/[^/]+$/, 'Topic editor'],
  [/^\/mentor\/students\/[^/]+$/, 'Student'],
  [/^\/profile$/, 'My profile'],
  [/^\/search$/, 'Search'],
];

/** The menu item a page belongs to: the longest matching menu path. */
export function sectionOf(items, pathname) {
  return items
    .filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
}

/** Whether the page is one of the menu's own pages (no back bar there). */
export const isMenuPage = (items, pathname) =>
  pathname === '/' || items.some((i) => i.to === pathname);

/**
 * Phones: a slim bar above inner pages with Back and where you are, e.g. "Studio › Topic editor".
 * Back follows the browser history; a page opened directly goes to its menu page instead.
 */
export function BackBar({ items }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (isMenuPage(items, pathname)) return null;
  const section = sectionOf(items, pathname) ?? items[0];
  const title = PAGE_TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'Details';
  const back = () => {
    // React Router keeps the history position in history.state.idx.
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(section?.to ?? '/');
  };
  return (
    <nav
      aria-label="Back"
      className="no-print flex h-11 items-center gap-1 border-b border-line bg-card/90 px-2 backdrop-blur md:hidden"
    >
      <motion.button
        type="button"
        onClick={back}
        whileTap={{ scale: 0.92 }}
        className={cn(
          'inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-brand hover:bg-brand-soft',
          focusRing,
        )}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back
      </motion.button>
      <ol className="flex min-w-0 items-center gap-1 text-xs font-medium text-body">
        {section && (
          <li className="flex shrink-0 items-center gap-1">
            <span aria-hidden className="text-ink-subtle">
              |
            </span>
            <NavLink
              to={section.to}
              className="truncate rounded px-1 text-body hover:text-brand hover:no-underline"
            >
              {section.label}
            </NavLink>
          </li>
        )}
        <li className="flex min-w-0 items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
          <span aria-current="page" className="truncate font-semibold text-navy">
            {title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

/** The explorer quest's progress over the role's menu, while the quest is running. */
function useQuest(items) {
  const state = useOnboarding((s) => s.state);
  const active = onboardingEnabled() && state.splashSeen && !state.questDone && !state.questHidden;
  const explored = (state.explored ?? []).filter((to) => items.some((i) => i.to === to));
  return { active, explored, count: explored.length, total: items.length };
}

function TabLink({ to, end, icon: Icon, label, active, onClick, badge, as = 'link' }) {
  const body = (isActive) => (
    <>
      {isActive && (
        <motion.span
          layoutId="bottom-tab-active"
          aria-hidden
          className="absolute inset-0 rounded-full bg-brand-soft"
          transition={bouncy}
        />
      )}
      <motion.span
        className="relative inline-flex"
        animate={isActive ? { y: [0, -5, 0], scale: [1, 1.2, 1] } : { y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
        {badge}
      </motion.span>
      {/* One line only: long labels end in an ellipsis. */}
      <span className="relative max-w-full truncate">{label}</span>
    </>
  );
  const cls = (isActive) =>
    cn(
      'relative flex min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10px] font-semibold leading-tight transition-[background-color,box-shadow] hover:no-underline',
      isActive ? 'text-brand' : 'text-body',
      focusRing,
      'focus-visible:ring-offset-0',
    );
  if (as === 'button')
    return (
      <button type="button" onClick={onClick} aria-haspopup="dialog" className={cls(active)}>
        {body(active)}
      </button>
    );
  return (
    <NavLink to={to} end={end} className={({ isActive }) => cls(isActive)}>
      {({ isActive }) => body(isActive)}
    </NavLink>
  );
}

/**
 * Phones: a floating pill with the role's main pages and More. More opens a sheet with every
 * page (so nothing is reachable only from the desktop sidebar), the explorer quest's progress
 * and the profile.
 */
export function BottomTabs({ items, badges = {} }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const quest = useQuest(items);
  const mobile = items.filter((i) => i.mobile);
  // Everything fits: no More tab. Otherwise four tabs plus More.
  const hasMore = items.length > Math.min(mobile.length, 5);
  const tabs = mobile.slice(0, hasMore ? 4 : 5);
  const inMore = hasMore && !tabs.some((t) => matchesNav(t, pathname));
  const moreBadge = items.some((i) => badges[i.badge] > 0 && !tabs.includes(i));

  // Close the sheet when the page changes.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-30 md:hidden"
      >
        <ul
          className="glass grid rounded-full p-1 shadow-glass-lg"
          style={{
            gridTemplateColumns: `repeat(${tabs.length + (hasMore ? 1 : 0)}, minmax(0, 1fr))`,
          }}
        >
          {tabs.map((item) => (
            <li key={item.to}>
              <TabLink {...item} label={item.short ?? item.label} />
            </li>
          ))}
          {hasMore && (
            <li>
              <TabLink
                as="button"
                icon={LayoutGrid}
                label="More"
                active={inMore || open}
                onClick={() => setOpen(true)}
                badge={
                  quest.active ? (
                    <span className="absolute -right-3 -top-2 rounded-full bg-gold px-1 text-[9px] font-bold leading-4 text-navy">
                      {quest.count}/{quest.total}
                    </span>
                  ) : moreBadge ? (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-card" />
                  ) : null
                }
              />
            </li>
          )}
        </ul>
      </nav>
      <MoreSheet
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        badges={badges}
        quest={quest}
      />
    </>
  );
}

/** Every page of the role in one list; explored pages are ticked while the quest runs. */
function MoreSheet({ open, onClose, items, badges, quest }) {
  const update = useOnboarding((s) => s.update);
  return (
    <Drawer open={open} onClose={onClose} side="bottom" title="All pages">
      {quest.active && (
        <div className="mb-3 rounded-card border border-gold-border/50 bg-gold-tint p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Compass className="h-4 w-4" aria-hidden /> Quest: explore every page
          </p>
          <ProgressBar
            className="mt-2"
            value={(quest.count / quest.total) * 100}
            label={`${quest.count} of ${quest.total} explored`}
          />
          <button
            type="button"
            onClick={() => update({ questHidden: true })}
            className={cn('mt-1 text-xs font-semibold text-body hover:text-brand', focusRing)}
          >
            Hide quest
          </button>
        </div>
      )}
      <ul className="grid grid-cols-1 gap-1 xs:grid-cols-2">
        {items.map((item) => {
          const explored = quest.active && quest.explored.includes(item.to);
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[48px] items-center gap-3 rounded-md border px-3 text-sm font-medium hover:no-underline',
                    isActive
                      ? 'border-brand/30 bg-brand-soft font-semibold text-brand'
                      : 'border-line bg-card text-navy hover:border-brand/30',
                    focusRing,
                  )
                }
              >
                <span className="relative inline-flex">
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  {explored && (
                    <span className="absolute -bottom-1 -right-1.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gold text-navy">
                      <Check className="h-2.5 w-2.5" aria-hidden />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {explored && <span className="sr-only">(explored)</span>}
                {badges[item.badge] > 0 && (
                  <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                    {badges[item.badge]}
                    <span className="sr-only"> to do</span>
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
      <NavLink
        to="/profile"
        className={cn(
          'mt-3 flex min-h-[48px] items-center gap-3 rounded-md border-t border-line px-3 pt-1 text-sm font-medium text-navy hover:no-underline',
          focusRing,
        )}
      >
        <User className="h-5 w-5" aria-hidden /> My profile
      </NavLink>
    </Drawer>
  );
}
