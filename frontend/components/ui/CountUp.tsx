'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Counts into the value, then tints up/down when it changes — same beat as the demos. */
export default function CountUp({
  value,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const safe = Number.isFinite(value) ? value : 0;
  const [shown, setShown] = useState(0);
  const [tick, setTick] = useState<'up' | 'down' | ''>('');
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const from = prev.current ?? 0;
    const to = safe;
    const first = prev.current === null;
    prev.current = to;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || from === to) {
      setShown(to);
      return;
    }

    if (!first) setTick(to > from ? 'up' : 'down');

    const start = performance.now();
    const dur = first ? 700 : 520;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const clear = window.setTimeout(() => setTick(''), 1100);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(clear);
    };
  }, [safe]);

  return (
    <span className={`count-num ${tick === 'up' ? 'tick-up' : tick === 'down' ? 'tick-down' : ''} ${className}`.trim()}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}
