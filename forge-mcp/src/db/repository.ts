import type {
  Comment,
  CommentAuthor,
  Priority,
  Project,
  Tag,
  Ticket,
  TicketStatus,
  TicketWithRelations,
} from '@forge/shared';
import { RepositoryError } from '../errors.js';
import type { ForgeSupabaseClient } from '../supabase.js';

export interface CreateTicketData {
  project_id: string;
  ticket_number: number;
  ticket_ref: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  priority: Priority;
  created_by: Ticket['created_by'];
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  acceptance_criteria?: string;
  priority?: Priority;
}

export interface TicketFilters {
  project_id?: string;
  status?: TicketStatus;
  priority?: Priority;
  tags?: string[];
  limit: number;
  offset: number;
}

/** Result of resolving tag names: the matched tags and any names that don't exist. */
export interface ResolvedTags {
  tags: Tag[];
  missing: string[];
}

/**
 * Data-access contract for the MCP tools. Tool handlers depend on this
 * interface (not on Supabase directly), which keeps them unit-testable against
 * an in-memory fake.
 */
export interface ForgeRepository {
  listProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | null>;
  nextTicketNumber(projectId: string): Promise<number>;
  insertTicket(data: CreateTicketData): Promise<Ticket>;
  getTicketByRef(ref: string): Promise<Ticket | null>;
  getTicketWithRelations(ref: string): Promise<TicketWithRelations | null>;
  listTickets(filters: TicketFilters): Promise<TicketWithRelations[]>;
  updateTicket(id: string, patch: UpdateTicketData): Promise<Ticket>;
  updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket>;
  resolveTags(names: string[]): Promise<ResolvedTags>;
  setTicketTags(ticketId: string, tagIds: string[]): Promise<void>;
  getTicketTags(ticketId: string): Promise<Tag[]>;
  addComment(ticketId: string, body: string, author: CommentAuthor): Promise<Comment>;
}

/**
 * Supabase-backed implementation. Uses only flat queries and assembles
 * relations in JS, avoiding the typed nested-join machinery.
 */
export function createSupabaseRepository(client: ForgeSupabaseClient): ForgeRepository {
  async function getTicketByRef(ref: string): Promise<Ticket | null> {
    const { data, error } = await client
      .from('tickets')
      .select('*')
      .eq('ticket_ref', ref)
      .maybeSingle();
    if (error) throw new RepositoryError(error.message);
    return data;
  }

  async function getTicketTags(ticketId: string): Promise<Tag[]> {
    const links = await client.from('ticket_tags').select('tag_id').eq('ticket_id', ticketId);
    if (links.error) throw new RepositoryError(links.error.message);
    const tagIds = links.data.map((row) => row.tag_id);
    if (tagIds.length === 0) return [];

    const tags = await client.from('tags').select('*').in('id', tagIds);
    if (tags.error) throw new RepositoryError(tags.error.message);
    return tags.data;
  }

  async function resolveTags(names: string[]): Promise<ResolvedTags> {
    const unique = [...new Set(names)];
    if (unique.length === 0) return { tags: [], missing: [] };

    const { data, error } = await client.from('tags').select('*').in('name', unique);
    if (error) throw new RepositoryError(error.message);

    const found = new Set(data.map((tag) => tag.name));
    const missing = unique.filter((name) => !found.has(name));
    return { tags: data, missing };
  }

  /** Batch-load tags for many tickets at once (avoids N+1). */
  async function loadTagsByTicket(ticketIds: string[]): Promise<Map<string, Tag[]>> {
    const result = new Map<string, Tag[]>();
    if (ticketIds.length === 0) return result;

    const links = await client
      .from('ticket_tags')
      .select('ticket_id, tag_id')
      .in('ticket_id', ticketIds);
    if (links.error) throw new RepositoryError(links.error.message);
    if (links.data.length === 0) return result;

    const tagIds = [...new Set(links.data.map((row) => row.tag_id))];
    const tags = await client.from('tags').select('*').in('id', tagIds);
    if (tags.error) throw new RepositoryError(tags.error.message);
    const tagById = new Map(tags.data.map((tag) => [tag.id, tag]));

    for (const link of links.data) {
      const tag = tagById.get(link.tag_id);
      if (!tag) continue;
      const list = result.get(link.ticket_id) ?? [];
      list.push(tag);
      result.set(link.ticket_id, list);
    }
    return result;
  }

  return {
    async listProjects(): Promise<Project[]> {
      const { data, error } = await client.from('projects').select('*').order('name');
      if (error) throw new RepositoryError(error.message);
      return data;
    },

    async getProjectById(id: string): Promise<Project | null> {
      const { data, error } = await client.from('projects').select('*').eq('id', id).maybeSingle();
      if (error) throw new RepositoryError(error.message);
      return data;
    },

    async nextTicketNumber(projectId: string): Promise<number> {
      const { data, error } = await client.rpc('next_ticket_number', { p_project_id: projectId });
      if (error) throw new RepositoryError(error.message);
      return data;
    },

    async insertTicket(input: CreateTicketData): Promise<Ticket> {
      const { data, error } = await client
        .from('tickets')
        .insert({ ...input, status: 'backlog' })
        .select('*')
        .single();
      if (error) throw new RepositoryError(error.message);
      return data;
    },

    getTicketByRef,

    async getTicketWithRelations(ref: string): Promise<TicketWithRelations | null> {
      const ticket = await getTicketByRef(ref);
      if (!ticket) return null;

      const [tags, commentsResult] = await Promise.all([
        getTicketTags(ticket.id),
        client
          .from('comments')
          .select('*')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: true }),
      ]);
      if (commentsResult.error) throw new RepositoryError(commentsResult.error.message);

      return { ...ticket, tags, comments: commentsResult.data };
    },

    async listTickets(filters: TicketFilters): Promise<TicketWithRelations[]> {
      // Tag filter is resolved up front to a set of ticket ids so the main
      // query stays flat and still returns every tag on each matched ticket.
      let restrictToTicketIds: string[] | null = null;
      if (filters.tags && filters.tags.length > 0) {
        const { tags } = await resolveTags(filters.tags);
        const tagIds = tags.map((tag) => tag.id);
        if (tagIds.length === 0) return [];

        const links = await client.from('ticket_tags').select('ticket_id').in('tag_id', tagIds);
        if (links.error) throw new RepositoryError(links.error.message);
        restrictToTicketIds = [...new Set(links.data.map((row) => row.ticket_id))];
        if (restrictToTicketIds.length === 0) return [];
      }

      let query = client.from('tickets').select('*');
      if (filters.project_id) query = query.eq('project_id', filters.project_id);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.priority) query = query.eq('priority', filters.priority);
      if (restrictToTicketIds) query = query.in('id', restrictToTicketIds);
      query = query
        .order('created_at', { ascending: false })
        .range(filters.offset, filters.offset + filters.limit - 1);

      const { data, error } = await query;
      if (error) throw new RepositoryError(error.message);

      const tagsByTicket = await loadTagsByTicket(data.map((ticket) => ticket.id));
      return data.map((ticket) => ({ ...ticket, tags: tagsByTicket.get(ticket.id) ?? [] }));
    },

    async updateTicket(id: string, patch: UpdateTicketData): Promise<Ticket> {
      const { data, error } = await client
        .from('tickets')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new RepositoryError(error.message);
      return data;
    },

    async updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
      const { data, error } = await client
        .from('tickets')
        .update({ status })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new RepositoryError(error.message);
      return data;
    },

    resolveTags,

    async setTicketTags(ticketId: string, tagIds: string[]): Promise<void> {
      const del = await client.from('ticket_tags').delete().eq('ticket_id', ticketId);
      if (del.error) throw new RepositoryError(del.error.message);
      if (tagIds.length === 0) return;

      const ins = await client
        .from('ticket_tags')
        .insert(tagIds.map((tagId) => ({ ticket_id: ticketId, tag_id: tagId })));
      if (ins.error) throw new RepositoryError(ins.error.message);
    },

    getTicketTags,

    async addComment(ticketId: string, body: string, author: CommentAuthor): Promise<Comment> {
      const { data, error } = await client
        .from('comments')
        .insert({ ticket_id: ticketId, body, author })
        .select('*')
        .single();
      if (error) throw new RepositoryError(error.message);
      return data;
    },
  };
}
