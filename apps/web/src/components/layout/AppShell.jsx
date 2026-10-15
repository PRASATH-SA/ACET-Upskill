import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, PanelLeftClose, PanelLeftOpen, Search, User } from 'lucide-react';
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
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-navy font-heading text-sm font-extrabold text-gold"
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
        className="min-h-[44px] w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-navy placeholder:text-body focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30"
      />
    </form>
  );
}

function TopBar({ user }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b-2 border-red bg-card">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
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
        'sticky top-[66px] hidden h-[calc(100vh-66px)] shrink-0 flex-col border-r border-line bg-card transition-[width] md:flex',
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
                    'relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold text-navy hover:bg-surface hover:no-underline',
                    isActive &&
                      'bg-surface before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-red',
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

function BottomTabs({ items }) {
  const tabs = items.filter((i) => i.mobile).slice(0, 4);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-0.5 border-t-2 text-[11px] font-semibold hover:no-underline',
                  isActive ? 'border-red text-navy' : 'border-transparent text-body',
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
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 pb-24 focus:outline-none md:pb-10">
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
