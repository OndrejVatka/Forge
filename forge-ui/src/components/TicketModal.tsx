import type { Priority, Project, Tag } from '@forge/shared';
import { PRIORITIES } from '@forge/shared/constants';
import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { useCreateTicket } from '../hooks/useTickets.js';
import { PRIORITY_META } from '../lib/constants.js';
import { TagChip } from './TagChip.js';
import { Button } from './ui/Button.js';
import { Select } from './ui/Select.js';
import { Textarea } from './ui/Textarea.js';

interface TicketModalProps {
  project: Pick<Project, 'id' | 'prefix' | 'name'>;
  tags: Tag[];
  onClose: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';
const IS_APPLE = /Mac|iPhone|iPad/.test(navigator.userAgent);
const SUBMIT_HINT = IS_APPLE ? '⌘↵' : 'Ctrl ↵';

/**
 * Create-ticket modal, anchored near the top like a command palette. Esc
 * closes, ⌘/Ctrl+Enter submits, focus stays inside while open and returns to
 * the opener on close. Edits happen on the ticket detail page.
 */
export function TicketModal({ project, tags, onClose }: TicketModalProps): ReactElement {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const headingId = useId();

  const createTicket = useCreateTicket(project.id);

  // A ref, so a parent re-render (new inline onClose) can't re-run the effect
  // below and pull focus out of the open modal.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Read on first render: by the time effects run, autoFocus has already
  // moved focus to the title, so the opener would be lost.
  const [opener] = useState(() => document.activeElement);

  // Esc from anywhere closes; focus goes back to whatever opened the modal.
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [opener]);

  const toggleTag = (tagId: string): void => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  };

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    // Guard against a double ⌘↵ creating two tickets.
    if (!title.trim() || createTicket.isPending) return;
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

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>): void => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      formRef.current?.requestSubmit();
      return;
    }
    // Keep Tab cycling inside the dialog.
    if (event.key !== 'Tab' || !formRef.current) return;
    const focusable = [...formRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-scrim px-4 pt-[14vh] pb-4"
      onClick={onClose}
    >
      <form
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className="flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-pop"
      >
        <div className="flex items-center gap-1.5 pt-2.5 pr-2.5 pl-4">
          <span className="inline-flex h-5 items-center rounded-xs border border-border px-1.5 font-mono text-2xs text-fg-secondary">
            {project.prefix}
          </span>
          <span aria-hidden="true" className="text-xs text-fg-tertiary">
            ›
          </span>
          <h2 id={headingId} className="text-xs text-fg-secondary">
            New ticket
          </h2>
          <Button
            variant="ghost"
            size="sm"
            icon={X}
            label="Close"
            onClick={onClose}
            className="ml-auto"
          />
        </div>

        <div className="px-4 pt-2.5 pb-1">
          {/* Borderless by design; the caret marks focus. */}
          <input
            autoFocus
            aria-label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs doing?"
            className="w-full border-0 bg-transparent p-0 text-lg font-semibold tracking-[-0.012em] text-fg outline-hidden placeholder:text-fg-tertiary"
          />
          <Textarea
            bare
            rows={3}
            aria-label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add description… markdown supported"
            className="mt-2"
          />
          <Textarea
            bare
            rows={2}
            aria-label="Acceptance criteria"
            value={acceptanceCriteria}
            onChange={(event) => setAcceptanceCriteria(event.target.value)}
            placeholder="Acceptance criteria… what does done look like?"
            className="mt-1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2 pb-3">
          <Select
            size="sm"
            aria-label="Priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
          >
            {PRIORITIES.map((option) => (
              <option key={option} value={option}>
                {PRIORITY_META[option].label} priority
              </option>
            ))}
          </Select>
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              active={selectedTagIds.includes(tag.id)}
              onClick={() => toggleTag(tag.id)}
            />
          ))}
        </div>

        {createTicket.isError && (
          <p role="alert" className="px-4 pb-3 text-xs text-danger">
            Could not create the ticket. Please try again.
          </p>
        )}

        <div className="flex justify-end gap-1.5 border-t border-border px-3 py-2.5">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            shortcut={SUBMIT_HINT}
            disabled={!title.trim() || createTicket.isPending}
          >
            {createTicket.isPending ? 'Creating…' : 'Create ticket'}
          </Button>
        </div>
      </form>
    </div>
  );
}
