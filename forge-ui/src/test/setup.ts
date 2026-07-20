import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

/*
 * The `localStorage` global this runner exposes is a bare object, not a
 * Storage — reading or writing through it throws. Anything that persists user
 * preferences (the theme, the selected project) needs a real implementation to
 * be testable at all, so install an in-memory one and reset it per test.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, writable: true });

beforeEach(() => {
  memoryStorage.clear();
});
