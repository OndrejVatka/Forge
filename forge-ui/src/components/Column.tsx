import { Draggable, Droppable } from '@hello-pangea/dnd';
import type { TicketStatus, TicketWithRelations } from '@forge/shared';
import { Plus } from 'lucide-react';
import type { ReactElement } from 'react';
import { STATUS_META } from '../lib/constants.js';
import { StatusMark } from './StatusMark.js';
import { TicketCard } from './TicketCard.js';
import { Button } from './ui/Button.js';

interface ColumnProps {
  status: TicketStatus;
  tickets: TicketWithRelations[];
  /** Shows a ghost + in the header that opens the create modal. */
  onAdd?: () => void;
}

/** A board lane: tinted, borderless (cards carry the hairlines), with a drop zone. */
export function Column({ status, tickets, onAdd }: ColumnProps): ReactElement {
  const { label } = STATUS_META[status];

  return (
    <section
      aria-label={label}
      data-status={status}
      className="board-column flex min-w-[272px] flex-1 flex-col rounded-lg bg-bg-subtle"
    >
      <div className="flex h-9 shrink-0 items-center gap-2 pr-1.5 pl-3">
        <StatusMark status={status} />
        <h2 className="text-sm font-medium tracking-[-0.012em] text-fg">{label}</h2>
        <span className="font-mono text-2xs text-fg-tertiary">{tickets.length}</span>
        {onAdd && (
          <Button
            variant="ghost"
            size="sm"
            icon={Plus}
            label={`New ticket in ${label}`}
            onClick={onAdd}
            className="ml-auto"
          />
        )}
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            // `relative` makes this scroller the containing block for anything
            // absolutely positioned inside the cards (e.g. `.sr-only` labels).
            // Without it they escape its clipping, stretch the document, and
            // the whole page scrolls the fixed-height board out of view.
            className={`relative flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-b-lg px-1.5 pb-1.5 transition-[background-color] duration-[120ms] ${
              snapshot.isDraggingOver ? 'bg-surface-hover/40' : ''
            }`}
          >
            {tickets.map((ticket, index) => (
              <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <TicketCard ticket={ticket} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {/* Keeps an empty lane visible as a drop target. */}
            {tickets.length === 0 && !snapshot.isDraggingOver && (
              <div className="rounded-md border border-dashed border-border px-2 py-3.5 text-center text-xs text-fg-tertiary">
                No tickets
              </div>
            )}
          </div>
        )}
      </Droppable>
    </section>
  );
}
