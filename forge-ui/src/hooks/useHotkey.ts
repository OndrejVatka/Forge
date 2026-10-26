import { useEffect, useRef } from 'react';

/**
 * Whether a key event started in a place where the user is typing, so a
 * single-letter shortcut must not fire there.
 * @param target - The event target.
 * @returns True for inputs, textareas, selects and contenteditable regions.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Binds a single-key, modifier-free shortcut on the document (e.g. `C` for a
 * new ticket). Ignored while typing, with a modifier held, or when disabled.
 * @param key - The key, matched case-insensitively.
 * @param handler - Runs on press; the default action is prevented.
 * @param isEnabled - Turn the shortcut off (e.g. while a modal is open).
 */
export function useHotkey(key: string, handler: () => void, isEnabled = true): void {
  // The latest handler, so callers needn't memoize it.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!isEnabled) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      handlerRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, isEnabled]);
}
