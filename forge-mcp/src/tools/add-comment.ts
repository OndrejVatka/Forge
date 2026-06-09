import type { ForgeRepository } from '../db/repository.js';
import { NotFoundError } from '../errors.js';
import { jsonResult } from './result.js';
import { addCommentSchema } from './schemas.js';
import type { ForgeTool } from './types.js';

export function addCommentTool(repo: ForgeRepository): ForgeTool<typeof addCommentSchema.shape> {
  return {
    name: 'add_comment',
    description:
      'Add a comment to a ticket\'s activity log. Use this to log progress or flag a blocker while working on a ticket. Author defaults to "claude-code".',
    schema: addCommentSchema,
    handler: async (input) => {
      const ticket = await repo.getTicketByRef(input.ticket_ref);
      if (!ticket) {
        throw new NotFoundError(`No ticket found with ref ${input.ticket_ref}.`);
      }
      const comment = await repo.addComment(ticket.id, input.body, input.author);
      return jsonResult(comment);
    },
  };
}
