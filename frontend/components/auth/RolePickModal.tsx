'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScissorsIcon, UserIcon } from '@/components/ui/Icons';
import { AppRole } from '@/components/layout/RoleWelcome';

interface RolePickModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (role: AppRole) => void;
}

export default function RolePickModal({ open, onClose, onPick }: RolePickModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="auth-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-modal-handle" aria-hidden="true" />
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="role-modal-title" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginTop: 2 }}>
          Who are you?
        </h2>
        <p className="secondary" style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.4 }}>
          Pick one, then sign in.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <button type="button" className="role-choice" onClick={() => onPick('customer')} style={{ textAlign: 'left' }}>
            <span className="role-choice-icon">
              <UserIcon size={20} />
            </span>
            <span className="role-choice-copy">
              <strong>Customer</strong>
              <span>Find a shop and join the line</span>
            </span>
          </button>

          <button type="button" className="role-choice" onClick={() => onPick('barber')} style={{ textAlign: 'left' }}>
            <span className="role-choice-icon">
              <ScissorsIcon size={20} />
            </span>
            <span className="role-choice-copy">
              <strong>Barber</strong>
              <span>Men&apos;s shop — run your queue</span>
            </span>
          </button>

          <button type="button" className="role-choice" onClick={() => onPick('salon')} style={{ textAlign: 'left' }}>
            <span className="role-choice-icon">
              <ScissorsIcon size={20} />
            </span>
            <span className="role-choice-copy">
              <strong>Salon</strong>
              <span>Women&apos;s salon — run your queue</span>
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
