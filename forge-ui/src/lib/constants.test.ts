import { TICKET_STATUSES, PRIORITIES } from '@forge/shared';
import { describe, it, expect } from 'vitest';
import { STATUS_ORDER, STATUS_META, PRIORITY_META } from './constants.js';

describe('board constants', () => {
  it('should order every ticket status exactly once', () => {
    expect([...STATUS_ORDER].sort()).toEqual([...TICKET_STATUSES].sort());
  });

  it('should have metadata for every status', () => {
    for (const status of TICKET_STATUSES) {
      expect(STATUS_META[status]?.label).toBeTruthy();
    }
  });

  it('should have metadata for every priority', () => {
    for (const priority of PRIORITIES) {
      expect(PRIORITY_META[priority]?.label).toBeTruthy();
    }
  });
});
