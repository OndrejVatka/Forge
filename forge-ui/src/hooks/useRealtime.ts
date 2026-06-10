import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Subscribe to Supabase Realtime for the active project so the board updates
 * live when Claude Code (or another client) creates or moves a ticket. Requires
 * the `tickets`/`comments` tables to be in the `supabase_realtime` publication
 * (see db/schema.sql). No-ops silently if realtime isn't enabled.
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
}
