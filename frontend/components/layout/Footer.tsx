'use client';

import React from 'react';
import Link from 'next/link';
import {
  ScissorsIcon,
  WhatsAppIcon,
  InstagramColorIcon,
  TikTokColorIcon,
  YouTubeColorIcon,
  FacebookColorIcon,
  XColorIcon,
} from '@/components/ui/Icons';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        {/* Pre-footer Call to Action Card */}
        <div className={styles.ctaCard}>
          <div className={styles.ctaText}>
            <h3>Ready for your next fresh cut?</h3>
            <p>
              Check live queue wait times at local barbershops and salons. Join the line before you leave home.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/map" className="btn-primary" style={{ textDecoration: 'none', fontSize: 13 }}>
              Explore Live Map
            </Link>
            <Link
              href="/barber/shop?setup=1"
              className="btn-secondary"
              style={{ textDecoration: 'none', fontSize: 13 }}
            >
              List Your Shop
            </Link>
          </div>
        </div>

        {/* Main Columns Grid */}
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
              Ghana&apos;s premier real-time barbershop and salon queueing network. Eliminating walk-in waiting rooms with live turn tracking and instant alerts.
            </p>

            <div className={styles.statusBadge}>
              <span className={styles.statusDot} />
              <span>Live Queue Network · Operational</span>
            </div>
          </div>

          {/* Navigation Column: Explore */}
          <div className={styles.col}>
            <span className={styles.colTitle}>Discover</span>
            <Link href="/" className={styles.link}>
              Find Barbers &amp; Salons
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
              Register Your Shop
            </Link>
            <Link href="/barber/schedule" className={styles.link}>
              Daily Operating Hours
            </Link>
            <Link href="/terms#line-rules" className={styles.link}>
              Fair Line Rules
            </Link>
          </div>

          {/* Navigation Column: Legal & Support */}
          <div className={styles.col}>
            <span className={styles.colTitle}>Company &amp; Help</span>
            <Link href="/terms" className={styles.link}>
              Terms of Service
            </Link>
            <Link href="/terms#privacy" className={styles.link}>
              Privacy Policy
            </Link>
            <a
              href="mailto:support@snapcut.vip"
              className={styles.link}
            >
              Email Support
            </a>
            <a
              href="https://wa.me/233504386573"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              style={{ color: '#25D366', fontWeight: 600 }}
            >
              Direct WhatsApp Support
            </a>
          </div>
        </div>

        {/* Popular Social Media Showcase with Brand Colored Logos */}
        <div className={styles.socialSection}>
          <div className={styles.socialLabel}>
            <span className={styles.socialLabelTitle}>Connect with SnapCut</span>
            <span className={styles.socialLabelSub}>Join our community and stay updated with fresh cuts &amp; news</span>
          </div>

          <div className={styles.socialRow}>
            {/* WhatsApp */}
            <a
              href="https://wa.me/233504386573"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.socialBtn} ${styles.btnWhatsapp}`}
              aria-label="SnapCut on WhatsApp"
              title="Chat with SnapCut on WhatsApp"
            >
              <WhatsAppIcon size={22} />
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/snapcut.vip"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.socialBtn} ${styles.btnInstagram}`}
              aria-label="SnapCut on Instagram"
              title="Follow SnapCut on Instagram"
            >
              <InstagramColorIcon size={22} />
            </a>

            {/* TikTok */}
            <a
              href="https://tiktok.com/@snapcut.vip"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.socialBtn} ${styles.btnTiktok}`}
              aria-label="SnapCut on TikTok"
              title="Follow SnapCut on TikTok"
            >
              <TikTokColorIcon size={22} />
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com/@snapcut"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.socialBtn} ${styles.btnYoutube}`}
              aria-label="SnapCut on YouTube"
              title="Subscribe to SnapCut on YouTube"
            >
              <YouTubeColorIcon size={22} />
            </a>

            {/* Facebook */}
            <a
              href="https://facebook.com/snapcut.vip"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.socialBtn} ${styles.btnFacebook}`}
              aria-label="SnapCut on Facebook"
              title="Follow SnapCut on Facebook"
            >
              <FacebookColorIcon size={22} />
            </a>

            {/* X (formerly Twitter) */}
            <a
              href="https://x.com/snapcut"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.socialBtn} ${styles.btnX}`}
              aria-label="SnapCut on X"
              title="Follow SnapCut on X"
            >
              <XColorIcon size={22} />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            © {currentYear} SnapCut Inc. Crafted with pride for barbershops &amp; salons 💈
          </div>

          <div className={styles.legalLinks}>
            <Link href="/terms" className={styles.legalLink}>
              Terms
            </Link>
            <span style={{ color: 'var(--bg-border)', fontSize: 12 }}>•</span>
            <Link href="/terms#privacy" className={styles.legalLink}>
              Privacy
            </Link>
            <span style={{ color: 'var(--bg-border)', fontSize: 12 }}>•</span>
            <Link href="/terms#guarantee" className={styles.legalLink}>
              Fair Queue Guarantee
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
