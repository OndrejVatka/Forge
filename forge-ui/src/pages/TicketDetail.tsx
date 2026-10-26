import { PRIORITIES, type Priority, type TicketStatus, TICKET_STATUSES } from '@forge/shared';
import { ArrowLeft, Zap } from 'lucide-react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ActivityLog } from '../components/ActivityLog.js';
import { MarkdownField } from '../components/MarkdownField.js';
import { FullScreenLoader } from '../components/Spinner.js';
import { StatusMark } from '../components/StatusMark.js';
import { TagChip } from '../components/TagChip.js';
import { Button, buttonClassName } from '../components/ui/Button.js';
import { Icon } from '../components/ui/Icon.js';
import { SectionLabel } from '../components/ui/SectionLabel.js';
import { Select } from '../components/ui/Select.js';
import { Textarea } from '../components/ui/Textarea.js';
import { useTags } from '../hooks/useTags.js';
import {
  useAddComment,
  useSetTicketStatus,
  useTicket,
  useUpdateTicket,
} from '../hooks/useTicket.js';
import { AUTHOR_LABELS, PRIORITY_META, STATUS_META, isAgent } from '../lib/constants.js';

/** One labelled row in the Properties aside. */
function PropertyRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="grid min-h-7 grid-cols-[76px_minmax(0,1fr)] items-center gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-xs text-fg-tertiary">
          {label}
        </label>
      ) : (
        <span className="text-xs text-fg-tertiary">{label}</span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function TicketDetail(): ReactElement {
  const { ref } = useParams<{ ref: string }>();
  const ticketQuery = useTicket(ref);
  const tagsQuery = useTags();

  const setStatus = useSetTicketStatus(ref);
  const updateTicket = useUpdateTicket(ref);
  const addComment = useAddComment(ref);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');

  if (ticketQuery.isLoading) return <FullScreenLoader />;

  const ticket = ticketQuery.data;
  if (!ticket) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-fg-tertiary">
        <p>
          Ticket <span className="font-mono">{ref}</span> not found.
        </p>
        <Link to="/" className="text-accent-text hover:underline">
          Back to board
        </Link>
      </div>
    );
  }

  const isAiCreated = isAgent(ticket.created_by);
  const ticketTagIds = ticket.tags.map((tag) => tag.id);

  const startEditingTitle = (): void => {
    setTitleDraft(ticket.title);
    setEditingTitle(true);
  };

  const saveTitle = (): void => {
    const next = titleDraft.trim();
    if (next && next !== ticket.title) {
      updateTicket.mutate({ existing: ticket, fields: { title: next } });
    }
    setEditingTitle(false);
  };

  const toggleTag = (tagId: string): void => {
    const nextIds = ticketTagIds.includes(tagId)
      ? ticketTagIds.filter((id) => id !== tagId)
      : [...ticketTagIds, tagId];
    updateTicket.mutate({ existing: ticket, fields: { tagIds: nextIds } });
  };

  const submitComment = (): void => {
    const body = commentDraft.trim();
    if (!body) return;
    addComment.mutate(
      { ticketId: ticket.id, body, author: 'human' },
      { onSuccess: () => setCommentDraft('') },
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <nav
        aria-label="Breadcrumb"
        className="app-toolbar flex items-center gap-1.5 border-b border-border text-xs"
      >
        <Link to="/" className={buttonClassName({ variant: 'ghost', size: 'sm' })}>
          <Icon icon={ArrowLeft} size={14} />
          Board
        </Link>
        <span aria-hidden="true" className="text-fg-tertiary">
          /
        </span>
        <span aria-current="page" className="font-mono text-fg-secondary">
          {ticket.ticket_ref}
        </span>
      </nav>

      {/*
       * Desktop: main column + a sticky 240px Properties aside. Under 768px it
       * stacks title → properties → body, so properties sit above the description.
       */}
      <div className="page-content mx-auto grid max-w-[980px] grid-cols-1 gap-x-10 gap-y-5 pt-6 [grid-template-areas:'title'_'props'_'body'] md:grid-cols-[minmax(0,1fr)_240px] md:[grid-template-areas:'title_props'_'body_props']">
        <div className="min-w-0 [grid-area:title]">
          {editingTitle ? (
            <input
              autoFocus
              aria-label="Title"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveTitle();
                if (event.key === 'Escape') setEditingTitle(false);
              }}
              className="-mx-2 w-[calc(100%+1rem)] rounded-sm border border-accent-text bg-surface px-2 py-0.5 text-xl leading-tight font-semibold tracking-[-0.022em] text-fg ring-3 ring-accent-soft outline-hidden"
            />
          ) : (
            <h1 className="text-xl leading-tight font-semibold tracking-[-0.022em] text-pretty text-fg">
              <button
                type="button"
                onClick={startEditingTitle}
                title="Edit title"
                className="-mx-2 w-[calc(100%+1rem)] cursor-text rounded-sm border border-transparent px-2 py-0.5 text-left hover:bg-surface-hover/60"
              >
                {ticket.title}
              </button>
            </h1>
          )}
        </div>

        <aside
          aria-labelledby="ticket-properties"
          className="flex flex-col gap-1 self-start [grid-area:props] md:sticky md:top-6"
        >
          <SectionLabel id="ticket-properties" className="mb-1.5">
            Properties
          </SectionLabel>
          <PropertyRow label="Status" htmlFor="ticket-status">
            <span className="inline-flex items-center gap-0.5">
              <span className="inline-flex w-[18px] justify-center">
                <StatusMark status={ticket.status} />
              </span>
              <Select
                id="ticket-status"
                variant="ghost"
                size="sm"
                value={ticket.status}
                onChange={(event) =>
                  setStatus.mutate({
                    ticketId: ticket.id,
                    status: event.target.value as TicketStatus,
                  })
                }
              >
                {TICKET_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </Select>
            </span>
          </PropertyRow>
          <PropertyRow label="Priority" htmlFor="ticket-priority">
            <Select
              id="ticket-priority"
              variant="ghost"
              size="sm"
              value={ticket.priority}
              onChange={(event) =>
                updateTicket.mutate({
                  existing: ticket,
                  fields: { priority: event.target.value as Priority },
                })
              }
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_META[priority].label}
                </option>
              ))}
            </Select>
          </PropertyRow>
          <PropertyRow label="Created by">
            <span
              className={`inline-flex items-center gap-[5px] pl-2 text-xs font-medium ${
                isAiCreated ? 'text-ai' : 'text-fg'
              }`}
            >
              {isAiCreated && <Icon icon={Zap} size={11} filled />}
              {AUTHOR_LABELS[ticket.created_by]}
            </span>
          </PropertyRow>
          <div className="mt-2.5">
            <div id="ticket-tags" className="mb-2 text-xs text-fg-tertiary">
              Tags
            </div>
            <div role="group" aria-labelledby="ticket-tags" className="flex flex-wrap gap-1">
              {(tagsQuery.data ?? []).map((tag) => (
                <TagChip
                  key={tag.id}
                  tag={tag}
                  active={ticketTagIds.includes(tag.id)}
                  onClick={() => toggleTag(tag.id)}
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 [grid-area:body]">
          <div className="flex flex-col gap-[22px]">
            <MarkdownField
              label="Description"
              value={ticket.description}
              placeholder="No description."
              onSave={(next) =>
                updateTicket.mutate({ existing: ticket, fields: { description: next } })
              }
            />
            <MarkdownField
              label="Acceptance criteria"
              value={ticket.acceptance_criteria}
              placeholder="No acceptance criteria."
              onSave={(next) =>
                updateTicket.mutate({ existing: ticket, fields: { acceptance_criteria: next } })
              }
            />
          </div>

          <section aria-labelledby="ticket-activity" className="mt-7 border-t border-border pt-5">
            <SectionLabel id="ticket-activity" className="mb-3.5">
              Activity
            </SectionLabel>
            <ActivityLog comments={ticket.comments ?? []} />

            <div className="mt-[18px]">
              <Textarea
                aria-label="Comment"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                rows={2}
                placeholder="Add a comment…"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={submitComment}
                  disabled={!commentDraft.trim() || addComment.isPending}
                >
                  {addComment.isPending ? 'Posting…' : 'Comment'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
