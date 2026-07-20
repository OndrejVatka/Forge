import type { Priority, TicketStatus } from '@forge/shared';
import type { Theme } from '../theme/ThemeProvider.js';

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

/** Molten Forge status colours — brighter, to read against the char-black panels. */
const MOLTEN_STATUS_META: Record<TicketStatus, StatusMeta> = {
  backlog: { label: 'Backlog', color: '#78909c' },
  in_dev: { label: 'In Dev', color: '#42a5f5' },
  review: { label: 'Review', color: '#ffca28' },
  done: { label: 'Done', color: '#66bb6a' },
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

/** Molten Forge priority colours — ember tones rather than the indigo scale. */
const MOLTEN_PRIORITY_META: Record<Priority, PriorityMeta> = {
  low: { label: 'Low', color: '#8d6e63' },
  medium: { label: 'Medium', color: '#ff6d00' },
  high: { label: 'High', color: '#ff5252' },
};

/**
 * Status and priority colours are applied inline from ticket data, so they
 * cannot be re-skinned by the CSS custom-property overrides that carry the
 * rest of the molten theme — they need an explicit per-theme lookup.
 */
export function statusMeta(theme: Theme, status: TicketStatus): StatusMeta {
  return theme === 'molten' ? MOLTEN_STATUS_META[status] : STATUS_META[status];
}

export function priorityMeta(theme: Theme, priority: Priority): PriorityMeta {
  return theme === 'molten' ? MOLTEN_PRIORITY_META[priority] : PRIORITY_META[priority];
}

/** Creators whose tickets get the ⚡ AI-built indicator. */
export const AI_CREATORS = ['claude-code', 'codex'] as const;
