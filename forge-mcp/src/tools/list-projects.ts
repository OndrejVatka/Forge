import type { ForgeRepository } from '../db/repository.js';
import { jsonResult } from './result.js';
import { listProjectsSchema } from './schemas.js';
import type { ForgeTool } from './types.js';

export function listProjectsTool(
  repo: ForgeRepository,
): ForgeTool<typeof listProjectsSchema.shape> {
  return {
    name: 'list_projects',
    description:
      'List all Forge projects. Returns each project with its id, name, slug, prefix, color, and description. Use the project id when creating tickets.',
    schema: listProjectsSchema,
    handler: async () => {
      const projects = await repo.listProjects();
      return jsonResult(projects);
    },
  };
}
