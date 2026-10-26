import { Plus } from 'lucide-react';
import { useId, useState, type ReactElement, type ReactNode } from 'react';
import { ColorWell } from '../components/ColorWell.js';
import { TagChip } from '../components/TagChip.js';
import { ThemeGrid } from '../components/ThemeSwitcher.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { SectionLabel } from '../components/ui/SectionLabel.js';
import { useProjects } from '../hooks/useProjects.js';
import {
  useCreateProject,
  useCreateTag,
  useDeleteTag,
  useUpdateProject,
} from '../hooks/useSettings.js';
import { useTags } from '../hooks/useTags.js';
import { suggestColor } from '../lib/constants.js';

interface ProjectForm {
  id: string | null;
  name: string;
  slug: string;
  prefix: string;
  /** null until picked, so the suggestion can follow the live project count. */
  color: string | null;
  description: string;
}

const EMPTY_PROJECT: ProjectForm = {
  id: null,
  name: '',
  slug: '',
  prefix: '',
  color: null,
  description: '',
};

/** A settings block: title and description on the left, content on the right. */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}): ReactElement {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-border py-7 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)]"
    >
      <div>
        <h2 id={titleId} className="text-sm font-semibold text-fg">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-[1.45] text-fg-tertiary">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function Settings(): ReactElement {
  const projectsQuery = useProjects();
  const tagsQuery = useTags();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const projects = projectsQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

  const [form, setForm] = useState<ProjectForm>(EMPTY_PROJECT);
  const [tagName, setTagName] = useState('');
  // null until picked: suggestions rotate with the count, so consecutive adds differ.
  const [pickedTagColor, setPickedTagColor] = useState<string | null>(null);

  const projectColor = form.color ?? suggestColor(projects.length);
  const tagColor = pickedTagColor ?? suggestColor(tags.length);
  const canSaveProject = form.name.trim() && form.slug.trim() && form.prefix.trim();

  const resetForm = (): void => setForm(EMPTY_PROJECT);

  const submitProject = (): void => {
    if (!canSaveProject) return;
    const input = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      prefix: form.prefix.trim().toUpperCase(),
      color: projectColor,
      description: form.description.trim() || null,
    };
    if (form.id) {
      updateProject.mutate({ id: form.id, input }, { onSuccess: resetForm });
    } else {
      createProject.mutate(input, { onSuccess: resetForm });
    }
  };

  const submitTag = (): void => {
    if (!tagName.trim()) return;
    createTag.mutate(
      { name: tagName.trim(), color: tagColor },
      {
        onSuccess: () => {
          setTagName('');
          setPickedTagColor(null);
        },
      },
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="page-content mx-auto max-w-[820px] pt-7">
        <h1 className="mb-6 text-2xl font-semibold tracking-[-0.022em] text-fg">Settings</h1>

        <SettingsSection
          title="Appearance"
          description="Palette and mode apply to this device only."
        >
          <ThemeGrid />
        </SettingsSection>

        <SettingsSection
          title="Projects"
          description="Prefix starts each ticket ref. Changing it only affects new tickets."
        >
          {projects.length > 0 && (
            <ul className="mb-4 rounded-md border border-border bg-surface shadow-card">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex h-10 items-center gap-2.5 border-t border-border pr-1.5 pl-3 first:border-t-0"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-[2.5px]"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate text-sm font-medium text-fg">{project.name}</span>
                  <span className="truncate font-mono text-2xs text-fg-tertiary">
                    {project.prefix} · {project.slug}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    label={`Edit ${project.name}`}
                    className="ml-auto"
                    onClick={() =>
                      setForm({
                        id: project.id,
                        name: project.name,
                        slug: project.slug,
                        prefix: project.prefix,
                        color: project.color,
                        description: project.description ?? '',
                      })
                    }
                  >
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <SectionLabel as="div" className="mb-2">
            {form.id ? `Edit ${form.name || 'project'}` : 'New project'}
          </SectionLabel>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
            <Input
              aria-label="Name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Name"
            />
            <Input
              mono
              aria-label="Slug"
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              placeholder="slug"
            />
            <Input
              mono
              aria-label="Prefix"
              value={form.prefix}
              onChange={(event) => setForm({ ...form, prefix: event.target.value.toUpperCase() })}
              placeholder="PREFIX"
            />
            <ColorWell
              label="Project color"
              value={projectColor}
              onChange={(color) => setForm({ ...form, color })}
            />
          </div>
          <Input
            aria-label="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Description (optional)"
            className="mt-2"
          />
          {(createProject.isError || updateProject.isError) && (
            <p role="alert" className="mt-2 text-xs text-danger">
              Could not save the project. Slug and prefix must be unique.
            </p>
          )}
          <div className="mt-2.5 flex gap-1.5">
            <Button
              variant="secondary"
              icon={form.id ? undefined : Plus}
              onClick={submitProject}
              disabled={!canSaveProject || createProject.isPending || updateProject.isPending}
            >
              {form.id ? 'Save changes' : 'Add project'}
            </Button>
            {form.id && (
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Tags"
          description="Tag color only drives the dot, so any color reads on every theme."
        >
          {tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} onRemove={() => deleteTag.mutate(tag.id)} />
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-[1_1_160px]">
              <Input
                aria-label="Tag name"
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                placeholder="New tag name"
              />
            </div>
            <ColorWell label="Tag color" value={tagColor} onChange={setPickedTagColor} />
            <Button
              variant="secondary"
              onClick={submitTag}
              disabled={!tagName.trim() || createTag.isPending}
            >
              Add tag
            </Button>
          </div>
          {createTag.isError && (
            <p role="alert" className="mt-2 text-xs text-danger">
              Could not add the tag. Tag names must be unique.
            </p>
          )}
        </SettingsSection>
      </div>
    </div>
  );
}
