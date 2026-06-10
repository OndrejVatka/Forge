import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { Board } from './pages/Board.js';
import { Login } from './pages/Login.js';
import { Settings } from './pages/Settings.js';
import { TicketDetail } from './pages/TicketDetail.js';

export function App(): ReactElement {
  return (
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
  );
}
