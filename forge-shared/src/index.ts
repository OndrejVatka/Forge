/**
 * Shared domain model for Forge.
 *
 * Single source of truth for the entity shapes and the fixed value sets
 * (status / priority / authors) used by both the MCP server and the web UI.
 *
 * The fixed sets live in `constants.ts` as plain `as const` arrays, with their
 * static types derived from them. This module builds a Zod `z.enum` from each
 * array, giving the MCP server a runtime validator (for tool input and DB
 * CHECK-constraint parity) from the same definition — no duplication, no drift.
 */
import { z } from 'zod';
import {
  AGENT_IDENTITIES,
  COMMENT_AUTHORS,
  PRIORITIES,
  TICKET_CREATORS,
  TICKET_STATUSES,
  type CommentAuthor,
  type Priority,
  type TicketCreator,
  type TicketStatus,
} from './constants.js';

export * from './constants.js';

// --- Runtime validators for the fixed value sets ---------------------------

export const ticketStatusSchema = z.enum(TICKET_STATUSES);
export const prioritySchema = z.enum(PRIORITIES);
export const ticketCreatorSchema = z.enum(TICKET_CREATORS);
export const commentAuthorSchema = z.enum(COMMENT_AUTHORS);
export const agentIdentitySchema = z.enum(AGENT_IDENTITIES);

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

export type { Database } from './database.js';
