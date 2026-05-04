import { useCallback, useState } from 'react';

export interface UsePaginationResult {
  offset: number;
  pageSize: number;
  prev: () => void;
  next: (total: number) => void;
  reset: () => void;
  setOffset: (n: number) => void;
}

export function usePagination(pageSize: number): UsePaginationResult {
  const [offset, setOffset] = useState(0);
  const prev = useCallback(() => setOffset((o) => Math.max(0, o - pageSize)), [pageSize]);
  const next = useCallback(
    (total: number) =>
      setOffset((o) => Math.min(o + pageSize, Math.max(0, total - pageSize))),
    [pageSize],
  );
  const reset = useCallback(() => setOffset(0), []);
  return { offset, pageSize, prev, next, reset, setOffset };
}
