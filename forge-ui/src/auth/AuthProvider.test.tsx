import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPABASE_REST_CACHE } from '../lib/offline-cache.js';
import { AuthProvider, useAuth } from './AuthProvider.js';

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }));

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signOut: signOutMock,
    },
  },
}));

function renderAuth(queryClient: QueryClient) {
  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

describe('AuthProvider signOut', () => {
  let queryClient: QueryClient;
  let deleteCache: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient();
    queryClient.setQueryData(['tickets'], [{ id: 't1', title: 'Secret ticket' }]);
    deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: deleteCache });
    signOutMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('when sign-out succeeds', () => {
    it('should purge the service worker cache and the in-memory query cache', async () => {
      signOutMock.mockResolvedValue({ error: null });
      const { result } = renderAuth(queryClient);
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(() => result.current.signOut());

      expect(deleteCache).toHaveBeenCalledWith(SUPABASE_REST_CACHE);
      expect(queryClient.getQueryData(['tickets'])).toBeUndefined();
    });
  });

  describe('when the sign-out request fails', () => {
    it('should still purge both caches', async () => {
      signOutMock.mockRejectedValue(new Error('network down'));
      const { result } = renderAuth(queryClient);
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(result.current.signOut()).rejects.toThrow('network down');
      });

      expect(deleteCache).toHaveBeenCalledWith(SUPABASE_REST_CACHE);
      expect(queryClient.getQueryData(['tickets'])).toBeUndefined();
    });
  });

  describe('when CacheStorage is unavailable', () => {
    it('should still sign out and clear the query cache', async () => {
      vi.stubGlobal('caches', undefined);
      signOutMock.mockResolvedValue({ error: null });
      const { result } = renderAuth(queryClient);
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(() => result.current.signOut());

      expect(signOutMock).toHaveBeenCalledOnce();
      expect(queryClient.getQueryData(['tickets'])).toBeUndefined();
    });
  });
});
