/**
 * Shared domain model for Forge.
 *
 * Single source of truth for the entity shapes and the fixed value sets
 * (status / priority / authors) used by both the MCP server and the web UI.
 *
 * We use Zod `z.enum` rather than TypeScript `enum` for the fixed sets so the
 * same definition gives us both a runtime validator (for MCP tool input and DB
 * CHECK-constraint parity) and a derived static type — no duplication, no drift.
 */
import { z } from 'zod';

// --- Fixed value sets (mirror the Postgres CHECK constraints) -------------

export const TICKET_STATUSES = ['backlog', 'in_dev', 'review', 'done'] as const;
export const ticketStatusSchema = z.enum(TICKET_STATUSES);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export const prioritySchema = z.enum(PRIORITIES);
export type Priority = z.infer<typeof prioritySchema>;

/** Who/what created a ticket. */
export const TICKET_CREATORS = ['human', 'claude-code', 'codex'] as const;
export const ticketCreatorSchema = z.enum(TICKET_CREATORS);
export type TicketCreator = z.infer<typeof ticketCreatorSchema>;

/** Comment authors — superset of ticket creators plus the automated `system`. */
export const COMMENT_AUTHORS = ['human', 'claude-code', 'codex', 'system'] as const;
export const commentAuthorSchema = z.enum(COMMENT_AUTHORS);
export type CommentAuthor = z.infer<typeof commentAuthorSchema>;

// --- Entities (mirror the `db/schema.sql` tables) -------------------------

export interface Project {
  id: string;
  name: string;
  slug: string;
  /** Used in ticket refs, e.g. "PI" -> "PI-42". */
  prefix: string;
  /** Hex color for the UI badge. */
  color: string;
  description: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  /** Hex color for the UI chip. */
  color: string;
}

export interface Ticket {
  id: string;
  project_id: string;
  /** Auto-incremented per project. */
  ticket_number: number;
  /** Computed on insert as `{project.prefix}-{ticket_number}`, e.g. "PI-42". */
  ticket_ref: string;
  title: string;
  /** Markdown. */
  description: string | null;
  /** Markdown. */
  acceptance_criteria: string | null;
  status: TicketStatus;
  priority: Priority;
  created_by: TicketCreator;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  /** Markdown. */
  body: string;
  author: CommentAuthor;
  created_at: string;
}

/** A ticket joined with its tags and (optionally) its activity log. */
export interface TicketWithRelations extends Ticket {
  tags: Tag[];
  comments?: Comment[];
}
