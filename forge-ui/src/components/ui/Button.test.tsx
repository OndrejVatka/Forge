import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus, X } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button.js';

describe('Button', () => {
  describe('when placed inside a form', () => {
    it('should not submit it unless type="submit" is passed', async () => {
      const handleSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
      render(
        <form onSubmit={(event) => handleSubmit(event.nativeEvent as SubmitEvent)}>
          <Button>Cancel</Button>
          <Button type="submit">Save</Button>
        </form>,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(handleSubmit).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('when it is icon-only', () => {
    it('should take its accessible name and tooltip from label', () => {
      render(<Button variant="ghost" icon={X} label="Close" />);

      const button = screen.getByRole('button', { name: 'Close' });
      expect(button).toHaveAttribute('title', 'Close');
      expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('when it has a visible label and an icon', () => {
    it('should be named by its text', () => {
      render(<Button icon={Plus}>Add tag</Button>);

      expect(screen.getByRole('button', { name: 'Add tag' })).toBeInTheDocument();
    });
  });

  describe('when disabled', () => {
    it('should not fire onClick', async () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Create ticket
        </Button>,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Create ticket' }));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('when given a shortcut', () => {
    it('should render it as a keyboard hint', () => {
      render(<Button shortcut="C">New ticket</Button>);

      expect(screen.getByText('C').tagName).toBe('KBD');
    });
  });
});
