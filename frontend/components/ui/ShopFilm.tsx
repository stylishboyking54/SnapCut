'use client';

import React, { useEffect, useRef } from 'react';

export default function ShopFilm({ photos }: { photos: string[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const frames = photos.filter(Boolean);

  useEffect(() => {
    const el = scroller.current;
    if (!el || frames.length < 2) return;
    let index = 0;
    let timer = 0;
    const step = () => {
      index = (index + 1) % frames.length;
      el.scrollTo({ left: el.clientWidth * index, behavior: 'smooth' });
    };
    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(step, 3200);
    };
    start();
    const pause = () => window.clearInterval(timer);
    el.addEventListener('pointerdown', pause);
    el.addEventListener('pointerup', start);
    return () => {
      window.clearInterval(timer);
      el.removeEventListener('pointerdown', pause);
      el.removeEventListener('pointerup', start);
    };
  }, [frames.join('|')]);

  if (!frames.length) {
    return <div className="shop-film shop-film-empty" />;
  }

  return (
    <div className="shop-film" ref={scroller}>
      {frames.map((src) => (
        <img key={src} src={src} alt="" />
      ))}
    </div>
  );
}
