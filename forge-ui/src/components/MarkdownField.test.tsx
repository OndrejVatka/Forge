import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownField } from './MarkdownField.js';
import { FullScreenLoader } from './Spinner.js';

describe('MarkdownField', () => {
  it('should show the placeholder when empty', () => {
    render(
      <MarkdownField
        label="Description"
        value={null}
        placeholder="No description."
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText('No description.')).toBeInTheDocument();
  });

  it('should edit and save trimmed text', async () => {
    const handleSave = vi.fn();
    render(<MarkdownField label="Description" value="Old" placeholder="—" onSave={handleSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const field = screen.getByRole('textbox', { name: 'Description' });
    await userEvent.clear(field);
    await userEvent.type(field, '  New text  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(handleSave).toHaveBeenCalledWith('New text');
  });

  it('should save an emptied field as null', async () => {
    const handleSave = vi.fn();
    render(<MarkdownField label="Description" value="Old" placeholder="—" onSave={handleSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'Description' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(handleSave).toHaveBeenCalledWith(null);
  });

  it('should discard edits on Cancel', async () => {
    const handleSave = vi.fn();
    render(<MarkdownField label="Description" value="Old" placeholder="—" onSave={handleSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Description' }), ' more');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(handleSave).not.toHaveBeenCalled();
    expect(screen.getByText('Old')).toBeInTheDocument();
  });
});

describe('FullScreenLoader', () => {
  it('should announce loading', () => {
    render(<FullScreenLoader />);

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });
});
