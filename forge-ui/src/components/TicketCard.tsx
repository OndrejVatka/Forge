import type { TicketWithRelations } from '@forge/shared';
import { Zap } from 'lucide-react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { AGENT_SHORT_NAMES, isAgent } from '../lib/constants.js';
import { PriorityBadge } from './PriorityBadge.js';
import { TagChip } from './TagChip.js';
import { Icon } from './ui/Icon.js';

/** Board card: ref and agent marker, title, then priority bars and tags. */
export function TicketCard({ ticket }: { ticket: TicketWithRelations }): ReactElement {
  const navigate = useNavigate();
  const createdBy = ticket.created_by;

  // `navigate` returns a promise in React Router 7; nothing awaits a click
  // handler, so the result is explicitly discarded at the call site below.
  return (
    <div
      onClick={() => void navigate(`/ticket/${ticket.ticket_ref}`)}
      className="relative cursor-pointer rounded-md border border-border bg-surface px-2.5 pt-[9px] pb-2.5 shadow-card transition-[border-color,background-color] duration-[120ms] hover:border-border-strong hover:bg-surface-hover"
    >
      <div className="flex h-4 items-center gap-2">
        <span className="font-mono text-2xs tracking-[0.01em] text-fg-tertiary">
          {ticket.ticket_ref}
        </span>
        {isAgent(createdBy) && (
          <span
            title={`Created by ${createdBy}`}
            className="ml-auto inline-flex items-center gap-[3px] font-mono text-[10.5px] text-ai"
          >
            <Icon icon={Zap} size={10} filled />
            {AGENT_SHORT_NAMES[createdBy]}
          </span>
        )}
      </div>
      <div className="mt-1 text-sm leading-tight font-medium tracking-[-0.012em] text-pretty text-fg">
        {ticket.title}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={ticket.priority} showLabel={false} />
        {ticket.tags.map((tag) => (
          <TagChip key={tag.id} tag={tag} />
        ))}
      </div>
    </div>
  );
}
