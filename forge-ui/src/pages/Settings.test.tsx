import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_THEME, type ForgeThemeState } from '../lib/theme.js';
import { ForgeThemeContext } from '../lib/theme-context.js';
import { Settings } from './Settings.js';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    createProject: vi.fn(),
    updateProject: vi.fn(),
    createTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}));

const mutation = (mutate: ReturnType<typeof vi.fn>) => ({
  mutate,
  isPending: false,
  isError: false,
});

vi.mock('../hooks/useProjects.js', () => ({
  useProjects: () => ({
    data: [
      {
        id: 'p1',
        name: 'Forge',
        slug: 'forge',
        prefix: 'FO',
        color: '#e8590c',
        description: 'PM tool',
        created_at: '',
      },
    ],
  }),
}));
vi.mock('../hooks/useTags.js', () => ({
  useTags: () => ({ data: [{ id: 't1', name: 'bug', color: '#e5484d' }] }),
}));
vi.mock('../hooks/useSettings.js', () => ({
  useCreateProject: () => mutation(mocks.createProject),
  useUpdateProject: () => mutation(mocks.updateProject),
  useCreateTag: () => mutation(mocks.createTag),
  useDeleteTag: () => mutation(mocks.deleteTag),
}));

function renderSettings(): ForgeThemeState {
  const theme: ForgeThemeState = { theme: DEFAULT_THEME, resolvedMode: 'dark', setTheme: vi.fn() };
  const Harness = (): ReactElement => (
    <ForgeThemeContext.Provider value={theme}>
      <Settings />
    </ForgeThemeContext.Provider>
  );
  render(<Harness />);
  return theme;
}

describe('Settings', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  describe('Appearance', () => {
    it('should pick a palette from the preview cards', async () => {
      const theme = renderSettings();

      expect(screen.getByRole('button', { name: /^Graphite/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await userEvent.click(screen.getByRole('button', { name: /^Slate/ }));

      expect(theme.setTheme).toHaveBeenCalledWith({ palette: 'slate' });
    });

    it('should pick a mode', async () => {
      const theme = renderSettings();

      await userEvent.click(screen.getByRole('radio', { name: 'Light' }));

      expect(theme.setTheme).toHaveBeenCalledWith({ mode: 'light' });
    });
  });

  describe('Projects', () => {
    it('should create a project with an uppercased prefix', async () => {
      renderSettings();
      const add = screen.getByRole('button', { name: 'Add project' });
      expect(add).toBeDisabled();

      await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Proof Index');
      await userEvent.type(screen.getByRole('textbox', { name: 'Slug' }), 'proofindex');
      await userEvent.type(screen.getByRole('textbox', { name: 'Prefix' }), 'pi');
      expect(screen.getByRole('textbox', { name: 'Prefix' })).toHaveValue('PI');
      await userEvent.click(add);

      expect(mocks.createProject).toHaveBeenCalledTimes(1);
      expect(mocks.createProject.mock.calls[0]?.[0]).toMatchObject({
        name: 'Proof Index',
        slug: 'proofindex',
        prefix: 'PI',
        description: null,
      });
    });

    it('should load a project into the form for editing', async () => {
      renderSettings();

      await userEvent.click(screen.getByRole('button', { name: 'Edit Forge' }));
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Forge');
      expect(screen.getByLabelText('Project color')).toHaveValue('#e8590c');

      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(mocks.updateProject.mock.calls[0]?.[0]).toMatchObject({
        id: 'p1',
        input: { name: 'Forge', prefix: 'FO', description: 'PM tool' },
      });
    });
  });

  it('should suggest the next unused colour for new projects and tags', () => {
    renderSettings();

    // One project and one tag exist, so both suggestions skip the first colour.
    expect(screen.getByLabelText('Project color')).toHaveValue('#30a46c');
    expect(screen.getByLabelText('Tag color')).toHaveValue('#30a46c');
  });

  describe('Tags', () => {
    it('should add a tag with the chosen colour', async () => {
      renderSettings();

      await userEvent.type(screen.getByRole('textbox', { name: 'Tag name' }), ' infra ');
      await userEvent.click(screen.getByRole('button', { name: 'Add tag' }));

      expect(mocks.createTag.mock.calls[0]?.[0]).toEqual({
        name: 'infra',
        color: expect.stringMatching(/^#[0-9a-f]{6}$/) as unknown,
      });
    });

    it('should remove a tag', async () => {
      renderSettings();

      await userEvent.click(screen.getByRole('button', { name: 'Remove bug' }));

      expect(mocks.deleteTag).toHaveBeenCalledWith('t1');
    });
  });
});
