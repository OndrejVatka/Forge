import { describe, it, expect } from 'vitest';
import { backupFileName, parseBackupName, selectBackupsToPrune } from '../src/retention.js';

const NOW = new Date('2026-10-24T12:00:00Z');
const POLICY = { maxAgeDays: 30, keepMin: 2 };

/** A backup name `days` days before NOW. */
function daysAgo(days: number, label = 'manual'): string {
  return backupFileName(new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000), label);
}

describe('backupFileName', () => {
  it('should embed a compact UTC timestamp and the label', () => {
    expect(backupFileName(NOW, 'pre-deploy-pr37')).toBe(
      'forge-20261024T120000Z-pre-deploy-pr37.dump',
    );
  });

  it('should reject labels that could escape the naming scheme', () => {
    expect(() => backupFileName(NOW, '../etc')).toThrow();
    expect(() => backupFileName(NOW, 'Upper')).toThrow();
  });
});

describe('parseBackupName', () => {
  it('should round-trip a generated name', () => {
    expect(parseBackupName(backupFileName(NOW, 'manual'))?.createdAt).toEqual(NOW);
  });

  it('should ignore files this tool did not write', () => {
    expect(parseBackupName('notes.txt')).toBeNull();
    expect(parseBackupName('forge-20261024T120000Z-manual.dump.json')).toBeNull();
    expect(parseBackupName('forge-20261024T120000Z-manual.dump.partial')).toBeNull();
  });
});

describe('selectBackupsToPrune', () => {
  describe('when backups are older than the retention window', () => {
    it('should prune them, oldest first', () => {
      const names = [daysAgo(1), daysAgo(2), daysAgo(40), daysAgo(31)];
      expect(selectBackupsToPrune(names, NOW, POLICY)).toEqual([daysAgo(40), daysAgo(31)]);
    });
  });

  describe('when every backup is old', () => {
    it('should still keep the newest keepMin', () => {
      const names = [daysAgo(100), daysAgo(90), daysAgo(80)];
      expect(selectBackupsToPrune(names, NOW, POLICY)).toEqual([daysAgo(100)]);
    });
  });

  describe('when backups are inside the window', () => {
    it('should keep them even beyond keepMin', () => {
      const names = [daysAgo(1), daysAgo(5), daysAgo(10), daysAgo(29)];
      expect(selectBackupsToPrune(names, NOW, POLICY)).toEqual([]);
    });
  });

  it('should never select unrelated files', () => {
    const names = ['README.md', 'forge-old.dump', daysAgo(1), daysAgo(2), daysAgo(50)];
    expect(selectBackupsToPrune(names, NOW, POLICY)).toEqual([daysAgo(50)]);
  });
});
