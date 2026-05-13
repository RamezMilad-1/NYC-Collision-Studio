import { useCallback, useSyncExternalStore } from 'react';

export const THEME_STORAGE_KEY = 'nyc-collision-studio-theme';

export type ThemeMode = 'dark' | 'light';

const THEME_META_SELECTOR = 'meta[name="theme-color"]';

function readThemeFromDom(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'light') {
    root.dataset.theme = 'light';
  } else {
    delete root.dataset.theme;
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
  const meta = document.querySelector(THEME_META_SELECTOR);
  if (meta) {
    meta.setAttribute('content', mode === 'light' ? '#f4f2ee' : '#08090b');
  }
}

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener('nyc-collision-theme', handler);
  return () => window.removeEventListener('nyc-collision-theme', handler);
}

function getSnapshot(): ThemeMode {
  return readThemeFromDom();
}

function getServerSnapshot(): ThemeMode {
  return 'dark';
}

function dispatchThemeChange() {
  window.dispatchEvent(new Event('nyc-collision-theme'));
}

export function useTheme() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMode = useCallback((next: ThemeMode) => {
    applyTheme(next);
    dispatchThemeChange();
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  return { mode, setMode, toggle };
}
