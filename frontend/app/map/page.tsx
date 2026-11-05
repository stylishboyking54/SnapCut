'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { INITIAL_SHOPS } from '@/lib/mockData';
import { Shop } from '@/lib/types';
import { CompassIcon } from '@/components/ui/Icons';

export default function MapPage() {
  const [shops] = useState<Shop[]>(INITIAL_SHOPS);
  const [selectedShop, setSelectedShop] = useState<Shop>(INITIAL_SHOPS[0]);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);

  const handleFindOptimal = () => {
    const sorted = [...shops].sort((a, b) => {
      const scoreA = a.estimatedWaitMinutes * 1.5 + a.distanceKm * 10;
      const scoreB = b.estimatedWaitMinutes * 1.5 + b.distanceKm * 10;
      return scoreA - scoreB;
    });
    const best = sorted[0];
    setSelectedShop(best);
    setRecommendedId(best.id);
  };

  return (
    <div className="page-enter" style={{ maxWidth: 1040, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="eyebrow">Around you</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>Map</h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14 }}>
            Tap a shop to see wait times before you walk.
          </p>
        </div>

        <button type="button" onClick={handleFindOptimal} className="btn-primary" style={{ fontSize: 13 }}>
          <CompassIcon size={15} />
          Best nearby
        </button>
      </div>

      {recommendedId && (
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
          {selectedShop.name} — ~{selectedShop.estimatedWaitMinutes}m wait, {selectedShop.distanceKm} km away.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        <div
          style={{
            minHeight: 420,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-lg)',
            position: 'relative',
            overflow: 'hidden',
            padding: 20,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(var(--bg-border) 1px, transparent 1px), linear-gradient(90deg, var(--bg-border) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              opacity: 0.45,
            }}
          />

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: 'var(--brand-primary)',
                border: '2px solid var(--bg-surface)',
              }}
            />
            <span className="eyebrow" style={{ marginTop: 6 }}>You</span>
          </div>

          <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 460, height: 260, margin: '0 auto' }}>
            {shops.map((s, idx) => {
              const isSelected = selectedShop.id === s.id;
              const positions = [
                { top: '12%', left: '8%' },
                { top: '18%', right: '6%' },
                { bottom: '18%', left: '18%' },
                { bottom: '12%', right: '14%' },
              ];
              const pos = positions[idx % positions.length];
              const statusClass = s.isEmergency ? 'emergency' : s.estimatedWaitMinutes === 0 ? 'open' : 'wait';

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedShop(s)}
                  style={{
                    position: 'absolute',
                    ...pos,
                    background: 'var(--bg-surface)',
                    border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--bg-border)',
                    padding: '8px 11px',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'left',
                    transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                    transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
                    maxWidth: 180,
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-primary)' }}>{s.name}</div>
                  <div className={`status-mark ${statusClass}`} style={{ marginTop: 4, fontSize: 11 }}>
                    <span className="status-dot" />
                    {s.isEmergency
                      ? 'Delayed'
                      : s.estimatedWaitMinutes === 0
                      ? 'Ready now'
                      : `~${s.estimatedWaitMinutes}m`}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className="muted"
            style={{
              position: 'absolute',
              bottom: 14,
              left: 16,
              right: 16,
              display: 'flex',
              gap: 14,
              fontSize: 11,
              zIndex: 3,
              flexWrap: 'wrap',
            }}
          >
            <span className="status-mark open"><span className="status-dot" /> Ready</span>
            <span className="status-mark wait"><span className="status-dot" /> Waiting</span>
            <span className="status-mark emergency"><span className="status-dot" /> Delayed</span>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div
              className={`status-mark ${
                selectedShop.isEmergency
                  ? 'emergency'
                  : selectedShop.estimatedWaitMinutes === 0
                  ? 'open'
                  : 'wait'
              }`}
            >
              <span className="status-dot" />
              {selectedShop.isEmergency ? 'Shift delayed' : 'Open'}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginTop: 8 }}>{selectedShop.name}</h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {selectedShop.address} · {selectedShop.distanceKm} km
            </p>
          </div>

          <div style={{ display: 'flex', gap: 28 }}>
            <div>
              <div className="eyebrow">In line</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600 }}>
                {selectedShop.currentQueueCount}
              </div>
            </div>
            <div>
              <div className="eyebrow">Wait</div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 26,
                  fontWeight: 600,
                  color: selectedShop.estimatedWaitMinutes === 0 ? 'var(--brand-success)' : 'var(--text-primary)',
                }}
              >
                ~{selectedShop.estimatedWaitMinutes}m
              </div>
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Cuts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedShop.services.map((srv) => (
                <div
                  key={srv.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--bg-border-subtle)',
                    fontSize: 13,
                  }}
                >
                  <span>{srv.name} · {srv.duration}m</span>
                  <strong>GHS {srv.price}</strong>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={`/shops/${selectedShop.id}`}
            className="btn-primary"
            style={{ width: '100%', marginTop: 'auto', boxSizing: 'border-box' }}
          >
            See queue & join
          </Link>
        </div>
      </div>
    </div>
  );
}
