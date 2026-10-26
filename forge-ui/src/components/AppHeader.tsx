import { LogOut } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ForgeMark } from './ForgeMark.js';
import { ThemeMenu } from './ThemeSwitcher.js';
import { Button } from './ui/Button.js';

interface AppHeaderProps {
  email: string;
  onSignOut: () => void;
}

function NavTab({
  to,
  isActive,
  children,
}: {
  to: string;
  isActive: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={`tap-target inline-flex h-7 items-center rounded-sm px-2.5 text-sm font-medium tracking-[-0.012em] transition-[color,background-color] duration-[120ms] ${
        isActive
          ? 'bg-surface-hover text-fg'
          : 'text-fg-secondary hover:bg-surface-hover/60 hover:text-fg'
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * 44px app header: mark and wordmark, Board/Settings tabs, then the theme
 * menu, the signed-in email and sign-out. Safe-area padding lives in
 * `.app-header` (index.css).
 */
export function AppHeader({ email, onSignOut }: AppHeaderProps): ReactElement {
  const { pathname } = useLocation();
  // Ticket pages open from the board, so they keep the Board tab active.
  const isBoard = pathname === '/' || pathname.startsWith('/ticket/');

  return (
    <header className="app-header flex shrink-0 items-center gap-3 border-b border-border bg-bg">
      <Link to="/" className="flex items-center gap-2 pr-1 rounded-sm">
        <ForgeMark />
        <span className="text-sm font-semibold tracking-[-0.012em] text-fg">Forge</span>
      </Link>

      <nav aria-label="Main" className="flex items-center gap-0.5">
        <NavTab to="/" isActive={isBoard}>
          Board
        </NavTab>
        <NavTab to="/settings" isActive={pathname.startsWith('/settings')}>
          Settings
        </NavTab>
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeMenu />
        {email && (
          <span className="hidden px-1.5 text-xs whitespace-nowrap text-fg-tertiary sm:inline">
            {email}
          </span>
        )}
        <Button variant="ghost" icon={LogOut} label="Sign out" onClick={onSignOut} />
      </div>
    </header>
  );
}
