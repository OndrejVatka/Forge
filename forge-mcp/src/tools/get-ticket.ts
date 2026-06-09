import type { ForgeRepository } from '../db/repository.js';
import { NotFoundError } from '../errors.js';
import { jsonResult } from './result.js';
import { getTicketSchema } from './schemas.js';
import type { ForgeTool } from './types.js';

export function getTicketTool(repo: ForgeRepository): ForgeTool<typeof getTicketSchema.shape> {
  return {
    name: 'get_ticket',
    description:
      'Get a single ticket by its ref (e.g. "PI-42"), including its tags and full activity log (comments in chronological order).',
    schema: getTicketSchema,
    handler: async (input) => {
      const ticket = await repo.getTicketWithRelations(input.ticket_ref);
      if (!ticket) {
        throw new NotFoundError(`No ticket found with ref ${input.ticket_ref}.`);
      }
      return jsonResult(ticket);
    },
  };
}
