import type { Comment, CommentAuthor, TicketStatus, TicketWithRelations } from '@forge/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  addComment,
  fetchTicketByRef,
  updateTicket,
  updateTicketStatus,
  type UpdateTicketFields,
} from '../lib/api.js';

const ticketKey = (ref: string | undefined): unknown[] => ['ticket', ref];

export function useTicket(
  ref: string | undefined,
): UseQueryResult<TicketWithRelations | null, Error> {
  return useQuery({
    queryKey: ticketKey(ref),
    queryFn: () => fetchTicketByRef(ref ?? ''),
    enabled: Boolean(ref),
  });
}

/** Invalidate both the open ticket and every board list. */
function useTicketInvalidator(ref: string | undefined): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ticketKey(ref) });
    void queryClient.invalidateQueries({ queryKey: ['tickets'] });
  };
}

export function useSetTicketStatus(
  ref: string | undefined,
): UseMutationResult<void, Error, { ticketId: string; status: TicketStatus }> {
  const invalidate = useTicketInvalidator(ref);
  return useMutation({
    mutationFn: ({ ticketId, status }) => updateTicketStatus(ticketId, status),
    onSuccess: invalidate,
  });
}

export function useUpdateTicket(
  ref: string | undefined,
): UseMutationResult<void, Error, { existing: TicketWithRelations; fields: UpdateTicketFields }> {
  const invalidate = useTicketInvalidator(ref);
  return useMutation({
    mutationFn: ({ existing, fields }) => updateTicket(existing, fields),
    onSuccess: invalidate,
  });
}

export function useAddComment(
  ref: string | undefined,
): UseMutationResult<Comment, Error, { ticketId: string; body: string; author: CommentAuthor }> {
  const invalidate = useTicketInvalidator(ref);
  return useMutation({
    mutationFn: ({ ticketId, body, author }) => addComment(ticketId, body, author),
    onSuccess: invalidate,
  });
}
