import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TagChip } from './TagChip.js';

const tag = { name: 'bug', color: '#e5484d' };

describe('TagChip', () => {
  describe('when it has no handlers', () => {
    it('should render as static text, not a control', () => {
      render(<TagChip tag={tag} />);

      expect(screen.getByText('bug')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('when it is a toggle', () => {
    it('should expose its pressed state and toggle on click', async () => {
      const handleClick = vi.fn();
      render(<TagChip tag={tag} active={false} onClick={handleClick} />);

      const chip = screen.getByRole('button', { name: 'bug' });
      expect(chip).toHaveAttribute('aria-pressed', 'false');

      await userEvent.click(chip);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('when it is removable', () => {
    it('should call onRemove from its named remove button', async () => {
      const handleRemove = vi.fn();
      render(<TagChip tag={tag} onRemove={handleRemove} />);

      await userEvent.click(screen.getByRole('button', { name: 'Remove bug' }));

      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });
});
