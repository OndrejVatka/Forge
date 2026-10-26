import { useState, type ReactElement } from 'react';
import { Markdown } from './Markdown.js';
import { Button } from './ui/Button.js';
import { Textarea } from './ui/Textarea.js';

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
          <Button variant="ghost" size="sm" onClick={startEditing}>
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div>
          <Textarea
            autoFocus
            aria-label={label}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
          />
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" size="sm" onClick={save}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
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
