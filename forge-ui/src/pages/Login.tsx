import { Zap } from 'lucide-react';
import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';
import { FullScreenLoader } from '../components/Spinner.js';

export function Login(): ReactElement {
  const { session, loading, signInWithGoogle } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/" replace />;

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Zap size={24} className="text-primary" />
          </div>
        </div>
        <h1 className="text-xl font-semibold">Forge</h1>
        <p className="mt-1 text-sm text-muted">AI-native project management</p>

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
