import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { FullScreenLoader } from './components/Spinner.js';
import { Login } from './pages/Login.js';

// Code-split the authenticated pages so the heavy deps (dnd, react-markdown)
// load on demand rather than in the initial bundle.
const Board = lazy(() => import('./pages/Board.js').then((m) => ({ default: m.Board })));
const TicketDetail = lazy(() =>
  import('./pages/TicketDetail.js').then((m) => ({ default: m.TicketDetail })),
);
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })));

export function App(): ReactElement {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Board />} />
            <Route path="/ticket/:ref" element={<TicketDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
