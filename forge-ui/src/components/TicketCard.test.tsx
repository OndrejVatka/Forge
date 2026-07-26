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

  it('should show the ⚡ indicator for AI-created tickets', () => {
    renderCard(makeTicket({ created_by: 'claude-code' }));
    expect(screen.getByLabelText('Created by claude-code')).toBeInTheDocument();
  });

  it('should show the ⚡ indicator for hermes-created tickets', () => {
    renderCard(makeTicket({ created_by: 'hermes' }));
    expect(screen.getByLabelText('Created by hermes')).toBeInTheDocument();
  });

  it('should not show the ⚡ indicator for human-created tickets', () => {
    renderCard(makeTicket({ created_by: 'human' }));
    expect(screen.queryByLabelText(/Created by/)).not.toBeInTheDocument();
  });
});
