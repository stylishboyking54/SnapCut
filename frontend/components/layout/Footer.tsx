'use client';

import React from 'react';
import Link from 'next/link';
import {
  ScissorsIcon,
  GithubIcon,
  TwitterIcon,
  InstagramIcon,
} from '@/components/ui/Icons';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        <div className={styles.topGrid}>
          {/* Brand Column */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brandHeader}>
              <div className={styles.brandLogo} aria-hidden="true">
                <ScissorsIcon size={18} color="#ffffff" />
              </div>
              <span className={styles.brandTitle}>SnapCut</span>
            </Link>

            <p className={styles.brandTagline}>
              Skip the walk-in wait. Join live barber &amp; salon queues nearby, track your estimated wait time in real-time, and get notified when your chair is ready.
            </p>

            <div className={styles.statusBadge}>
              <span className={styles.statusDot} />
              <span>Live Queue Network · Operational</span>
            </div>
          </div>

          {/* Navigation Column: Explore */}
          <div className={styles.col}>
            <span className={styles.colTitle}>Explore</span>
            <Link href="/" className={styles.link}>
              Find Shops
            </Link>
            <Link href="/map" className={styles.link}>
              Nearby Live Map
            </Link>
            <Link href="/bookings" className={styles.link}>
              My Queue Tickets
            </Link>
            <Link href="/notifications" className={styles.link}>
              Live Wait Alerts
            </Link>
          </div>

          {/* Navigation Column: For Professionals */}
          <div className={styles.col}>
            <span className={styles.colTitle}>For Professionals</span>
            <Link href="/barber/dashboard" className={styles.link}>
              Barber Dashboard
            </Link>
            <Link href="/barber/shop?setup=1" className={styles.link}>
              List Your Shop
            </Link>
            <Link href="/barber/schedule" className={styles.link}>
              Queue Hours
            </Link>
            <Link href="/terms#line-rules" className={styles.link}>
              Fair Line Rules
            </Link>
          </div>

          {/* Navigation Column: Legal & Support */}
          <div className={styles.col}>
            <span className={styles.colTitle}>Platform</span>
            <Link href="/terms" className={styles.link}>
              Terms &amp; Conditions
            </Link>
            <Link href="/terms#privacy" className={styles.link}>
              Privacy Policy
            </Link>
            <Link href="/terms#guarantee" className={styles.link}>
              Queue Guarantee
            </Link>
            <a
              href="mailto:support@snapcut.vip"
              className={styles.link}
            >
              Support Contact
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            © {currentYear} SnapCut. Crafted for modern barbershops &amp; salons.
          </div>

          <div className={styles.socialRow}>
            <a
              href="https://github.com/stylishboyking54/SnapCut"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label="SnapCut on GitHub"
            >
              <GithubIcon size={18} />
            </a>
            <a
              href="https://twitter.com/SnapCut"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label="SnapCut on X (Twitter)"
            >
              <TwitterIcon size={18} />
            </a>
            <a
              href="https://instagram.com/SnapCut"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label="SnapCut on Instagram"
            >
              <InstagramIcon size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
