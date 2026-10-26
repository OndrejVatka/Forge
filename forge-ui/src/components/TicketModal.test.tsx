import { render, screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketModal } from './TicketModal.js';

const { mutateMock, mutationState } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  mutationState: { isPending: false, isError: false },
}));

vi.mock('../hooks/useTickets.js', () => ({
  useCreateTicket: () => ({ mutate: mutateMock, ...mutationState }),
}));

const project = { id: 'p1', prefix: 'FO', name: 'Forge' };
const tags = [{ id: 't1', name: 'bug', color: '#e5484d' }];

function renderModal(onClose = vi.fn()): ReturnType<typeof vi.fn> {
  render(<TicketModal project={project} tags={tags} onClose={onClose} />);
  return onClose;
}

describe('TicketModal', () => {
  beforeEach(() => {
    mutateMock.mockReset();
    mutationState.isPending = false;
    mutationState.isError = false;
  });

  it('should open as a labelled dialog with the title focused', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: 'New ticket' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();
  });

  it('should keep Create disabled until there is a title', async () => {
    renderModal();
    const create = screen.getByRole('button', { name: /Create ticket/ });
    expect(create).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), '   ');
    expect(create).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Fix it');
    expect(create).toBeEnabled();
  });

  describe('when submitted with ⌘/Ctrl+Enter', () => {
    it('should create the ticket with every field, trimmed', async () => {
      renderModal();
      await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), '  Fix the board  ');
      await userEvent.type(screen.getByRole('textbox', { name: 'Description' }), 'Steps');
      await userEvent.type(screen.getByRole('textbox', { name: 'Acceptance criteria' }), 'Done');
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'high');
      await userEvent.click(screen.getByRole('button', { name: 'bug' }));

      await userEvent.click(screen.getByRole('textbox', { name: 'Title' }));
      await userEvent.keyboard('{Meta>}{Enter}{/Meta}');

      expect(mutateMock).toHaveBeenCalledTimes(1);
      expect(mutateMock.mock.calls[0]?.[0]).toEqual({
        project: { id: 'p1', prefix: 'FO' },
        title: 'Fix the board',
        description: 'Steps',
        acceptance_criteria: 'Done',
        priority: 'high',
        tagIds: ['t1'],
      });
    });

    it('should also accept Ctrl+Enter', async () => {
      renderModal();
      await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Fix it');

      await userEvent.keyboard('{Control>}{Enter}{/Control}');

      expect(mutateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a create is already in flight', () => {
    it('should not submit a second time', async () => {
      mutationState.isPending = true;
      renderModal();
      await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Fix it');

      await userEvent.keyboard('{Meta>}{Enter}{/Meta}');

      expect(mutateMock).not.toHaveBeenCalled();
    });
  });

  describe('when the create fails', () => {
    it('should say so', () => {
      mutationState.isError = true;
      renderModal();

      expect(screen.getByRole('alert')).toHaveTextContent('Could not create the ticket');
    });
  });

  it.each([
    ['Escape', async () => userEvent.keyboard('{Escape}')],
    [
      'the close button',
      async () => userEvent.click(screen.getByRole('button', { name: 'Close' })),
    ],
    ['Cancel', async () => userEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
  ])('should close on %s without creating', async (_how, close) => {
    const onClose = renderModal();

    await close();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('should keep Tab focus inside the dialog', async () => {
    renderModal();
    const create = screen.getByRole('button', { name: /Create ticket/ });
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'x');
    create.focus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(create).toHaveFocus();
  });

  it('should return focus to the opener when it closes', async () => {
    function Harness(): ReactElement {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            New ticket
          </button>
          {isOpen && <TicketModal project={project} tags={tags} onClose={() => setIsOpen(false)} />}
        </>
      );
    }
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'New ticket' }));
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'New ticket' })).toHaveFocus();
  });
});
