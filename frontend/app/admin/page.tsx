'use client';

import React from 'react';
import Link from 'next/link';
import { INITIAL_SHOPS } from '@/lib/mockData';

export default function AdminDashboardPage() {
  const totalInQueue = INITIAL_SHOPS.reduce((sum, s) => sum + s.currentQueueCount, 0);
  const emergencyCount = INITIAL_SHOPS.filter((s) => s.isEmergency).length;
  const avgWait = Math.round(
    INITIAL_SHOPS.reduce((sum, s) => sum + s.estimatedWaitMinutes, 0) / INITIAL_SHOPS.length
  );

  return (
    <div className="page-enter" style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div className="eyebrow">Platform</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>Overview</h1>
        <p className="secondary" style={{ fontSize: 14, marginTop: 6 }}>
          Shops, live queues, and anything that needs attention.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <div>
          <div className="eyebrow">Shops</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600 }}>{INITIAL_SHOPS.length}</div>
        </div>
        <div>
          <div className="eyebrow">In queue</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600 }}>{totalInQueue}</div>
        </div>
        <div>
          <div className="eyebrow">Emergencies</div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 600,
              color: emergencyCount ? 'var(--brand-danger)' : 'var(--text-primary)',
            }}
          >
            {emergencyCount}
          </div>
        </div>
        <div>
          <div className="eyebrow">Avg wait</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600 }}>~{avgWait}m</div>
        </div>
      </div>

      <section className="panel">
        <h2 className="panel-title">Shops</h2>
        <p className="panel-sub">Live status across the directory.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {INITIAL_SHOPS.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0',
                borderBottom: '1px solid var(--bg-border-subtle)',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 650, fontSize: 15 }}>{s.name}</span>
                  <span className={`status-mark ${s.isEmergency ? 'emergency' : 'open'}`} style={{ fontSize: 12 }}>
                    <span className="status-dot" />
                    {s.isEmergency ? 'Delayed' : 'Open'}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                  {s.ownerName} · {s.address}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 650, fontSize: 13.5 }}>{s.currentQueueCount} in line</div>
                  <div className="muted" style={{ fontSize: 12 }}>~{s.estimatedWaitMinutes}m</div>
                </div>
                <Link href={`/shops/${s.id}`} className="btn-secondary" style={{ fontSize: 12.5, minHeight: 34, padding: '6px 12px' }}>
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
