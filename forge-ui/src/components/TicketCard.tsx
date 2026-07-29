import type { TicketWithRelations } from '@forge/shared';
import { Zap } from 'lucide-react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { AI_CREATORS } from '../lib/constants.js';
import { PriorityBadge } from './PriorityBadge.js';
import { TagChip } from './TagChip.js';

export function TicketCard({ ticket }: { ticket: TicketWithRelations }): ReactElement {
  const navigate = useNavigate();
  const isAiCreated = (AI_CREATORS as readonly string[]).includes(ticket.created_by);

  // `navigate` returns a promise in React Router 7; nothing awaits a click
  // handler, so the result is explicitly discarded at the call site below.
  return (
    <div
      onClick={() => void navigate(`/ticket/${ticket.ticket_ref}`)}
      className="ticket-card relative cursor-pointer rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/50"
    >
      {isAiCreated && (
        <Zap
          size={12}
          className="absolute right-2 top-2 text-primary"
          aria-label={`Created by ${ticket.created_by}`}
        />
      )}
      <div className="font-mono text-xs text-muted">{ticket.ticket_ref}</div>
      <div className="mt-1 pr-4 text-sm font-medium">{ticket.title}</div>
      {ticket.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ticket.tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </div>
      )}
      <div className="mt-2">
        <PriorityBadge priority={ticket.priority} />
      </div>
    </div>
  );
}
