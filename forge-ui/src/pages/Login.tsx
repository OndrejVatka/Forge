import { Zap } from 'lucide-react';
import { useState, type FormEvent, type ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';
import { FullScreenLoader } from '../components/Spinner.js';

type Mode = 'signin' | 'signup';

export function Login(): ReactElement {
  const { session, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/" replace />;

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);

    const action =
      mode === 'signin'
        ? signIn(email.trim(), password)
        : signUp(email.trim(), password).then((result) => {
            if (!result.error && result.needsConfirmation) {
              setNotice('Check your email to confirm your account, then sign in.');
              setMode('signin');
            }
            return result;
          });

    void action
      .then((result) => {
        if (result.error) setError(result.error);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Zap size={24} className="text-primary" />
          </div>
        </div>
        <h1 className="text-center text-xl font-semibold">Forge</h1>
        <p className="mt-1 text-center text-sm text-muted">AI-native project management</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-primary"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}
          {notice && <p className="text-xs text-emerald-400">{notice}</p>}

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full text-center text-xs text-muted hover:text-text"
        >
          {mode === 'signin'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
