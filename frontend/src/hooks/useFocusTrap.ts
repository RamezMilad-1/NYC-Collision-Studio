import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab focus inside the returned ref while `active` is true and
 * restores focus to the previously focused element on unmount.
 * Closes on Escape via the supplied onEscape callback.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onEscape?: () => void,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      );

    // focus first focusable on mount
    const initial = focusables();
    if (initial.length) initial[0].focus();
    else node.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [active, onEscape]);

  return ref;
}
