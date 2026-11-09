'use client';

import { createClient } from '@/lib/supabase/client';
import { getSession } from '@/lib/auth';

type Unsub = () => void;

/**
 * Listen for booking row changes. Uses Supabase Realtime when the browser
 * has a session; always safe to call (no-ops if setup fails).
 */
export function subscribeBookings(opts: {
  customerId?: string;
  shopId?: string;
  onChange: () => void;
}): Unsub {
  const session = getSession();
  if (!session?.access_token) return () => undefined;

  try {
    const supabase = createClient();
    const channelName = `bookings-${opts.customerId || opts.shopId || 'all'}-${Date.now()}`;
    let filter: string | undefined;
    if (opts.customerId) filter = `customer_id=eq.${opts.customerId}`;
    else if (opts.shopId) filter = `shop_id=eq.${opts.shopId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          ...(filter ? { filter } : {}),
        },
        () => opts.onChange(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  } catch {
    return () => undefined;
  }
}
