import type { ForgeRepository } from '../db/repository.js';
import { jsonResult } from './result.js';
import { listTicketsSchema } from './schemas.js';
import type { ForgeTool } from './types.js';

export function listTicketsTool(repo: ForgeRepository): ForgeTool<typeof listTicketsSchema.shape> {
  return {
    name: 'list_tickets',
    description:
      "List tickets with optional filters (project_id, status, priority, tags). The tags filter matches tickets having ANY of the given tags. Results include each ticket's tags and are ordered newest first. Supports limit (default 50) and offset for pagination.",
    schema: listTicketsSchema,
    handler: async (input) => {
      const tickets = await repo.listTickets({
        project_id: input.project_id,
        status: input.status,
        priority: input.priority,
        tags: input.tags,
        limit: input.limit,
        offset: input.offset,
      });
      return jsonResult(tickets);
    },
  };
}
