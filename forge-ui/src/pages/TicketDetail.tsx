import type { ReactElement } from 'react';
import { useParams } from 'react-router-dom';

export function TicketDetail(): ReactElement {
  const { ref } = useParams<{ ref: string }>();
  return <div className="p-6 text-muted">Ticket {ref} — coming next.</div>;
}
