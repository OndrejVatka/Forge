import type { AgentIdentity } from '@forge/shared';
import type { ForgeRepository } from '../db/repository.js';
import { NotFoundError, ValidationError } from '../errors.js';
import { jsonResult } from './result.js';
import { createTicketSchema } from './schemas.js';
import type { ForgeTool } from './types.js';

export function createTicketTool(
  repo: ForgeRepository,
  agent: AgentIdentity,
): ForgeTool<typeof createTicketSchema.shape> {
  return {
    name: 'create_ticket',
    description:
      'Create a new ticket in the backlog of a project. Returns the full ticket including its computed ref (e.g. "PI-42"). Always include acceptance_criteria describing what "done" looks like. Tags must already exist (feature, bug, chore, improvement, research, urgent).',
    schema: createTicketSchema,
    handler: async (input) => {
      const project = await repo.getProjectById(input.project_id);
      if (!project) {
        throw new NotFoundError(`No project found with id ${input.project_id}.`);
      }

      // Resolve and validate tags before consuming a ticket number, so an
      // invalid tag can't leave a gap in the per-project sequence.
      let tagIds: string[] = [];
      if (input.tags && input.tags.length > 0) {
        const { tags, missing } = await repo.resolveTags(input.tags);
        if (missing.length > 0) {
          throw new ValidationError(
            `Unknown tag(s): ${missing.join(', ')}. Create them in Settings first.`,
          );
        }
        tagIds = tags.map((tag) => tag.id);
      }

      const ticketNumber = await repo.nextTicketNumber(project.id);
      const ticketRef = `${project.prefix}-${ticketNumber}`;

      const ticket = await repo.insertTicket({
        project_id: project.id,
        ticket_number: ticketNumber,
        ticket_ref: ticketRef,
        title: input.title,
        description: input.description ?? null,
        acceptance_criteria: input.acceptance_criteria ?? null,
        priority: input.priority,
        created_by: agent,
      });

      if (tagIds.length > 0) {
        await repo.setTicketTags(ticket.id, tagIds);
      }
      await repo.addComment(ticket.id, `Ticket created by ${agent}`, 'system');

      const tags = await repo.getTicketTags(ticket.id);
      return jsonResult({ ...ticket, tags });
    },
  };
}
