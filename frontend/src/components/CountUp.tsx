import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({ value, duration = 900, format }: Props) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hidden = typeof document !== 'undefined' && document.hidden;

    // Skip animation if motion is reduced or the tab is hidden.
    // (Hidden tabs throttle RAF, leaving the value stuck mid-flight.)
    if (reduced || hidden) {
      setDisplay(value);
      return;
    }

    fromRef.current = display;
    startRef.current = null;

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const next = fromRef.current + (value - fromRef.current) * easeOut(t);
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    // Backstop: if for any reason RAF doesn't complete in time
    // (background tab, blocked main thread), force-set the final value.
    const finalize = setTimeout(() => setDisplay(value), duration + 200);

    return () => {
      clearTimeout(finalize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const rounded = Math.round(display);
  return <>{format ? format(rounded) : rounded.toLocaleString()}</>;
}
