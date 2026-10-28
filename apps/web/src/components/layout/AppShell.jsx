import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Download,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  User,
} from 'lucide-react';
import { useInstall } from '../../lib/pwa';
import { NAV } from '../../app/nav';
import { logout, useSession } from '../../features/auth/session';
import { useUi } from '../../lib/uiStore';
import { cn } from '../../lib/cn';
import { Avatar, IconButton, Menu, focusRing } from '../ui';
import { OfflineBanner } from './OfflineBanner';
import { bouncy, soft } from '../../lib/motion';
import { CelebrationLayer } from '../../features/student/game/Celebration';
import { LevelBadge } from '../../features/student/game/GameWidgets';
import { useGame, useLevelUpWatcher } from '../../features/student/game/useGame';
import { NotificationBell } from '../../features/notifications/NotificationBell';
import { useMyForms } from '../../features/forms/api';

const ROLE_LABEL = {
  student: 'Student',
  faculty: 'Faculty',
  mentor: 'Mentor',
  admin: 'HOD / Admin',
  coordinator: 'Academic Coordinator',
};

function Logo() {
  return (
    <Link
      to="/"
      className={cn('flex items-center gap-2 rounded-lg text-navy hover:no-underline', focusRing)}
    >
      <motion.img
        src="/brand/achariya-25-320.webp"
        alt=""
        width={40}
        height={40}
        initial={{ rotate: -20, scale: 0.6 }}
        animate={{ rotate: 0, scale: 1 }}
        whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.08 }}
        transition={bouncy}
        className="h-10 w-10 rounded-md shadow-press-red-sm"
      />
      <span className="font-heading text-xl font-bold">SkillUp</span>
      <span className="hidden text-xs font-semibold text-body sm:inline">ACET</span>
    </Link>
  );
}

function SearchBox({ className }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <label htmlFor="global-search" className="sr-only">
        Search subjects and topics
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy"
        aria-hidden
      />
      <input
        id="global-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search topics…"
        className="min-h-[44px] w-full rounded-md border border-line bg-surface pl-10 pr-4 text-sm text-navy placeholder:text-ink-subtle focus:border-brand focus:bg-card focus:outline-none focus:ring-4 focus:ring-brand/15"
      />
    </form>
  );
}

/** Students see their level, XP and streak in the top bar, and level ups get celebrated. */
function StudentGame() {
  const { game, progress } = useGame();
  useLevelUpWatcher(game);
  return <LevelBadge game={game} streak={progress.data?.revision.streakDays ?? 0} />;
}

/** Light / dark switch in the top bar (ADR 0014). */
export function ThemeToggle({ className }) {
  const dark = useUi((s) => s.theme === 'dark');
  const toggle = useUi((s) => s.toggleTheme);
  return (
    <IconButton
      icon={dark ? Sun : Moon}
      label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className={className}
    />
  );
}

function TopBar({ user }) {
  const navigate = useNavigate();
  const canInstall = useInstall((s) => Boolean(s.prompt));
  const install = useInstall((s) => s.install);
  return (
    // White app bar with a line hairline. 66px tall, so sticky offsets elsewhere (top-[66px]) line up.
    <header className="sticky top-0 z-30 border-b border-line bg-card">
      <div className="flex h-[66px] items-center gap-3 px-4 lg:px-6">
        <Logo />
        <SearchBox className="ml-auto hidden max-w-sm flex-1 sm:block" />
        <IconButton
          icon={Search}
          label="Search"
          className="ml-auto sm:hidden"
          onClick={() => navigate('/search')}
        />
        <NotificationBell />
        <ThemeToggle />
        {user.role === 'student' && <StudentGame />}
        <Menu
          label="Profile menu"
          trigger={
            <>
              <Avatar name={user.name} size="sm" />
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-sm font-semibold text-navy">{user.name}</span>
                <span className="block text-xs">{ROLE_LABEL[user.role]}</span>
              </span>
            </>
          }
          items={[
            { label: 'My profile', icon: User, onSelect: () => navigate('/profile') },
            ...(user.role === 'student'
              ? [{ label: 'My forms', icon: ClipboardList, onSelect: () => navigate('/forms') }]
              : []),
            ...(canInstall ? [{ label: 'Install app', icon: Download, onSelect: install }] : []),
            {
              label: 'Sign out',
              icon: LogOut,
              tone: 'danger',
              onSelect: async () => {
                await logout();
                navigate('/login', { replace: true });
              },
            },
          ]}
        />
      </div>
    </header>
  );
}

/** Counts shown on nav links with a `badge` key: a student's forms still to fill in. */
function useNavBadges(role) {
  const forms = useMyForms({ enabled: role === 'student' });
  return { forms: (forms.data ?? []).filter((f) => f.open.open && !f.responded).length };
}

function Sidebar({ items, badges = {} }) {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggle = useUi((s) => s.toggleSidebar);
  return (
    <aside
      className={cn(
        // A floating card rail, inset from the edges.
        'glass sticky top-[78px] my-3 ml-3 hidden h-[calc(100vh-90px)] shrink-0 flex-col rounded-card transition-[width] md:flex',
        collapsed ? 'w-[76px]' : 'w-60',
      )}
    >
      <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium text-body transition-colors hover:text-brand hover:no-underline',
                    isActive && 'font-semibold text-brand',
                    collapsed && 'justify-center',
                    focusRing,
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        aria-hidden
                        className="absolute inset-0 rounded-md bg-brand-soft"
                        transition={bouncy}
                      />
                    )}
                    <motion.span
                      className="relative inline-flex"
                      whileHover={{ scale: 1.2, rotate: -8 }}
                      transition={bouncy}
                    >
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                    </motion.span>
                    <span className={cn('relative', collapsed && 'sr-only')}>{item.label}</span>
                    {badges[item.badge] > 0 && (
                      <span
                        className={cn(
                          'relative ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white',
                          collapsed && 'absolute right-1.5 top-1.5 ml-0',
                        )}
                      >
                        {badges[item.badge]}
                        <span className="sr-only"> to do</span>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-line p-3">
        <IconButton
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          onClick={toggle}
          className={cn(!collapsed && 'ml-auto flex')}
        />
      </div>
    </aside>
  );
}

/** Mobile tabs: a floating white pill above the home indicator; the active tab is brand. */
function BottomTabs({ items }) {
  const tabs = items.filter((i) => i.mobile).slice(0, 4);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 md:hidden"
    >
      <ul
        className="glass grid rounded-full p-1.5 shadow-glass-lg"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-[background-color,box-shadow] hover:no-underline',
                  isActive ? 'text-brand' : 'text-body',
                  focusRing,
                  'focus-visible:ring-offset-0',
                )
              }
            >
              {({ isActive }) => (
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
                    <item.icon className="h-5 w-5" aria-hidden />
                  </motion.span>
                  <span className="relative">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Signed-in layout: top bar, collapsible sidebar (desktop), bottom tabs (< 768px). */
export function AppShell() {
  const user = useSession((s) => s.user);
  const items = NAV[user.role] ?? [];
  const badges = useNavBadges(user.role);
  const location = useLocation();
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <TopBar user={user} />
      <OfflineBanner />
      <div className="flex">
        <Sidebar items={items} badges={badges} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 pb-28 focus:outline-none md:pb-10">
          {/* Each section fades and rises in, like moving to the next level screen. Keyed on the
              first path segment only, so moving inside a section (topic to topic) keeps state. */}
          <motion.div
            key={location.pathname.split('/')[1] ?? ''}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={soft}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <BottomTabs items={items} />
      <CelebrationLayer />
    </div>
  );
}

/** Standard page container with consistent gutters (16px on phones). */
export function Page({ className, wide, children }) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-6 sm:px-6 lg:py-8',
        wide ? 'max-w-[1440px]' : 'max-w-6xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
