import type { TicketWithRelations } from '@forge/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { TicketCard } from './TicketCard.js';

function makeTicket(overrides: Partial<TicketWithRelations> = {}): TicketWithRelations {
  return {
    id: 't1',
    project_id: 'p1',
    ticket_number: 42,
    ticket_ref: 'PI-42',
    title: 'Wire up the thing',
    description: null,
    acceptance_criteria: null,
    status: 'backlog',
    priority: 'high',
    created_by: 'human',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    tags: [],
    ...overrides,
  };
}

function renderCard(ticket: TicketWithRelations): void {
  render(
    <MemoryRouter>
      <TicketCard ticket={ticket} />
    </MemoryRouter>,
  );
}

describe('TicketCard', () => {
  it('should render the ref and title', () => {
    renderCard(makeTicket());
    expect(screen.getByText('PI-42')).toBeInTheDocument();
    expect(screen.getByText('Wire up the thing')).toBeInTheDocument();
  });

  it.each([
    ['claude-code', 'claude'],
    ['codex', 'codex'],
    ['hermes', 'hermes'],
  ] as const)('should show the ⚡ agent marker for %s tickets', (createdBy, shortName) => {
    renderCard(makeTicket({ created_by: createdBy }));
    expect(screen.getByTitle(`Created by ${createdBy}`)).toHaveTextContent(shortName);
  });

  it('should not show the ⚡ indicator for human-created tickets', () => {
    renderCard(makeTicket({ created_by: 'human' }));
    expect(screen.queryByTitle(/Created by/)).not.toBeInTheDocument();
  });

  it('should name the priority for screen readers while showing only bars', () => {
    renderCard(makeTicket({ priority: 'high' }));
    expect(screen.getByText('High priority')).toHaveClass('sr-only');
  });

  it('should list the ticket tags', () => {
    renderCard(
      makeTicket({
        tags: [{ id: 'g1', name: 'bug', color: '#e5484d' }],
      }),
    );
    expect(screen.getByText('bug')).toBeInTheDocument();
  });
});
