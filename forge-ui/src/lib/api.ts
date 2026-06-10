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
import { supabase } from './supabase.js';

/**
 * Client-side data access against Supabase (anon key, gated by RLS). Mirrors
 * the MCP server's repository for the write paths the human UI owns. Status
 * changes rely on the DB trigger to log the activity comment, so we never
 * write that comment here.
 */

/** Batch-load tags for many tickets at once (avoids N+1). */
async function loadTagsByTicket(ticketIds: string[]): Promise<Map<string, Tag[]>> {
  const result = new Map<string, Tag[]>();
  if (ticketIds.length === 0) return result;

  const { data: links, error } = await supabase
    .from('ticket_tags')
    .select('ticket_id, tag_id')
    .in('ticket_id', ticketIds);
  if (error) throw error;
  if (links.length === 0) return result;

  const tagIds = [...new Set(links.map((row) => row.tag_id))];
  const { data: tags, error: tagsError } = await supabase.from('tags').select('*').in('id', tagIds);
  if (tagsError) throw tagsError;
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));

  for (const link of links) {
    const tag = tagById.get(link.tag_id);
    if (!tag) continue;
    const list = result.get(link.ticket_id) ?? [];
    list.push(tag);
    result.set(link.ticket_id, list);
  }
  return result;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*').order('name');
  if (error) throw error;
  return data;
}

export interface ProjectInput {
  name: string;
  slug: string;
  prefix: string;
  color: string;
  description: string | null;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const { data, error } = await supabase.from('projects').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createTag(input: { name: string; color: string }): Promise<Tag> {
  const { data, error } = await supabase.from('tags').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTickets(projectId: string): Promise<TicketWithRelations[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const tagsByTicket = await loadTagsByTicket(data.map((ticket) => ticket.id));
  return data.map((ticket) => ({ ...ticket, tags: tagsByTicket.get(ticket.id) ?? [] }));
}

export async function fetchTicketByRef(ref: string): Promise<TicketWithRelations | null> {
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('ticket_ref', ref)
    .maybeSingle();
  if (error) throw error;
  if (!ticket) return null;

  const [tagsByTicket, commentsResult] = await Promise.all([
    loadTagsByTicket([ticket.id]),
    supabase
      .from('comments')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true }),
  ]);
  if (commentsResult.error) throw commentsResult.error;

  return { ...ticket, tags: tagsByTicket.get(ticket.id) ?? [], comments: commentsResult.data };
}

/** Persist a status change. The DB trigger logs the `system` activity comment. */
export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  const { error } = await supabase.from('tickets').update({ status }).eq('id', ticketId);
  if (error) throw error;
}

export interface CreateTicketInput {
  project: Pick<Project, 'id' | 'prefix'>;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  priority: Priority;
  tagIds: string[];
}

/** Create a ticket from the UI (created_by 'human'), mirroring the MCP flow. */
export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const { data: ticketNumber, error: seqError } = await supabase.rpc('next_ticket_number', {
    p_project_id: input.project.id,
  });
  if (seqError) throw seqError;

  const ticketRef = `${input.project.prefix}-${ticketNumber}`;
  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      project_id: input.project.id,
      ticket_number: ticketNumber,
      ticket_ref: ticketRef,
      title: input.title,
      description: input.description,
      acceptance_criteria: input.acceptance_criteria,
      priority: input.priority,
      created_by: 'human',
    })
    .select('*')
    .single();
  if (error) throw error;

  if (input.tagIds.length > 0) {
    const { error: tagError } = await supabase
      .from('ticket_tags')
      .insert(input.tagIds.map((tagId) => ({ ticket_id: ticket.id, tag_id: tagId })));
    if (tagError) throw tagError;
  }

  await addComment(ticket.id, 'Ticket created by human', 'system');
  return ticket;
}

export async function addComment(
  ticketId: string,
  body: string,
  author: CommentAuthor,
): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ ticket_id: ticketId, body, author })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Replace a ticket's tags with exactly the given set. */
async function setTicketTags(ticketId: string, tagIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('ticket_tags')
    .delete()
    .eq('ticket_id', ticketId);
  if (deleteError) throw deleteError;
  if (tagIds.length === 0) return;

  const { error } = await supabase
    .from('ticket_tags')
    .insert(tagIds.map((tagId) => ({ ticket_id: ticketId, tag_id: tagId })));
  if (error) throw error;
}

export interface UpdateTicketFields {
  title?: string;
  description?: string | null;
  acceptance_criteria?: string | null;
  priority?: Priority;
  /** When present, replaces the ticket's tags entirely. */
  tagIds?: string[];
}

/**
 * Update a ticket's non-status fields and/or tags, logging a `system` diff
 * comment (mirrors the MCP `update_ticket` tool). Status changes go through
 * updateTicketStatus so the DB trigger owns that log entry.
 */
export async function updateTicket(
  existing: TicketWithRelations,
  fields: UpdateTicketFields,
): Promise<void> {
  const patch: {
    title?: string;
    description?: string | null;
    acceptance_criteria?: string | null;
    priority?: Priority;
  } = {};
  const changes: string[] = [];

  if (fields.title !== undefined && fields.title !== existing.title) {
    patch.title = fields.title;
    changes.push('title changed');
  }
  if (fields.description !== undefined && fields.description !== existing.description) {
    patch.description = fields.description;
    changes.push('description updated');
  }
  if (
    fields.acceptance_criteria !== undefined &&
    fields.acceptance_criteria !== existing.acceptance_criteria
  ) {
    patch.acceptance_criteria = fields.acceptance_criteria;
    changes.push('acceptance criteria updated');
  }
  if (fields.priority !== undefined && fields.priority !== existing.priority) {
    patch.priority = fields.priority;
    changes.push(`priority changed from ${existing.priority} to ${fields.priority}`);
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('tickets').update(patch).eq('id', existing.id);
    if (error) throw error;
  }

  if (fields.tagIds !== undefined) {
    const currentIds = existing.tags.map((tag) => tag.id).sort();
    const nextIds = [...new Set(fields.tagIds)].sort();
    const changed =
      currentIds.length !== nextIds.length || currentIds.some((id, i) => id !== nextIds[i]);
    await setTicketTags(existing.id, fields.tagIds);
    if (changed) changes.push('tags updated');
  }

  if (changes.length > 0) {
    await addComment(existing.id, `Ticket updated: ${changes.join('; ')} (by human)`, 'system');
  }
}
