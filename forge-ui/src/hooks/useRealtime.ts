import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Subscribe to Supabase Realtime for the active project so the board updates
 * live when Claude Code (or another client) creates or moves a ticket. Requires
 * the `tickets`/`comments` tables to be in the `supabase_realtime` publication
 * (see db/schema.sql and db/migrations/0003). If the subscription fails, the
 * board still works but only refreshes on reload, and the failure is logged.
 */
export function useRealtime(projectId: string | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const invalidate = (): void => {
      void queryClient.invalidateQueries({ queryKey: ['tickets', projectId] });
    };

    const channel = supabase
      .channel(`board:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `project_id=eq.${projectId}` },
        invalidate,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, invalidate)
      .subscribe(handleSubscribeStatus);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
}

/**
 * Logs a failed subscription instead of letting it pass silently. Supabase
 * rejects the whole channel when any one table is missing from the
 * publication, which went unnoticed until 2026-10-23 because nothing checked
 * this status. CLOSED is not logged: it also fires on normal cleanup when the
 * active project changes.
 */
function handleSubscribeStatus(status: REALTIME_SUBSCRIBE_STATES, err?: Error): void {
  if (
    status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
    status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
  ) {
    console.error(`[forge] live updates unavailable (${status}):`, err?.message ?? 'no detail');
  }
}
