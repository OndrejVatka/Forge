import type { AgentIdentity, Comment, Project, TicketWithRelations } from '@forge/shared';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeEach } from 'vitest';
import type { ZodRawShape } from 'zod';
import { NotFoundError, ValidationError } from '../src/errors.js';
import { addCommentTool } from '../src/tools/add-comment.js';
import { createTicketTool } from '../src/tools/create-ticket.js';
import { getTicketTool } from '../src/tools/get-ticket.js';
import { listProjectsTool } from '../src/tools/list-projects.js';
import { listTicketsTool } from '../src/tools/list-tickets.js';
import type { ForgeTool } from '../src/tools/types.js';
import { updateTicketStatusTool } from '../src/tools/update-ticket-status.js';
import { updateTicketTool } from '../src/tools/update-ticket.js';
import { FakeForgeRepository } from './fake-repository.js';

/** Parse-and-run a tool the way the SDK would (defaults applied), returning its result. */
async function run<Shape extends ZodRawShape>(
  tool: ForgeTool<Shape>,
  input: unknown,
): Promise<CallToolResult> {
  return tool.handler(tool.schema.parse(input));
}

/** Extract the JSON payload from a tool result. */
function payload<T>(result: CallToolResult): T {
  const first = result.content[0];
  if (!first || first.type !== 'text') throw new Error('expected text content');
  return JSON.parse(first.text) as T;
}

/** Identity the tools are built with, standing in for a resolved API key. */
const AGENT: AgentIdentity = 'claude-code';

let repo: FakeForgeRepository;
beforeEach(() => {
  repo = new FakeForgeRepository();
});

describe('list_projects', () => {
  it('should return the seeded projects', async () => {
    const result = await run(listProjectsTool(repo), {});
    const projects = payload<Project[]>(result);
    expect(projects).toHaveLength(1);
    expect(projects[0]?.prefix).toBe('PI');
  });
});

describe('create_ticket', () => {
  it('should assign sequential refs and default to the backlog', async () => {
    const first = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), {
        project_id: repo.seededProjectId,
        title: 'First',
      }),
    );
    const second = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), {
        project_id: repo.seededProjectId,
        title: 'Second',
      }),
    );

    expect(first.ticket_ref).toBe('PI-1');
    expect(second.ticket_ref).toBe('PI-2');
    expect(first.status).toBe('backlog');
    expect(first.created_by).toBe('claude-code');
  });

  it('should log a system "created by" comment naming the authenticated agent', async () => {
    const ticket = payload<TicketWithRelations>(
      await run(createTicketTool(repo, 'hermes'), {
        project_id: repo.seededProjectId,
        title: 'Logged',
      }),
    );
    const log = payload<TicketWithRelations>(
      await run(getTicketTool(repo), { ticket_ref: ticket.ticket_ref }),
    );
    expect(
      log.comments?.some((c) => c.author === 'system' && c.body === 'Ticket created by hermes'),
    ).toBe(true);
  });

  it('should attribute the ticket to the authenticated agent, ignoring caller-supplied input', async () => {
    const ticket = payload<TicketWithRelations>(
      await run(createTicketTool(repo, 'hermes'), {
        project_id: repo.seededProjectId,
        title: 'Impersonation attempt',
        created_by: 'claude-code',
      }),
    );
    expect(ticket.created_by).toBe('hermes');
  });

  it('should attach valid tags', async () => {
    const ticket = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), {
        project_id: repo.seededProjectId,
        title: 'Tagged',
        tags: ['feature', 'urgent'],
      }),
    );
    expect(ticket.tags.map((t) => t.name).sort()).toEqual(['feature', 'urgent']);
  });

  it('should reject an unknown project', async () => {
    await expect(
      run(createTicketTool(repo, AGENT), { project_id: randomUUID(), title: 'Nope' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should reject unknown tags and not consume a ticket number', async () => {
    await expect(
      run(createTicketTool(repo, AGENT), {
        project_id: repo.seededProjectId,
        title: 'Bad tag',
        tags: ['nonexistent'],
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    // Next successful create should still be PI-1 (no number burned).
    const ok = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), { project_id: repo.seededProjectId, title: 'OK' }),
    );
    expect(ok.ticket_ref).toBe('PI-1');
  });
});

describe('get_ticket', () => {
  it('should reject an unknown ref', async () => {
    await expect(run(getTicketTool(repo), { ticket_ref: 'PI-999' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('update_ticket', () => {
  it('should change priority and log a descriptive system comment', async () => {
    const created = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), {
        project_id: repo.seededProjectId,
        title: 'Reprioritise',
      }),
    );
    const updated = payload<TicketWithRelations>(
      await run(updateTicketTool(repo), { ticket_ref: created.ticket_ref, priority: 'high' }),
    );

    expect(updated.priority).toBe('high');
    expect(
      updated.comments?.some(
        (c) => c.author === 'system' && c.body.includes('priority changed from medium to high'),
      ),
    ).toBe(true);
  });

  it('should replace tags entirely', async () => {
    const created = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), {
        project_id: repo.seededProjectId,
        title: 'Retag',
        tags: ['bug'],
      }),
    );
    const updated = payload<TicketWithRelations>(
      await run(updateTicketTool(repo), { ticket_ref: created.ticket_ref, tags: ['feature'] }),
    );
    expect(updated.tags.map((t) => t.name)).toEqual(['feature']);
  });
});

describe('update_ticket_status', () => {
  it('should move the ticket and log the change plus an optional comment', async () => {
    const created = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), {
        project_id: repo.seededProjectId,
        title: 'Move me',
      }),
    );
    const moved = payload<TicketWithRelations>(
      await run(updateTicketStatusTool(repo, AGENT), {
        ticket_ref: created.ticket_ref,
        status: 'in_dev',
        comment: 'starting work',
      }),
    );

    expect(moved.status).toBe('in_dev');
    expect(
      moved.comments?.some(
        (c) => c.author === 'system' && c.body === 'Status changed from backlog to in_dev',
      ),
    ).toBe(true);
    expect(moved.comments?.some((c) => c.body === 'starting work')).toBe(true);
  });

  it('should attribute the optional comment to the authenticated agent', async () => {
    const created = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), { project_id: repo.seededProjectId, title: 'Move' }),
    );
    const moved = payload<TicketWithRelations>(
      await run(updateTicketStatusTool(repo, 'hermes'), {
        ticket_ref: created.ticket_ref,
        status: 'review',
        comment: 'moving to review',
      }),
    );
    expect(moved.comments?.find((c) => c.body === 'moving to review')?.author).toBe('hermes');
  });
});

describe('list_tickets', () => {
  beforeEach(async () => {
    await run(createTicketTool(repo, AGENT), {
      project_id: repo.seededProjectId,
      title: 'Bug ticket',
      tags: ['bug'],
      priority: 'high',
    });
    const feature = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), {
        project_id: repo.seededProjectId,
        title: 'Feature ticket',
        tags: ['feature'],
      }),
    );
    await run(updateTicketStatusTool(repo, AGENT), {
      ticket_ref: feature.ticket_ref,
      status: 'in_dev',
    });
  });

  it('should filter by status', async () => {
    const tickets = payload<TicketWithRelations[]>(
      await run(listTicketsTool(repo), { status: 'in_dev' }),
    );
    expect(tickets).toHaveLength(1);
    expect(tickets[0]?.title).toBe('Feature ticket');
  });

  it('should filter by tag', async () => {
    const tickets = payload<TicketWithRelations[]>(
      await run(listTicketsTool(repo), { tags: ['bug'] }),
    );
    expect(tickets).toHaveLength(1);
    expect(tickets[0]?.title).toBe('Bug ticket');
  });

  it('should order newest first', async () => {
    const tickets = payload<TicketWithRelations[]>(await run(listTicketsTool(repo), {}));
    expect(tickets.map((t) => t.title)).toEqual(['Feature ticket', 'Bug ticket']);
  });
});

describe('add_comment', () => {
  it('should append a comment to an existing ticket', async () => {
    const created = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), {
        project_id: repo.seededProjectId,
        title: 'Discuss',
      }),
    );
    const comment = payload<Comment>(
      await run(addCommentTool(repo, AGENT), { ticket_ref: created.ticket_ref, body: 'a note' }),
    );
    expect(comment.body).toBe('a note');
    expect(comment.author).toBe('claude-code');
  });

  it('should attribute the comment to the authenticated agent, ignoring caller-supplied input', async () => {
    const created = payload<TicketWithRelations>(
      await run(createTicketTool(repo, AGENT), {
        project_id: repo.seededProjectId,
        title: 'Whose',
      }),
    );
    const comment = payload<Comment>(
      await run(addCommentTool(repo, 'hermes'), {
        ticket_ref: created.ticket_ref,
        body: 'written by hermes',
        author: 'claude-code',
      }),
    );
    expect(comment.author).toBe('hermes');
  });

  it('should reject an unknown ref', async () => {
    await expect(
      run(addCommentTool(repo, AGENT), { ticket_ref: 'PI-404', body: 'ghost' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
