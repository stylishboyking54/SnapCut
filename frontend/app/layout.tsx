import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Snapcut — Find a cut without the wait',
  description:
    'See live barber queues nearby, join when a chair opens, and skip the walk-in wait.',
  icons: {
    icon: '/logo.png',
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
              Loading Snapcut…
            </div>
          }
        >
          <AppLayout>{children}</AppLayout>
        </Suspense>
      </body>
    </html>
  );
}
