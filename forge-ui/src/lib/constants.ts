import type { CommentAuthor, Priority, TicketStatus } from '@forge/shared';

/*
 * Status and priority colours are theme tokens (--status-*, --priority-*),
 * applied by StatusMark and PriorityBadge, so only labels live here.
 */

/** Left-to-right column order on the board. */
export const STATUS_ORDER: readonly TicketStatus[] = ['backlog', 'in_dev', 'review', 'done'];

export const STATUS_META: Record<TicketStatus, { label: string }> = {
  backlog: { label: 'Backlog' },
  in_dev: { label: 'In Dev' },
  review: { label: 'Review' },
  done: { label: 'Done' },
};

export const PRIORITY_META: Record<Priority, { label: string }> = {
  low: { label: 'Low' },
  medium: { label: 'Medium' },
  high: { label: 'High' },
};

/** Creators whose tickets and comments get the ⚡ agent marker. */
export const AI_CREATORS = ['claude-code', 'codex', 'hermes'] as const;
export type AgentName = (typeof AI_CREATORS)[number];

/** Short agent names for the compact board marker (mono, lowercase). */
export const AGENT_SHORT_NAMES: Record<AgentName, string> = {
  'claude-code': 'claude',
  codex: 'codex',
  hermes: 'hermes',
};

/**
 * Whether a created_by / comment author is an AI agent.
 * @param author - A ticket's created_by or a comment's author.
 * @returns True for the agents in AI_CREATORS.
 */
export function isAgent(author: string): author is AgentName {
  return (AI_CREATORS as readonly string[]).includes(author);
}

/** Display names for ticket creators and comment authors. */
export const AUTHOR_LABELS: Record<CommentAuthor, string> = {
  // `human` isn't tied to a user account, so not "You".
  human: 'Human',
  'claude-code': 'Claude Code',
  codex: 'Codex',
  hermes: 'Hermes',
  system: 'System',
};

/**
 * Suggested colours for new tags and projects (they only colour a dot or a
 * square, so any of them reads on every theme). Rotated by count.
 */
export const COLOR_SUGGESTIONS = [
  '#e5484d',
  '#30a46c',
  '#3e8ed0',
  '#8e4ec6',
  '#d6409f',
  '#e8590c',
] as const;

/**
 * Picks the next suggested colour so consecutive additions differ.
 * @param count - How many items already exist.
 * @returns A hex colour from COLOR_SUGGESTIONS.
 */
export function suggestColor(count: number): string {
  return COLOR_SUGGESTIONS[count % COLOR_SUGGESTIONS.length] ?? COLOR_SUGGESTIONS[0];
}
