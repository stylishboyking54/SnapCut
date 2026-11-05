'use client';

import React from 'react';
import { ScissorsIcon, UserIcon } from '@/components/ui/Icons';

export type AppRole = 'customer' | 'barber';

interface RoleWelcomeProps {
  onSelect: (role: AppRole) => void;
}

export default function RoleWelcome({ onSelect }: RoleWelcomeProps) {
  return (
    <div className="role-welcome">
      <div className="role-welcome-card">
        <div className="eyebrow">Welcome</div>
        <h1 className="brand-hero" style={{ fontSize: 'clamp(34px, 8vw, 48px)', marginTop: 8 }}>
          Snapcut
        </h1>
        <p className="secondary" style={{ marginTop: 12, fontSize: 15, lineHeight: 1.45, maxWidth: 340 }}>
          Are you here for a cut, or running the chair?
        </p>

        <div className="role-welcome-choices">
          <button type="button" className="role-choice" onClick={() => onSelect('customer')}>
            <span className="role-choice-icon">
              <UserIcon size={22} />
            </span>
            <span className="role-choice-copy">
              <strong>I&apos;m a customer</strong>
              <span>Find shops, check waits, join the line</span>
            </span>
          </button>

          <button type="button" className="role-choice" onClick={() => onSelect('barber')}>
            <span className="role-choice-icon">
              <ScissorsIcon size={22} />
            </span>
            <span className="role-choice-copy">
              <strong>I&apos;m a barber</strong>
              <span>Run your queue, hours, and shop floor</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
