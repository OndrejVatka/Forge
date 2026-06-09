import { randomUUID } from 'node:crypto';
import type {
  Comment,
  CommentAuthor,
  Project,
  Tag,
  Ticket,
  TicketWithRelations,
} from '@forge/shared';
import type {
  CreateTicketData,
  ForgeRepository,
  ResolvedTags,
  TicketFilters,
  UpdateTicketData,
} from '../src/db/repository.js';

let sequence = 0;
/** Monotonically increasing ISO timestamp so insertion order is deterministic. */
function nextTimestamp(): string {
  sequence += 1;
  return new Date(Date.UTC(2026, 0, 1) + sequence * 1000).toISOString();
}
function uid(): string {
  return randomUUID();
}

const DEFAULT_TAGS: Array<Pick<Tag, 'name' | 'color'>> = [
  { name: 'feature', color: '#6366f1' },
  { name: 'bug', color: '#ef4444' },
  { name: 'chore', color: '#f59e0b' },
  { name: 'improvement', color: '#10b981' },
  { name: 'research', color: '#3b82f6' },
  { name: 'urgent', color: '#dc2626' },
];

/**
 * In-memory ForgeRepository for unit tests. Seeds one project ("ProofIndex",
 * prefix "PI") and the six default tags. Emulates the DB status-change trigger
 * so the activity log matches production behaviour.
 */
export class FakeForgeRepository implements ForgeRepository {
  projects: Project[] = [];
  tags: Tag[] = [];
  tickets: Ticket[] = [];
  comments: Comment[] = [];
  private readonly links = new Set<string>(); // `${ticketId}::${tagId}`
  private readonly sequences = new Map<string, number>();

  constructor() {
    const project: Project = {
      id: uid(),
      name: 'ProofIndex',
      slug: 'proofindex',
      prefix: 'PI',
      color: '#6366f1',
      description: 'Test project',
      created_at: nextTimestamp(),
    };
    this.projects.push(project);
    for (const tag of DEFAULT_TAGS) {
      this.tags.push({ id: uid(), name: tag.name, color: tag.color });
    }
  }

  get seededProjectId(): string {
    const project = this.projects[0];
    if (!project) throw new Error('no seeded project');
    return project.id;
  }

  listProjects(): Promise<Project[]> {
    return Promise.resolve([...this.projects]);
  }

  getProjectById(id: string): Promise<Project | null> {
    return Promise.resolve(this.projects.find((project) => project.id === id) ?? null);
  }

  nextTicketNumber(projectId: string): Promise<number> {
    const next = (this.sequences.get(projectId) ?? 0) + 1;
    this.sequences.set(projectId, next);
    return Promise.resolve(next);
  }

  insertTicket(data: CreateTicketData): Promise<Ticket> {
    const now = nextTimestamp();
    const ticket: Ticket = {
      id: uid(),
      project_id: data.project_id,
      ticket_number: data.ticket_number,
      ticket_ref: data.ticket_ref,
      title: data.title,
      description: data.description,
      acceptance_criteria: data.acceptance_criteria,
      status: 'backlog',
      priority: data.priority,
      created_by: data.created_by,
      created_at: now,
      updated_at: now,
    };
    this.tickets.push(ticket);
    return Promise.resolve(ticket);
  }

  getTicketByRef(ref: string): Promise<Ticket | null> {
    return Promise.resolve(this.tickets.find((ticket) => ticket.ticket_ref === ref) ?? null);
  }

  async getTicketWithRelations(ref: string): Promise<TicketWithRelations | null> {
    const ticket = await this.getTicketByRef(ref);
    if (!ticket) return null;
    const tags = await this.getTicketTags(ticket.id);
    const comments = this.comments
      .filter((comment) => comment.ticket_id === ticket.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { ...ticket, tags, comments };
  }

  async listTickets(filters: TicketFilters): Promise<TicketWithRelations[]> {
    let matchTicketIds: Set<string> | null = null;
    if (filters.tags && filters.tags.length > 0) {
      const { tags } = await this.resolveTags(filters.tags);
      const tagIds = new Set(tags.map((tag) => tag.id));
      matchTicketIds = new Set(
        [...this.links]
          .map((link) => link.split('::'))
          .filter(([, tagId]) => tagId !== undefined && tagIds.has(tagId))
          .map(([ticketId]) => ticketId as string),
      );
    }

    const filtered = this.tickets
      .filter((ticket) => !filters.project_id || ticket.project_id === filters.project_id)
      .filter((ticket) => !filters.status || ticket.status === filters.status)
      .filter((ticket) => !filters.priority || ticket.priority === filters.priority)
      .filter((ticket) => matchTicketIds === null || matchTicketIds.has(ticket.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(filters.offset, filters.offset + filters.limit);

    const result: TicketWithRelations[] = [];
    for (const ticket of filtered) {
      result.push({ ...ticket, tags: await this.getTicketTags(ticket.id) });
    }
    return result;
  }

  updateTicket(id: string, patch: UpdateTicketData): Promise<Ticket> {
    const ticket = this.requireTicket(id);
    if (patch.title !== undefined) ticket.title = patch.title;
    if (patch.description !== undefined) ticket.description = patch.description;
    if (patch.acceptance_criteria !== undefined) {
      ticket.acceptance_criteria = patch.acceptance_criteria;
    }
    if (patch.priority !== undefined) ticket.priority = patch.priority;
    ticket.updated_at = nextTimestamp();
    return Promise.resolve(ticket);
  }

  async updateTicketStatus(id: string, status: Ticket['status']): Promise<Ticket> {
    const ticket = this.requireTicket(id);
    const previous = ticket.status;
    ticket.status = status;
    ticket.updated_at = nextTimestamp();
    // Emulate the DB trigger that logs status changes.
    if (previous !== status) {
      await this.addComment(id, `Status changed from ${previous} to ${status}`, 'system');
    }
    return ticket;
  }

  resolveTags(names: string[]): Promise<ResolvedTags> {
    const unique = [...new Set(names)];
    const tags = this.tags.filter((tag) => unique.includes(tag.name));
    const found = new Set(tags.map((tag) => tag.name));
    const missing = unique.filter((name) => !found.has(name));
    return Promise.resolve({ tags, missing });
  }

  setTicketTags(ticketId: string, tagIds: string[]): Promise<void> {
    for (const key of [...this.links]) {
      if (key.startsWith(`${ticketId}::`)) this.links.delete(key);
    }
    for (const tagId of tagIds) this.links.add(`${ticketId}::${tagId}`);
    return Promise.resolve();
  }

  getTicketTags(ticketId: string): Promise<Tag[]> {
    const tagIds = [...this.links]
      .filter((key) => key.startsWith(`${ticketId}::`))
      .map((key) => key.split('::')[1]);
    const tags = this.tags.filter((tag) => tagIds.includes(tag.id));
    return Promise.resolve(tags);
  }

  addComment(ticketId: string, body: string, author: CommentAuthor): Promise<Comment> {
    const comment: Comment = {
      id: uid(),
      ticket_id: ticketId,
      body,
      author,
      created_at: nextTimestamp(),
    };
    this.comments.push(comment);
    return Promise.resolve(comment);
  }

  private requireTicket(id: string): Ticket {
    const ticket = this.tickets.find((candidate) => candidate.id === id);
    if (!ticket) throw new Error(`fake: no ticket ${id}`);
    return ticket;
  }
}
