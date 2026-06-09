import type { ForgeRepository, UpdateTicketData } from '../db/repository.js';
import { NotFoundError, ValidationError } from '../errors.js';
import { jsonResult } from './result.js';
import { updateTicketSchema } from './schemas.js';
import type { ForgeTool } from './types.js';

export function updateTicketTool(
  repo: ForgeRepository,
): ForgeTool<typeof updateTicketSchema.shape> {
  return {
    name: 'update_ticket',
    description:
      "Update a ticket's fields (title, description, acceptance_criteria, priority, tags). Tags, if provided, replace the existing tags entirely. A system comment summarising what changed is logged automatically. Use update_ticket_status to change status.",
    schema: updateTicketSchema,
    handler: async (input) => {
      const existing = await repo.getTicketByRef(input.ticket_ref);
      if (!existing) {
        throw new NotFoundError(`No ticket found with ref ${input.ticket_ref}.`);
      }

      // Validate tags before mutating anything.
      let newTagIds: string[] | null = null;
      if (input.tags !== undefined) {
        const { tags, missing } = await repo.resolveTags(input.tags);
        if (missing.length > 0) {
          throw new ValidationError(
            `Unknown tag(s): ${missing.join(', ')}. Create them in Settings first.`,
          );
        }
        newTagIds = tags.map((tag) => tag.id);
      }

      const patch: UpdateTicketData = {};
      const changes: string[] = [];

      if (input.title !== undefined && input.title !== existing.title) {
        patch.title = input.title;
        changes.push('title changed');
      }
      if (input.description !== undefined && input.description !== existing.description) {
        patch.description = input.description;
        changes.push('description updated');
      }
      if (
        input.acceptance_criteria !== undefined &&
        input.acceptance_criteria !== existing.acceptance_criteria
      ) {
        patch.acceptance_criteria = input.acceptance_criteria;
        changes.push('acceptance criteria updated');
      }
      if (input.priority !== undefined && input.priority !== existing.priority) {
        patch.priority = input.priority;
        changes.push(`priority changed from ${existing.priority} to ${input.priority}`);
      }

      if (Object.keys(patch).length > 0) {
        await repo.updateTicket(existing.id, patch);
      }

      if (newTagIds !== null) {
        const currentNames = (await repo.getTicketTags(existing.id)).map((tag) => tag.name).sort();
        const newNames = [...new Set(input.tags)].sort();
        const tagsChanged =
          currentNames.length !== newNames.length ||
          currentNames.some((name, index) => name !== newNames[index]);

        await repo.setTicketTags(existing.id, newTagIds);
        if (tagsChanged) {
          changes.push(
            newNames.length > 0 ? `tags changed to [${newNames.join(', ')}]` : 'tags cleared',
          );
        }
      }

      if (changes.length > 0) {
        await repo.addComment(existing.id, `Ticket updated: ${changes.join('; ')}`, 'system');
      }

      const updated = await repo.getTicketWithRelations(input.ticket_ref);
      return jsonResult(updated);
    },
  };
}
