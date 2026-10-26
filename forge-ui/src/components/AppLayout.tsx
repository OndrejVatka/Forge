import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';
import { useForgeTheme } from '../lib/theme.js';
import { ForgeThemeContext } from '../lib/theme-context.js';
import { AppHeader } from './AppHeader.js';

export function AppLayout(): ReactElement {
  const { session, signOut } = useAuth();
  const themeState = useForgeTheme();

  return (
    <ForgeThemeContext.Provider value={themeState}>
      <div className="flex h-full flex-col">
        <AppHeader email={session?.user.email ?? ''} onSignOut={() => void signOut()} />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </ForgeThemeContext.Provider>
  );
}
