import type { Ticket, TicketStatus, TicketWithRelations } from '@forge/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  createTicket,
  fetchTickets,
  updateTicketStatus,
  type CreateTicketInput,
} from '../lib/api.js';

const ticketsKey = (projectId: string | undefined): unknown[] => ['tickets', projectId];

export function useTickets(
  projectId: string | undefined,
): UseQueryResult<TicketWithRelations[], Error> {
  return useQuery({
    queryKey: ticketsKey(projectId),
    queryFn: () => fetchTickets(projectId ?? ''),
    enabled: Boolean(projectId),
  });
}

interface StatusChange {
  ticketId: string;
  status: TicketStatus;
}

/**
 * Move a ticket between columns with an optimistic cache update so the board
 * feels instant; the realtime subscription and refetch reconcile afterwards.
 */
export function useUpdateTicketStatus(
  projectId: string | undefined,
): UseMutationResult<void, Error, StatusChange, { previous: TicketWithRelations[] | undefined }> {
  const queryClient = useQueryClient();
  const key = ticketsKey(projectId);

  return useMutation({
    mutationFn: ({ ticketId, status }: StatusChange) => updateTicketStatus(ticketId, status),
    onMutate: async ({ ticketId, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TicketWithRelations[]>(key);
      if (previous) {
        queryClient.setQueryData<TicketWithRelations[]>(
          key,
          previous.map((ticket) => (ticket.id === ticketId ? { ...ticket, status } : ticket)),
        );
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useCreateTicket(
  projectId: string | undefined,
): UseMutationResult<Ticket, Error, CreateTicketInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketsKey(projectId) });
    },
  });
}
