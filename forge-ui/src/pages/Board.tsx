import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import type { TicketStatus } from '@forge/shared';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Column } from '../components/Column.js';
import { FilterBar, type PriorityFilter } from '../components/FilterBar.js';
import { FullScreenLoader } from '../components/Spinner.js';
import { TicketModal } from '../components/TicketModal.js';
import { useProjects } from '../hooks/useProjects.js';
import { useRealtime } from '../hooks/useRealtime.js';
import { useTags } from '../hooks/useTags.js';
import { useTickets, useUpdateTicketStatus } from '../hooks/useTickets.js';
import { STATUS_ORDER } from '../lib/constants.js';

const PROJECT_STORAGE_KEY = 'forge.projectId';

export function Board(): ReactElement {
  const projectsQuery = useProjects();
  const tagsQuery = useTags();

  const [projectId, setProjectId] = useState<string | undefined>(
    () => localStorage.getItem(PROJECT_STORAGE_KEY) ?? undefined,
  );
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const projects = projectsQuery.data;

  // Default to the first project once loaded (or if the stored id is gone).
  useEffect(() => {
    if (!projects || projects.length === 0) return;
    const exists = projectId && projects.some((project) => project.id === projectId);
    if (!exists) {
      const firstId = projects[0]?.id;
      setProjectId(firstId);
    }
  }, [projects, projectId]);

  useEffect(() => {
    if (projectId) localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
  }, [projectId]);

  const ticketsQuery = useTickets(projectId);
  useRealtime(projectId);
  const updateStatus = useUpdateTicketStatus(projectId);

  const filtered = useMemo(() => {
    const tickets = ticketsQuery.data ?? [];
    return tickets.filter((ticket) => {
      if (priority !== 'all' && ticket.priority !== priority) return false;
      if (selectedTagNames.length > 0) {
        const names = ticket.tags.map((tag) => tag.name);
        if (!selectedTagNames.some((name) => names.includes(name))) return false;
      }
      return true;
    });
  }, [ticketsQuery.data, priority, selectedTagNames]);

  const handleDragEnd = (result: DropResult): void => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    updateStatus.mutate({ ticketId: draggableId, status: destination.droppableId as TicketStatus });
  };

  const toggleTag = (name: string): void => {
    setSelectedTagNames((current) =>
      current.includes(name) ? current.filter((value) => value !== name) : [...current, name],
    );
  };

  if (projectsQuery.isLoading) return <FullScreenLoader />;

  if (!projects || projects.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
        <p>No projects yet.</p>
        <Link to="/settings" className="text-primary hover:underline">
          Create your first project in Settings
        </Link>
      </div>
    );
  }

  const activeProject = projects.find((project) => project.id === projectId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <select
          value={projectId ?? ''}
          onChange={(event) => setProjectId(event.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <FilterBar
          tags={tagsQuery.data ?? []}
          priority={priority}
          onPriorityChange={setPriority}
          selectedTagNames={selectedTagNames}
          onToggleTag={toggleTag}
        />

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New ticket</span>
        </button>
      </div>

      {ticketsQuery.isLoading ? (
        <FullScreenLoader />
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
            {STATUS_ORDER.map((status) => (
              <Column
                key={status}
                status={status}
                tickets={filtered.filter((ticket) => ticket.status === status)}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      {modalOpen && activeProject && (
        <TicketModal
          project={activeProject}
          tags={tagsQuery.data ?? []}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
