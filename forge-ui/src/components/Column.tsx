import { Draggable, Droppable } from '@hello-pangea/dnd';
import type { TicketStatus, TicketWithRelations } from '@forge/shared';
import type { ReactElement } from 'react';
import { STATUS_META } from '../lib/constants.js';
import { TicketCard } from './TicketCard.js';

interface ColumnProps {
  status: TicketStatus;
  tickets: TicketWithRelations[];
}

export function Column({ status, tickets }: ColumnProps): ReactElement {
  const meta = STATUS_META[status];

  return (
    <div className="flex min-w-[260px] flex-1 flex-col rounded-lg border border-border/60 bg-surface/30">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="text-sm font-medium">{meta.label}</span>
        <span className="ml-auto text-xs text-muted">{tickets.length}</span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors ${
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
          </div>
        )}
      </Droppable>
    </div>
  );
}
