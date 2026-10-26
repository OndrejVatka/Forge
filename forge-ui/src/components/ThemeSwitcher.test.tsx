import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_THEME, type ForgeThemeState } from '../lib/theme.js';
import { ForgeThemeContext } from '../lib/theme-context.js';
import { ThemeMenu } from './ThemeSwitcher.js';

function renderMenu(overrides: Partial<ForgeThemeState> = {}): ForgeThemeState {
  const state: ForgeThemeState = {
    theme: DEFAULT_THEME,
    resolvedMode: 'dark',
    setTheme: vi.fn(),
    ...overrides,
  };
  const Harness = (): ReactElement => (
    <ForgeThemeContext.Provider value={state}>
      <ThemeMenu />
      <button type="button">Outside</button>
    </ForgeThemeContext.Provider>
  );
  render(<Harness />);
  return state;
}

const openMenu = async (): Promise<void> =>
  userEvent.click(screen.getByRole('button', { name: 'Theme' }));

describe('ThemeMenu', () => {
  it('should open from the trigger and mark the current palette', async () => {
    renderMenu({ theme: { palette: 'ink', mode: 'dark' } });

    await openMenu();

    expect(screen.getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^Ink/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Graphite/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('should set the palette when one is picked', async () => {
    const state = renderMenu();
    await openMenu();

    await userEvent.click(screen.getByRole('button', { name: /^Navy/ }));

    expect(state.setTheme).toHaveBeenCalledWith({ palette: 'navy' });
  });

  it('should set the mode from the segmented control, including with arrow keys', async () => {
    const state = renderMenu();
    await openMenu();

    await userEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(state.setTheme).toHaveBeenCalledWith({ mode: 'system' });

    screen.getByRole('radio', { name: 'Dark' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(state.setTheme).toHaveBeenLastCalledWith({ mode: 'light' });
  });

  describe('when open', () => {
    it('should close on Escape and return focus to the trigger', async () => {
      renderMenu();
      await openMenu();

      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'Theme' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Theme' })).toHaveFocus();
    });

    it('should close on a click outside', async () => {
      renderMenu();
      await openMenu();

      await userEvent.click(screen.getByRole('button', { name: 'Outside' }));

      expect(screen.queryByRole('dialog', { name: 'Theme' })).not.toBeInTheDocument();
    });
  });
});
