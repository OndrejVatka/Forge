import { X } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { useProjects } from '../hooks/useProjects.js';
import {
  useCreateProject,
  useCreateTag,
  useDeleteTag,
  useUpdateProject,
} from '../hooks/useSettings.js';
import { useTags } from '../hooks/useTags.js';

interface ProjectForm {
  id: string | null;
  name: string;
  slug: string;
  prefix: string;
  color: string;
  description: string;
}

const EMPTY_PROJECT: ProjectForm = {
  id: null,
  name: '',
  slug: '',
  prefix: '',
  color: '#6366f1',
  description: '',
};

export function Settings(): ReactElement {
  const projectsQuery = useProjects();
  const tagsQuery = useTags();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const [form, setForm] = useState<ProjectForm>(EMPTY_PROJECT);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#94a3b8');

  const canSaveProject = form.name.trim() && form.slug.trim() && form.prefix.trim();

  const resetForm = (): void => setForm(EMPTY_PROJECT);

  const submitProject = (): void => {
    if (!canSaveProject) return;
    const input = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      prefix: form.prefix.trim().toUpperCase(),
      color: form.color,
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
          setTagColor('#94a3b8');
        },
      },
    );
  };

  return (
    <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-4 py-6">
      <h1 className="mb-6 text-lg font-semibold">Settings</h1>

      {/* Projects */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted">Projects</h2>
        <ul className="mb-4 flex flex-col gap-1">
          {(projectsQuery.data ?? []).map((project) => (
            <li
              key={project.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="text-sm">{project.name}</span>
              <span className="font-mono text-xs text-muted">{project.prefix}</span>
              <button
                type="button"
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
                className="ml-auto text-xs text-muted hover:text-text"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            {form.id ? 'Edit project' : 'New project'}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Name"
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              placeholder="Slug (e.g. proofindex)"
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={form.prefix}
              onChange={(event) => setForm({ ...form, prefix: event.target.value })}
              placeholder="Prefix (e.g. PI)"
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm uppercase outline-none focus:border-primary"
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={(event) => setForm({ ...form, color: event.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-border bg-bg"
              />
              <span className="font-mono text-xs text-muted">{form.color}</span>
            </div>
          </div>
          <input
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Description (optional)"
            className="mt-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {(createProject.isError || updateProject.isError) && (
            <p className="mt-2 text-xs text-red-400">
              Could not save the project (slug and prefix must be unique).
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={submitProject}
              disabled={!canSaveProject || createProject.isPending || updateProject.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {form.id ? 'Save changes' : 'Add project'}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:text-text"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tags */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Tags</h2>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {(tagsQuery.data ?? []).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: `${tag.color}1a`,
                color: tag.color,
                borderColor: `${tag.color}33`,
              }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => deleteTag.mutate(tag.id)}
                className="opacity-70 hover:opacity-100"
                aria-label={`Delete tag ${tag.name}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
            placeholder="New tag name"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="color"
            value={tagColor}
            onChange={(event) => setTagColor(event.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-border bg-bg"
          />
          <button
            type="button"
            onClick={submitTag}
            disabled={!tagName.trim() || createTag.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            Add tag
          </button>
        </div>
      </section>
    </div>
  );
}
