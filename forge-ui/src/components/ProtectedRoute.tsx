import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';
import { FullScreenLoader } from './Spinner.js';

/** Gate for authenticated routes: redirects to /login when there's no session. */
export function ProtectedRoute(): ReactElement {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
