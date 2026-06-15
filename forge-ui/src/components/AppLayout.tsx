import { LogOut, Settings as SettingsIcon, Zap } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';

export function AppLayout(): ReactElement {
  const { session, signOut } = useAuth();
  const email = session?.user.email ?? '';

  return (
    <div className="flex h-full flex-col">
      <header className="app-header flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Zap size={18} className="text-primary" />
          <span>Forge</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-surface-hover ${
                isActive ? 'text-text' : 'text-muted'
              }`
            }
            title="Settings"
          >
            <SettingsIcon size={16} />
            <span className="hidden sm:inline">Settings</span>
          </NavLink>

          {email && <span className="hidden px-2 text-xs text-muted md:inline">{email}</span>}

          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-text"
            title="Sign out"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </nav>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
