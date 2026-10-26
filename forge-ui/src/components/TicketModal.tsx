import { PRIORITIES, type Priority, type Project, type Tag } from '@forge/shared';
import { X } from 'lucide-react';
import { useState, type FormEvent, type ReactElement } from 'react';
import { useCreateTicket } from '../hooks/useTickets.js';
import { PRIORITY_META } from '../lib/constants.js';
import { Button } from './ui/Button.js';
import { Input } from './ui/Input.js';
import { Select } from './ui/Select.js';
import { Textarea } from './ui/Textarea.js';

interface TicketModalProps {
  project: Pick<Project, 'id' | 'prefix' | 'name'>;
  tags: Tag[];
  onClose: () => void;
}

/** Create-ticket modal. Edits happen on the ticket detail page. */
export function TicketModal({ project, tags, onClose }: TicketModalProps): ReactElement {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const createTicket = useCreateTicket(project.id);

  const toggleTag = (tagId: string): void => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  };

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (!title.trim()) return;
    createTicket.mutate(
      {
        project: { id: project.id, prefix: project.prefix },
        title: title.trim(),
        description: description.trim() || null,
        acceptance_criteria: acceptanceCriteria.trim() || null,
        priority,
        tagIds: selectedTagIds,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl border border-border bg-surface p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">New ticket in {project.name}</h2>
          <Button variant="ghost" size="sm" icon={X} label="Close" onClick={onClose} />
        </div>

        <label htmlFor="new-ticket-title" className="mb-1 text-xs text-muted">
          Title
        </label>
        <Input
          id="new-ticket-title"
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          className="mb-3"
        />

        <label htmlFor="new-ticket-description" className="mb-1 text-xs text-muted">
          Description (markdown)
        </label>
        <Textarea
          id="new-ticket-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="mb-3"
        />

        <label htmlFor="new-ticket-criteria" className="mb-1 text-xs text-muted">
          Acceptance criteria (markdown)
        </label>
        <Textarea
          id="new-ticket-criteria"
          value={acceptanceCriteria}
          onChange={(event) => setAcceptanceCriteria(event.target.value)}
          rows={2}
          placeholder="What does done look like?"
          className="mb-3"
        />

        <label htmlFor="new-ticket-priority" className="mb-1 text-xs text-muted">
          Priority
        </label>
        <Select
          id="new-ticket-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
          className="mb-3 self-start"
        >
          {PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {PRIORITY_META[option].label}
            </option>
          ))}
        </Select>

        {tags.length > 0 && (
          <>
            <label className="mb-1 text-xs text-muted">Tags</label>
            <div className="mb-4 flex flex-wrap gap-1">
              {tags.map((tag) => {
                const active = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className="rounded border px-1.5 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: active ? `${tag.color}33` : 'transparent',
                      color: tag.color,
                      borderColor: `${tag.color}55`,
                      opacity: active ? 1 : 0.6,
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {createTicket.isError && (
          <p className="mb-3 text-xs text-red-400">
            Could not create the ticket. Please try again.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || createTicket.isPending}>
            {createTicket.isPending ? 'Creating…' : 'Create ticket'}
          </Button>
        </div>
      </form>
    </div>
  );
}
