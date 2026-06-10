import type { Priority, TicketStatus } from '@forge/shared';

interface StatusMeta {
  label: string;
  /** Hex colour for the column header accent (applied inline). */
  color: string;
}

/** Left-to-right column order on the board. */
export const STATUS_ORDER: readonly TicketStatus[] = ['backlog', 'in_dev', 'review', 'done'];

export const STATUS_META: Record<TicketStatus, StatusMeta> = {
  backlog: { label: 'Backlog', color: '#475569' },
  in_dev: { label: 'In Dev', color: '#3b82f6' },
  review: { label: 'Review', color: '#f59e0b' },
  done: { label: 'Done', color: '#10b981' },
};

interface PriorityMeta {
  label: string;
  /** Hex colour for the priority dot (applied inline). */
  color: string;
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  low: { label: 'Low', color: '#64748b' },
  medium: { label: 'Medium', color: '#6366f1' },
  high: { label: 'High', color: '#ef4444' },
};

/** Creators whose tickets get the ⚡ AI-built indicator. */
export const AI_CREATORS = ['claude-code', 'codex'] as const;
