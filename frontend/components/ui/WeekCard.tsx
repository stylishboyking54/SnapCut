'use client';

import React from 'react';
import CountUp from '@/components/ui/CountUp';

export type WeekPoint = { label: string; value: number };

export default function WeekCard({
  title,
  subtitle,
  totalLabel,
  total,
  unit,
  asideLabel,
  aside,
  days,
}: {
  title: string;
  subtitle: string;
  totalLabel: string;
  total: number;
  unit: string;
  asideLabel: string;
  aside: string;
  days: WeekPoint[];
}) {
  const peak = Math.max(1, ...days.map((d) => d.value));

  return (
    <section className="panel week-card">
      <div className="week-card-copy">
        <h2 className="panel-title">{title}</h2>
        <p className="panel-sub" style={{ marginBottom: 0 }}>{subtitle}</p>
        <div className="week-card-stats">
          <div>
            <div className="eyebrow">{totalLabel}</div>
            <div className="week-card-total">
              <CountUp value={total} />
              <span>{unit}</span>
            </div>
          </div>
          <div>
            <div className="eyebrow">{asideLabel}</div>
            <div className="week-card-aside">{aside}</div>
          </div>
        </div>
      </div>
      <div className="week-bars" aria-hidden>
        {days.map((d) => (
          <div key={d.label} className="week-bar">
            <span style={{ height: `${Math.max(8, (d.value / peak) * 100)}%` }} />
            <em>{d.label}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
