import { useState, type FormEvent, type ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';
import { ForgeMark } from '../components/ForgeMark.js';
import { FullScreenLoader } from '../components/Spinner.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';

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

  const isSignIn = mode === 'signin';

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);

    const action = isSignIn
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

  const toggleMode = (): void => {
    setMode(isSignIn ? 'signup' : 'signin');
    setError(null);
    setNotice(null);
  };

  return (
    <div className="page-content flex h-full items-center justify-center pt-6">
      <div className="w-full max-w-80">
        <ForgeMark size={32} />
        <h1 className="mt-5 text-xl font-semibold tracking-[-0.022em] text-fg">
          {isSignIn ? 'Sign in to Forge' : 'Create your Forge account'}
        </h1>
        <p className="mt-1 text-sm text-fg-tertiary">AI-native project management</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs text-fg-secondary">
            Email
            <Input
              type="email"
              size="lg"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-fg-secondary">
            Password
            <Input
              type="password"
              size="lg"
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
            />
          </label>

          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-xs text-success">
              {notice}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={submitting || !email.trim() || !password}
            className="mt-1"
          >
            {submitting ? 'Please wait…' : isSignIn ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-xs text-fg-tertiary">
          {isSignIn ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={toggleMode}
            className="cursor-pointer rounded-xs font-medium text-accent-text hover:underline"
          >
            {isSignIn ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
