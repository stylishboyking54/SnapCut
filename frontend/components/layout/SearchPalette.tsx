'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getShops } from '@/lib/api';
import { Shop } from '@/lib/types';
import { SearchIcon } from '@/components/ui/Icons';

const PAGES = [
  { href: '/', title: 'Explore', sub: 'Shops near you' },
  { href: '/bookings', title: 'Ticket', sub: 'Your place in line' },
  { href: '/notifications', title: 'Alerts', sub: 'Queue updates' },
  { href: '/map', title: 'Map', sub: 'Shops nearby' },
  { href: '/profile', title: 'Profile', sub: 'Account' },
  { href: '/barber/dashboard', title: 'Shop floor', sub: 'Today’s line' },
];

export default function SearchPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    getShops().then(setShops).catch(() => setShops([]));
  }, []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = PAGES.filter((p) => !q || p.title.toLowerCase().includes(q) || p.sub.toLowerCase().includes(q))
      .map((p) => ({ ...p, group: 'Go to' }));
    const places = shops
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q))
      .slice(0, 6)
      .map((s) => ({
        href: `/shops/${s.id}`,
        title: s.name,
        sub: `${s.shopType === 'salon' ? 'Salon' : 'Barbershop'} · ~${s.estimatedWaitMinutes} min`,
        group: 'Shops',
      }));
    return [...places, ...pages];
  }, [query, shops]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(items.length - 1, i + 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      }
      if (e.key === 'Enter' && items[active]) {
        e.preventDefault();
        router.push(items[active].href);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, items, onClose, router]);

  return (
    <div className="finder-root" role="dialog" aria-modal="true" aria-label="Search">
      <button type="button" className="finder-scrim" aria-label="Close search" onClick={onClose} />
      <div className="finder">
        <div className="finder-input">
          <SearchIcon size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shops, ticket, alerts…"
          />
        </div>
        <div className="finder-list" role="listbox">
          {items.length === 0 && <p className="muted" style={{ padding: 14, fontSize: 13 }}>Nothing matches.</p>}
          {items.map((item, i) => (
            <button
              key={item.href + item.title}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`finder-item ${i === active ? 'on' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                router.push(item.href);
                onClose();
              }}
            >
              <span className="finder-group">{item.group}</span>
              <span>
                <strong>{item.title}</strong>
                <em>{item.sub}</em>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
