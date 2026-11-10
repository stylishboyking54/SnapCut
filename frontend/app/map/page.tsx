'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { getShops } from '@/lib/api';
import { Shop } from '@/lib/types';
import { CompassIcon } from '@/components/ui/Icons';
import { todayLabel } from '@/lib/greeting';

// Dynamically import InteractiveShopsMap to ensure Leaflet runs only on the client
const InteractiveShopsMap = dynamic(
  () => import('@/components/map/InteractiveShopsMap'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: 480,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        Loading interactive map…
      </div>
    ),
  }
);

export default function MapPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShops()
      .then((rows) => {
        setShops(rows);
        setSelectedShop((current) => current ?? rows[0] ?? null);
      })
      .catch(() => setShops([]))
      .finally(() => setLoading(false));
  }, []);

  const handleFindOptimal = () => {
    const sorted = [...shops].sort((a, b) => {
      const scoreA = a.estimatedWaitMinutes * 1.5 + a.distanceKm * 10;
      const scoreB = b.estimatedWaitMinutes * 1.5 + b.distanceKm * 10;
      return scoreA - scoreB;
    });
    const best = sorted[0];
    if (!best) return;
    setSelectedShop(best);
    setRecommendedId(best.id);
  };

  return (
    <div
      className="page-enter"
      style={{
        maxWidth: 1040,
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      <div className="page-header-row">
        <div>
          <div className="date-pill">
            <span className="status-dot live" />
            {todayLabel()}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>
            Nearby Shops
          </h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14 }}>
            Explore stores on the live map. Check live waiting times and navigate directly with Google Maps.
          </p>
        </div>

        <button
          type="button"
          onClick={handleFindOptimal}
          className="btn-primary"
          style={{ fontSize: 13 }}
        >
          <CompassIcon size={15} />
          Shortest wait
        </button>
      </div>

      {recommendedId && selectedShop && (
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
          ⭐ Recommended: {selectedShop.name} — ~{selectedShop.estimatedWaitMinutes}m wait, {selectedShop.distanceKm} km away.
        </div>
      )}

      {loading ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading live map…
        </div>
      ) : shops.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 36 }}>
          <div style={{ fontWeight: 650, fontSize: 16 }}>No shops on the map yet</div>
          <p className="muted" style={{ marginTop: 8, fontSize: 13.5 }}>
            They show up here automatically when a barber or salon pins their location and opens their line.
          </p>
        </div>
      ) : (
        <InteractiveShopsMap
          shops={shops}
          selectedShop={selectedShop}
          onSelectShop={(shop) => {
            setSelectedShop(shop);
            setRecommendedId(null);
          }}
        />
      )}
    </div>
  );
}
