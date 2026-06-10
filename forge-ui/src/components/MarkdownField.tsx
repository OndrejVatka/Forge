import { useState, type ReactElement } from 'react';
import { Markdown } from './Markdown.js';

interface MarkdownFieldProps {
  label: string;
  value: string | null;
  placeholder: string;
  onSave: (next: string | null) => void;
}

/** A markdown block that toggles between a rendered view and an edit textarea. */
export function MarkdownField({
  label,
  value,
  placeholder,
  onSave,
}: MarkdownFieldProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEditing = (): void => {
    setDraft(value ?? '');
    setEditing(true);
  };

  const save = (): void => {
    const trimmed = draft.trim();
    onSave(trimmed.length > 0 ? trimmed : null);
    setEditing(false);
  };

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{label}</h3>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="text-xs text-muted hover:text-text"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            className="w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <Markdown>{value}</Markdown>
      ) : (
        <p className="text-sm text-muted">{placeholder}</p>
      )}
    </section>
  );
}
