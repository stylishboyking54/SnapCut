'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function ShopFilm({ photos }: { photos: string[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const frames = photos.filter(Boolean);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scroller.current;
    if (!el || frames.length < 2) return;

    let index = 0;
    let timer = 0;

    const goTo = (i: number) => {
      index = i;
      el.scrollTo({ left: el.clientWidth * index, behavior: 'smooth' });
      setActive(index);
    };

    const step = () => goTo((index + 1) % frames.length);

    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(step, 3500);
    };

    start();

    // Detect manual swipe and sync dot
    const onScroll = () => {
      if (!el.clientWidth) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setActive(i % frames.length);
    };

    const pause = () => window.clearInterval(timer);
    const resume = () => start();

    el.addEventListener('pointerdown', pause);
    el.addEventListener('pointerup', resume);
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.clearInterval(timer);
      el.removeEventListener('pointerdown', pause);
      el.removeEventListener('pointerup', resume);
      el.removeEventListener('scroll', onScroll);
    };
  }, [frames.join('|')]);

  if (!frames.length) {
    return <div className="shop-film shop-film-empty" />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Scrollable photo strip */}
      <div className="shop-film" ref={scroller}>
        {frames.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
              flex: '0 0 100%',
            }}
          />
        ))}
      </div>

      {/* Dot indicators — only show when there are multiple photos */}
      {frames.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 5,
            pointerEvents: 'none',
          }}
        >
          {frames.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === active ? 18 : 6,
                height: 6,
                borderRadius: 99,
                background: i === active ? '#fff' : 'rgba(255,255,255,0.45)',
                transition: 'width 0.3s ease, background 0.3s ease',
                display: 'inline-block',
              }}
            />
          ))}
        </div>
      )}

      {/* Photo count badge top-right */}
      {frames.length > 1 && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 99,
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
          }}
        >
          {active + 1}/{frames.length}
        </span>
      )}
    </div>
  );
}
