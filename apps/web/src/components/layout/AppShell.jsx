import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Download, LogOut, PanelLeftClose, PanelLeftOpen, Search, User } from 'lucide-react';
import { useInstall } from '../../lib/pwa';
import { NAV } from '../../app/nav';
import { logout, useSession } from '../../features/auth/session';
import { useUi } from '../../lib/uiStore';
import { cn } from '../../lib/cn';
import { Avatar, IconButton, Menu, focusRing } from '../ui';
import { OfflineBanner } from './OfflineBanner';

const ROLE_LABEL = {
  student: 'Student',
  faculty: 'Faculty',
  mentor: 'Mentor',
  admin: 'HOD / Admin',
};

function Logo() {
  return (
    <Link
      to="/"
      className={cn('flex items-center gap-2 rounded-lg text-navy hover:no-underline', focusRing)}
    >
      <span
        aria-hidden
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-navy font-heading text-sm font-extrabold text-gold shadow-press-navy-sm"
      >
        SU
      </span>
      <span className="font-heading text-xl font-extrabold">SkillUp</span>
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
        className="min-h-[44px] w-full rounded-full border border-navy/10 bg-white/60 pl-10 pr-4 text-sm text-navy shadow-[inset_0_1px_2px_rgb(15_45_92/0.06)] placeholder:text-body focus:border-blue focus:bg-white/90 focus:outline-none focus:ring-4 focus:ring-blue/15"
      />
    </form>
  );
}

function TopBar({ user }) {
  const navigate = useNavigate();
  const canInstall = useInstall((s) => Boolean(s.prompt));
  const install = useInstall((s) => s.install);
  return (
    // Frosted bar; the thin red rule along the bottom edge keeps the ACET brand accent.
    // 66px tall in total, like the old bar, so sticky offsets elsewhere (top-[66px]) still line up.
    <header className="glass sticky top-0 z-30 rounded-none border-0 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-red">
      <div className="flex h-[66px] items-center gap-3 px-4 lg:px-6">
        <Logo />
        <SearchBox className="ml-auto hidden max-w-sm flex-1 sm:block" />
        <IconButton
          icon={Search}
          label="Search"
          className="ml-auto sm:hidden"
          onClick={() => navigate('/search')}
        />
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

function Sidebar({ items }) {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggle = useUi((s) => s.toggleSidebar);
  return (
    <aside
      className={cn(
        // A floating glass rail, inset from the edges.
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
                    'relative flex min-h-[44px] items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-navy transition-[background-color,box-shadow] hover:bg-white/60 hover:no-underline',
                    isActive &&
                      'bg-white shadow-press-glass before:absolute before:inset-y-2.5 before:left-1 before:w-1 before:rounded-full before:bg-red',
                    collapsed && 'justify-center',
                    focusRing,
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-navy/[0.08] p-3">
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

/** Mobile tabs: a floating glass pill above the home indicator. */
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
                  isActive
                    ? 'bg-white text-navy shadow-press-glass after:absolute after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-red'
                    : 'text-body',
                  focusRing,
                  'focus-visible:ring-offset-0',
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
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
        <Sidebar items={items} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 pb-28 focus:outline-none md:pb-10">
          <Outlet />
        </main>
      </div>
      <BottomTabs items={items} />
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
