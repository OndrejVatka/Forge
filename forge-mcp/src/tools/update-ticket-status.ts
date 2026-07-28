import type { AgentIdentity } from '@forge/shared';
import type { ForgeRepository } from '../db/repository.js';
import { NotFoundError } from '../errors.js';
import { jsonResult } from './result.js';
import { updateTicketStatusSchema } from './schemas.js';
import type { ForgeTool } from './types.js';

export function updateTicketStatusTool(
  repo: ForgeRepository,
  agent: AgentIdentity,
): ForgeTool<typeof updateTicketStatusSchema.shape> {
  return {
    name: 'update_ticket_status',
    description:
      'Move a ticket to a different status column (backlog, in_dev, review, done). The status change is logged to the activity log automatically. Optionally pass a `comment` to add alongside the move.',
    schema: updateTicketStatusSchema,
    handler: async (input) => {
      const existing = await repo.getTicketByRef(input.ticket_ref);
      if (!existing) {
        throw new NotFoundError(`No ticket found with ref ${input.ticket_ref}.`);
      }

      // The "Status changed from X to Y" system comment is written by the
      // database trigger (so UI drag-and-drop logs it too) — we don't add it
      // here. We only persist the optional caller-supplied comment.
      await repo.updateTicketStatus(existing.id, input.status);
      if (input.comment) {
        await repo.addComment(existing.id, input.comment, agent);
      }

      const updated = await repo.getTicketWithRelations(input.ticket_ref);
      return jsonResult(updated);
    },
  };
}
