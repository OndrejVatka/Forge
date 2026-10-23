import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { useRealtime } from './useRealtime.js';

type StatusCallback = (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void;

const { channelState } = vi.hoisted(() => ({
  channelState: { subscribeCallback: undefined as StatusCallback | undefined },
}));

vi.mock('../lib/supabase.js', () => {
  const channel = {
    on: () => channel,
    subscribe: (callback?: StatusCallback) => {
      channelState.subscribeCallback = callback;
      return channel;
    },
  };
  return {
    supabase: {
      channel: () => channel,
      removeChannel: () => Promise.resolve('ok'),
    },
  };
});

function renderRealtime(): void {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  renderHook(() => useRealtime('project-1'), { wrapper });
}

function reportStatus(status: REALTIME_SUBSCRIBE_STATES, err?: Error): void {
  if (!channelState.subscribeCallback) throw new Error('subscribe() was called without a callback');
  channelState.subscribeCallback(status, err);
}

describe('useRealtime subscription status', () => {
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    channelState.subscribeCallback = undefined;
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderRealtime();
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  describe('when Supabase rejects the channel', () => {
    it('should log the failure with the server message', () => {
      reportStatus(
        REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR,
        new Error('Unable to subscribe to changes with given parameters'),
      );

      expect(consoleError).toHaveBeenCalledWith(
        '[forge] live updates unavailable (CHANNEL_ERROR):',
        'Unable to subscribe to changes with given parameters',
      );
    });
  });

  describe('when the subscription times out without an error object', () => {
    it('should still log the failure', () => {
      reportStatus(REALTIME_SUBSCRIBE_STATES.TIMED_OUT);

      expect(consoleError).toHaveBeenCalledWith(
        '[forge] live updates unavailable (TIMED_OUT):',
        'no detail',
      );
    });
  });

  describe('when the subscription succeeds or is closed on cleanup', () => {
    it('should not log anything', () => {
      reportStatus(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
      reportStatus(REALTIME_SUBSCRIBE_STATES.CLOSED);

      expect(consoleError).not.toHaveBeenCalled();
    });
  });
});
