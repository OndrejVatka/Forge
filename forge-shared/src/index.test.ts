import { describe, it, expect } from 'vitest';
import {
  TICKET_STATUSES,
  COMMENT_AUTHORS,
  ticketStatusSchema,
  prioritySchema,
  commentAuthorSchema,
} from './index.js';

describe('domain value sets', () => {
  it('should accept every declared ticket status', () => {
    for (const status of TICKET_STATUSES) {
      expect(ticketStatusSchema.parse(status)).toBe(status);
    }
  });

  it('should reject an unknown status', () => {
    expect(ticketStatusSchema.safeParse('archived').success).toBe(false);
  });

  it('should reject an unknown priority', () => {
    expect(prioritySchema.safeParse('critical').success).toBe(false);
  });

  it('should include `system` as a comment author but not a ticket creator', () => {
    expect(commentAuthorSchema.safeParse('system').success).toBe(true);
    expect(COMMENT_AUTHORS).toContain('system');
  });
});
