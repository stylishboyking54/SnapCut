'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { INITIAL_SHOPS } from '@/lib/mockData';
import { Shop } from '@/lib/types';

export default function BarberShopSettingsPage() {
  const [shop, setShop] = useState<Shop>(INITIAL_SHOPS[0]);
  const [name, setName] = useState(shop.name);
  const [tagline, setTagline] = useState(shop.tagline);
  const [address, setAddress] = useState(shop.address);
  const [phone, setPhone] = useState(shop.phone);
  const [avgDuration, setAvgDuration] = useState(shop.avgDurationPerClient);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setShop((prev) => ({
      ...prev,
      name,
      tagline,
      address,
      phone,
      avgDurationPerClient: Number(avgDuration),
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page-enter" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="eyebrow">How customers find you</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>Shop</h1>
        </div>
        <Link href="/barber/dashboard" className="btn-secondary" style={{ fontSize: 12.5 }}>
          ← Queue
        </Link>
      </div>

      {saved && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-success-soft)',
            color: 'var(--brand-success)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          Shop details saved.
        </div>
      )}

      <form onSubmit={handleSave} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label>Shop name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="field">
          <label>Tagline</label>
          <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>

        <div className="field">
          <label>Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="field">
          <label>Phone</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="field">
          <label>Average cut length (minutes)</label>
          <input
            type="number"
            min={10}
            max={90}
            value={avgDuration}
            onChange={(e) => setAvgDuration(Number(e.target.value))}
          />
          <span className="muted" style={{ fontSize: 12 }}>Used to estimate wait times.</span>
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: 4 }}>
          Save shop
        </button>
      </form>
    </div>
  );
}
