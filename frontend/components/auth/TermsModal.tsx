'use client';

import React from 'react';
import { createPortal } from 'react-dom';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export default function TermsModal({ open, onClose, onAccept }: TermsModalProps) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: 580,
          maxHeight: '88vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 22px',
          boxShadow: '0 28px 56px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            paddingBottom: 14,
            borderBottom: '1px solid var(--bg-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/logo.png"
              alt="SnapCut"
              width={34}
              height={34}
              style={{ borderRadius: 8, objectFit: 'cover' }}
            />
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>
                Terms & Conditions
              </h2>
              <p className="muted" style={{ fontSize: 12, margin: '2px 0 0 0' }}>
                SnapCut Platform & Service Agreement · Updated November 2026
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-elevated)',
              border: 'none',
              color: 'var(--text-muted)',
              width: 30,
              height: 30,
              borderRadius: '50%',
              fontSize: 14,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div
          style={{
            overflowY: 'auto',
            paddingRight: 6,
            marginTop: 14,
            marginBottom: 16,
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <p style={{ margin: 0 }}>
            Welcome to <strong>SnapCut</strong>. By accessing our web application, signing up for an
            account, or joining any live barbershop or salon queue, you agree to be bound by the
            following Terms & Conditions and Privacy Policy. Please read them carefully.
          </p>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 13.5 }}>
              1. Platform Purpose & Scope
            </strong>
            <p style={{ margin: 0 }}>
              SnapCut is a neighborhood queue management and discovery platform that connects customers
              with barbershops and hair salons. SnapCut provides digital waitlists, seat time estimates,
              and schedule coordination. We do not provide haircutting or styling services directly;
              services are provided by independent barbers and salon owners.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 13.5 }}>
              2. Account Registration & Authenticity
            </strong>
            <p style={{ margin: 0 }}>
              To join queues and receive live turn updates, you must register using an authentic email,
              Google authentication, or name. You are responsible for maintaining the confidentiality
              of your credentials. Impersonating another person or registering fraudulent accounts to
              hold line spots is strictly prohibited.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 13.5 }}>
              3. Queueing, Punctuality & Attendance
            </strong>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                <strong>One Active Line:</strong> To ensure fair queue access for everyone in the neighborhood,
                customers may only hold one active line spot at a time.
              </li>
              <li>
                <strong>Punctual Arrival:</strong> When your turn approaches, you agree to make your way
                to the shop. Tapping &quot;I&apos;m here&quot; confirms your physical arrival.
              </li>
              <li>
                <strong>Cancellations:</strong> If you can no longer attend, please tap &quot;Leave line&quot;
                promptly so customers behind you can move up.
              </li>
              <li>
                <strong>No-Shows:</strong> Repeated failure to show up for confirmed appointments may
                result in temporary restrictions on booking future slots.
              </li>
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 13.5 }}>
              4. Prices, Services & Payments
            </strong>
            <p style={{ margin: 0 }}>
              Service pricing (displayed in GHS or local currency) and durations are set independently by
              each shop owner. Any payment for services rendered is handled directly with the barber or salon,
              unless an in-app payment method is explicitly selected.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 13.5 }}>
              5. Barber & Salon Responsibilities
            </strong>
            <p style={{ margin: 0 }}>
              Shop owners agree to operate within their listed working hours, honor queue positions in
              good faith, maintain sanitary and safe shop conditions, and notify customers promptly of
              any emergency closures or pause delays.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 13.5 }}>
              6. Privacy & Data Handling
            </strong>
            <p style={{ margin: 0 }}>
              We collect your name, email, booking notes, and location (only when you enable nearby shop
              discovery) to facilitate queue notifications and appointments. We do not sell or rent
              your personal information to third parties.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 13.5 }}>
              7. Updates to Terms
            </strong>
            <p style={{ margin: 0 }}>
              SnapCut reserves the right to amend these Terms from time to time. Continued use of the platform
              constitutes acceptance of the updated terms.
            </p>
          </section>
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            paddingTop: 12,
            borderTop: '1px solid var(--bg-border)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ flex: 1, minHeight: 40, justifyContent: 'center', fontSize: 13 }}
          >
            Close
          </button>

          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="btn-primary"
              style={{
                flex: 2,
                minHeight: 40,
                justifyContent: 'center',
                fontSize: 13.5,
                fontWeight: 700,
                background: 'var(--brand-accent)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ✓ I Agree to Terms
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

