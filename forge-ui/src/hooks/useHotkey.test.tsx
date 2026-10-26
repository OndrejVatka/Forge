import { render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { isTypingTarget, useHotkey } from './useHotkey.js';

describe('useHotkey', () => {
  it('should fire on the bare key, in either case', async () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('c', handler));

    await userEvent.keyboard('c');
    await userEvent.keyboard('C');

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should ignore the key with a modifier held', async () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('c', handler));

    await userEvent.keyboard('{Meta>}c{/Meta}{Control>}c{/Control}{Alt>}c{/Alt}');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not fire while the user is typing in a field', async () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('c', handler));
    const { getByRole } = render(<input aria-label="Title" />);

    await userEvent.type(getByRole('textbox'), 'cc');

    expect(handler).not.toHaveBeenCalled();
    expect(getByRole('textbox')).toHaveValue('cc');
  });

  it('should do nothing when disabled', async () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('c', handler, false));

    await userEvent.keyboard('c');

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('isTypingTarget', () => {
  it('should flag editable elements only', () => {
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    // jsdom doesn't derive isContentEditable from the attribute.
    Object.defineProperty(editable, 'isContentEditable', { value: true });

    expect(isTypingTarget(document.createElement('input'))).toBe(true);
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
    expect(isTypingTarget(document.createElement('select'))).toBe(true);
    expect(isTypingTarget(editable)).toBe(true);
    expect(isTypingTarget(document.createElement('button'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
