import { PRIORITIES, type Priority, type TicketStatus, TICKET_STATUSES } from '@forge/shared';
import { ArrowLeft, Zap } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ActivityLog } from '../components/ActivityLog.js';
import { MarkdownField } from '../components/MarkdownField.js';
import { FullScreenLoader } from '../components/Spinner.js';
import { useTags } from '../hooks/useTags.js';
import {
  useAddComment,
  useSetTicketStatus,
  useTicket,
  useUpdateTicket,
} from '../hooks/useTicket.js';
import { AI_CREATORS, STATUS_META } from '../lib/constants.js';

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
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
        <p>Ticket {ref} not found.</p>
        <Link to="/" className="text-primary hover:underline">
          Back to board
        </Link>
      </div>
    );
  }

  const isAiCreated = (AI_CREATORS as readonly string[]).includes(ticket.created_by);
  const ticketTagIds = ticket.tags.map((tag) => tag.id);

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
    <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-4 py-5">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text"
      >
        <ArrowLeft size={15} /> Board
      </Link>

      <div className="mb-1 flex items-center gap-2">
        <span className="font-mono text-sm text-muted">{ticket.ticket_ref}</span>
        {isAiCreated && (
          <Zap size={13} className="text-primary" aria-label={`Created by ${ticket.created_by}`} />
        )}
      </div>

      {editingTitle ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') saveTitle();
            if (event.key === 'Escape') setEditingTitle(false);
          }}
          className="mb-4 w-full rounded-lg border border-border bg-bg px-3 py-2 text-lg font-semibold outline-none focus:border-primary"
        />
      ) : (
        <h1
          onClick={() => {
            setTitleDraft(ticket.title);
            setEditingTitle(true);
          }}
          className="mb-4 cursor-text text-lg font-semibold"
          title="Click to edit"
        >
          {ticket.title}
        </h1>
      )}

      <div className="mb-5 flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Status
          <select
            value={ticket.status}
            onChange={(event) =>
              setStatus.mutate({ ticketId: ticket.id, status: event.target.value as TicketStatus })
            }
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
          >
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          Priority
          <select
            value={ticket.priority}
            onChange={(event) =>
              updateTicket.mutate({
                existing: ticket,
                fields: { priority: event.target.value as Priority },
              })
            }
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm capitalize text-text outline-none focus:border-primary"
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-5">
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Tags</h3>
        <div className="flex flex-wrap gap-1">
          {(tagsQuery.data ?? []).map((tag) => {
            const active = ticketTagIds.includes(tag.id);
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
                  opacity: active ? 1 : 0.5,
                }}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5 space-y-5">
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

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Activity</h3>
        <ActivityLog comments={ticket.comments ?? []} />

        <div className="mt-3">
          <textarea
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            rows={2}
            placeholder="Add a comment…"
            className="w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={submitComment}
              disabled={!commentDraft.trim() || addComment.isPending}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {addComment.isPending ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
