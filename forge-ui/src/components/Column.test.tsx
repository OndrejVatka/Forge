import { DragDropContext } from '@hello-pangea/dnd';
import type { TicketWithRelations } from '@forge/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Column } from './Column.js';

function makeTicket(n: number): TicketWithRelations {
  return {
    id: `t${n}`,
    project_id: 'p1',
    ticket_number: n,
    ticket_ref: `FO-${n}`,
    title: `Ticket ${n}`,
    description: null,
    acceptance_criteria: null,
    status: 'backlog',
    priority: 'high',
    created_by: 'human',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    tags: [],
  };
}

function renderColumn(tickets: TicketWithRelations[]): void {
  render(
    <MemoryRouter>
      <DragDropContext onDragEnd={() => undefined}>
        <Column status="backlog" tickets={tickets} />
      </DragDropContext>
    </MemoryRouter>,
  );
}

describe('Column', () => {
  // Regression guard (26-10-2026): cards hold absolutely positioned `.sr-only`
  // labels. When the lane's scroller wasn't positioned, they escaped its
  // clipping, stretched the document to ~2,100px, and the whole page scrolled
  // the fixed-height board out of view. jsdom has no layout, so this pins the
  // structural fix: every card and the scroller are containing blocks.
  it('should contain absolutely positioned card content inside the lane scroller', () => {
    renderColumn([makeTicket(1), makeTicket(2)]);

    const labels = screen.getAllByText('High priority');
    expect(labels).toHaveLength(2);
    for (const label of labels) {
      const card = label.closest('.rounded-md');
      expect(card).toHaveClass('relative');
      const scroller = card?.parentElement?.parentElement;
      expect(scroller).toHaveClass('overflow-y-auto', 'relative');
    }
  });

  it('should keep an empty lane visible as a drop target', () => {
    renderColumn([]);

    expect(screen.getByText('No tickets')).toBeInTheDocument();
  });
});
