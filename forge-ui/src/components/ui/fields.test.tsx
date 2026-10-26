import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input.js';
import { Select } from './Select.js';
import { Textarea } from './Textarea.js';

function ControlledInput(): ReactElement {
  const [value, setValue] = useState('');
  return (
    <Input aria-label="Name" value={value} onChange={(event) => setValue(event.target.value)} />
  );
}

describe('Input', () => {
  it('should work as a controlled field', async () => {
    render(<ControlledInput />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Forge');

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Forge');
  });

  it('should pass native validation attributes through', () => {
    render(<Input type="password" aria-label="Password" required minLength={6} />);

    const field = screen.getByLabelText('Password');
    expect(field).toHaveAttribute('type', 'password');
    expect(field).toBeRequired();
    expect(field).toHaveAttribute('minLength', '6');
  });

  it('should default to a text field', () => {
    render(<Input aria-label="Slug" mono />);

    expect(screen.getByRole('textbox', { name: 'Slug' })).toHaveAttribute('type', 'text');
  });
});

describe('Textarea', () => {
  it('should forward changes and default to three rows', async () => {
    const handleChange = vi.fn();
    render(<Textarea aria-label="Comment" onChange={handleChange} />);

    const field = screen.getByRole('textbox', { name: 'Comment' });
    await userEvent.type(field, 'Hi');

    expect(field).toHaveAttribute('rows', '3');
    expect(handleChange).toHaveBeenCalledTimes(2);
  });
});

describe('Select', () => {
  it('should report the chosen option', async () => {
    const handleChange = vi.fn();
    render(
      <Select aria-label="Priority" defaultValue="low" onChange={handleChange}>
        <option value="low">Low</option>
        <option value="high">High</option>
      </Select>,
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'high');

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveValue('high');
  });

  it('should keep its chevron out of the accessibility tree', () => {
    const { container } = render(
      <Select aria-label="Status">
        <option value="backlog">Backlog</option>
      </Select>,
    );

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
