'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div
      className="page-enter"
      style={{
        maxWidth: 840,
        width: '100%',
        margin: '0 auto',
        padding: '24px 16px 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <Link href="/" className="muted" style={{ fontSize: 13, fontWeight: 600, width: 'fit-content' }}>
        ← Back to home
      </Link>

      <div className="panel" style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--bg-border)', paddingBottom: 16 }}>
          <img
            src="/logo.png"
            alt="SnapCut"
            width={48}
            height={48}
            style={{ borderRadius: 12, objectFit: 'cover' }}
          />
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 750, margin: 0 }}>
              Terms & Conditions
            </h1>
            <p className="muted" style={{ fontSize: 13, margin: '4px 0 0 0' }}>
              SnapCut Platform Agreement & Privacy Overview · Last Updated November 2026
            </p>
          </div>
        </div>

        <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ margin: 0 }}>
            Welcome to <strong>SnapCut</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;the platform&quot;).
            SnapCut is an interactive neighborhood barbershop and salon queueing network designed to eliminate
            physical waiting rooms and allow customers to secure line spots remotely with live wait time tracking.
          </p>

          <section>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              1. Agreement to Terms
            </h2>
            <p style={{ margin: 0 }}>
              By accessing our website, creating an account, or joining any barber or salon waitlist,
              you acknowledge that you have read, understood, and agreed to be bound by these Terms & Conditions.
              If you do not agree, you may not use the service.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              2. User Accounts & Responsibilities
            </h2>
            <p style={{ margin: 0 }}>
              Users must provide true, accurate, and current information when creating an account or providing
              a name for a booking. You agree to protect your login credentials and immediately inform us of any
              unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              3. Queueing Rules & Attendance
            </h2>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                <strong>Fair Queue Access:</strong> Customers are limited to one active line spot at a time to prevent
                blocking line positions for others.
              </li>
              <li>
                <strong>Punctual Arrival:</strong> When your turn is approaching, you are expected to head to the shop.
                Marking &quot;I&apos;m here&quot; alerts the barber that you are physically present.
              </li>
              <li>
                <strong>Grace Period & Cancellations:</strong> If you are unable to make your slot, please cancel or
                tap &quot;Need 10 more mins&quot; so the shop and people behind you can adjust.
              </li>
              <li>
                <strong>No-Shows:</strong> Repeated failure to attend bookings may result in temporary restrictions
                on holding spots.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              4. Service Pricing & Payment
            </h2>
            <p style={{ margin: 0 }}>
              All prices (in GHS) for haircuts, fades, beard trims, and salon treatments are determined independently
              by each registered shop. SnapCut displays these prices for customer transparency. Payments are made
              directly to the service provider at the shop unless specified otherwise.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              5. Barber & Salon Standards
            </h2>
            <p style={{ margin: 0 }}>
              Barbers and salon operators using SnapCut agree to honor customer reservations in sequence, keep accurate
              working hours, maintain clean and sanitized tools, and notify customers promptly in the event of an
              emergency pause or equipment delay.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              6. Privacy & Data Handling
            </h2>
            <p style={{ margin: 0 }}>
              We collect user details (such as names, emails, and phone numbers) exclusively to manage your bookings,
              display ticket numbers, and send queue update notifications. We never sell or share your personal data
              with third-party advertisers.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              7. Contact & Support
            </h2>
            <p style={{ margin: 0 }}>
              If you have any questions or feedback regarding these Terms, please reach out to our team via the
              app profile page or your shop administrator.
            </p>
          </section>
        </div>

        <div style={{ marginTop: 12, paddingTop: 16, borderTop: '1px solid var(--bg-border)' }}>
          <Link href="/" className="btn-primary" style={{ display: 'inline-flex' }}>
            Back to SnapCut Home
          </Link>
        </div>
      </div>
    </div>
  );
}

