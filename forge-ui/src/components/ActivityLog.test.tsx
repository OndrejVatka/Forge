import type { Comment } from '@forge/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityLog } from './ActivityLog.js';

function makeComment(overrides: Partial<Comment>): Comment {
  return {
    id: 'c1',
    ticket_id: 't1',
    author: 'human',
    body: 'Looks good',
    created_at: '2026-10-26T14:05:00Z',
    ...overrides,
  };
}

describe('ActivityLog', () => {
  describe('when there is no activity', () => {
    it('should say so', () => {
      render(<ActivityLog comments={[]} />);
      expect(screen.getByText('No activity yet.')).toBeInTheDocument();
    });
  });

  it('should show agent comments with the agent name in the AI colour', () => {
    render(
      <ActivityLog comments={[makeComment({ author: 'claude-code', body: 'Opened a PR.' })]} />,
    );

    expect(screen.getByText('Claude Code')).toHaveClass('text-ai');
    expect(screen.getByText('Opened a PR.')).toBeInTheDocument();
  });

  it('should show human comments as Human, not as an agent', () => {
    render(<ActivityLog comments={[makeComment({ author: 'human' })]} />);

    expect(screen.getByText('Human')).not.toHaveClass('text-ai');
  });

  it('should render comment bodies as markdown', () => {
    render(<ActivityLog comments={[makeComment({ body: 'Run `make verify` first' })]} />);

    expect(screen.getByText('make verify').tagName).toBe('CODE');
  });

  it('should show system events as a single line, without an author', () => {
    render(
      <ActivityLog
        comments={[
          makeComment({ author: 'system', body: 'Status changed from backlog to in_dev' }),
        ]}
      />,
    );

    expect(screen.getByText(/Status changed from backlog to in_dev/)).toBeInTheDocument();
    expect(screen.queryByText('System')).not.toBeInTheDocument();
  });

  it('should give each timestamp a machine-readable time', () => {
    const { container } = render(<ActivityLog comments={[makeComment({})]} />);

    expect(container.querySelector('time')).toHaveAttribute('dateTime', '2026-10-26T14:05:00Z');
  });
});
