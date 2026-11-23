import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  metadataBase: new URL('https://snapcut.vip'),
  title: {
    default: 'SnapCut — Live Barber & Salon Queueing Network',
    template: '%s | SnapCut',
  },
  description:
    'Skip the physical line. Find top local barbers and salons, track live wait times, and join lines in real-time from your phone.',
  keywords: [
    'barbershop queue',
    'salon queue',
    'barber wait times',
    'haircut booking',
    'Ghana barbers',
    'Accra barber',
    'live queue network',
    'SnapCut',
  ],
  authors: [{ name: 'SnapCut' }],
  creator: 'SnapCut',
  publisher: 'SnapCut',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'SnapCut — Live Barber & Salon Queueing Network',
    description:
      'Skip the walk-in wait. See live wait times, track your place in line, and get notified when your chair is ready.',
    url: 'https://snapcut.vip',
    siteName: 'SnapCut',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 800,
        alt: 'SnapCut Barber and Salon Network',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnapCut — Live Barber & Salon Queueing Network',
    description:
      'Skip the walk-in wait. See live wait times, track your place in line, and get notified when your chair is ready.',
    images: ['/logo.png'],
  },
  alternates: {
    canonical: 'https://snapcut.vip',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="paper">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense
          fallback={
            <div style={{ padding: 40, textAlign: 'center', color: '#6b6560' }}>
              Loading SnapCut…
            </div>
          }
        >
          <AppLayout>{children}</AppLayout>
        </Suspense>
      </body>
    </html>
  );
}
