/**
 * Fixed value sets for Forge, mirroring the Postgres CHECK constraints.
 *
 * Kept free of zod so the web UI can import them (`@forge/shared/constants`)
 * without pulling the validator into its bundle (FO-30). `index.ts` builds the
 * runtime schemas from these same arrays, so there is still one definition.
 */

export const TICKET_STATUSES = ['backlog', 'in_dev', 'review', 'done'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Who/what created a ticket. */
export const TICKET_CREATORS = ['human', 'claude-code', 'codex', 'hermes'] as const;
export type TicketCreator = (typeof TICKET_CREATORS)[number];

/** Comment authors — superset of ticket creators plus the automated `system`. */
export const COMMENT_AUTHORS = ['human', 'claude-code', 'codex', 'hermes', 'system'] as const;
export type CommentAuthor = (typeof COMMENT_AUTHORS)[number];

/**
 * Identities an MCP client can authenticate as, each backed by its own API key.
 * A subset of the ticket creators: `human` writes arrive through the web UI and
 * `system` comments are written by a database trigger, so neither is reachable
 * over MCP.
 */
export const AGENT_IDENTITIES = ['claude-code', 'codex', 'hermes'] as const;
export type AgentIdentity = (typeof AGENT_IDENTITIES)[number];
