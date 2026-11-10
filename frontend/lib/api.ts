import { Shop, QueueItem } from './types';
import { authHeaders, getApiBaseUrl, getSession } from './auth';

const API_BASE_URL = () => getApiBaseUrl();

function mapQueueItem(q: any, shopId?: string): QueueItem {
  const scheduled = q.scheduled_at
    ? new Date(q.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : q.scheduled_time || '';
  return {
    id: q.id,
    shopId: q.shop_id || shopId || q.shops?.id || '',
    shopName: q.shop_name || q.shops?.name || 'Barbershop',
    customerName: q.customer_name || q.profiles?.full_name || 'You',
    customerAvatar: q.customer_avatar || q.profiles?.avatar_url || '',
    serviceName: q.service_name || q.services?.name || 'Service',
    serviceDuration: q.service_duration || q.services?.duration || 30,
    price: Number(q.price ?? q.services?.price ?? 0),
    queuePosition: q.queue_position ?? 0,
    estimatedWaitMinutes: q.estimated_wait_minutes ?? 0,
    scheduledTime: scheduled,
    status: q.status === 'confirmed' || q.status === 'pending' ? 'waiting' : q.status || 'waiting',
    notes: q.notes,
  };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function clock(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const match = String(value).match(/(\d{2}:\d{2})/);
  return match ? match[1] : fallback;
}

function mapHours(rows: any[] | undefined) {
  const list = rows || [];
  if (!list.length) {
    return [1, 2, 3, 4, 5, 6, 0].map((day) => ({
      dayOfWeek: day,
      dayName: DAY_NAMES[day],
      startTime: '09:00',
      endTime: '18:00',
      isOpen: day !== 0,
    }));
  }
  const byDay = new Map<number, any>();
  for (const row of list) {
    const day = Number(row.dayOfWeek ?? row.day_of_week);
    if (!Number.isNaN(day)) byDay.set(day, row);
  }
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const row = byDay.get(day);
    return {
      dayOfWeek: day,
      dayName: row?.dayName || DAY_NAMES[day],
      startTime: clock(row?.startTime || row?.start_time, '09:00'),
      endTime: clock(row?.endTime || row?.end_time, '18:00'),
      isOpen: Boolean(row) && row.isOpen !== false && row.is_open !== false,
    };
  });
}

function mapBreaks(rows: any[] | undefined) {
  return (rows || []).map((b) => {
    const startRaw = b.start_datetime ? new Date(b.start_datetime) : null;
    const endRaw = b.end_datetime ? new Date(b.end_datetime) : null;
    const asClock = (date: Date | null) =>
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : '';
    return {
      id: b.id,
      startTime: b.startTime || asClock(startRaw),
      endTime: b.endTime || asClock(endRaw),
      reason: b.reason || 'Break',
      isRecurring: Boolean(b.isRecurring ?? b.is_recurring),
    };
  });
}

function mapShop(s: any): Shop {
  return {
    id: s.id,
    name: s.name,
    tagline: s.tagline || '',
    ownerName: s.owner_name || s.ownerName || 'Master Barber',
    address: s.address,
    city: s.city,
    shopType: (s.shop_type || s.shopType || 'barber') === 'salon' ? 'salon' : 'barber',
    distanceKm: s.distance_km ?? s.distanceKm ?? 1.2,
    lat: s.lat,
    lng: s.lng,
    phone: s.phone,
    rating: s.rating,
    reviewCount: s.review_count ?? s.reviewCount ?? 50,
    isOpen: s.is_open ?? s.isOpen ?? true,
    isEmergency: s.is_emergency ?? s.isEmergency ?? false,
    emergencyReason: s.emergency_reason ?? s.emergencyReason,
    avgDurationPerClient: s.avg_service_duration ?? s.avgDurationPerClient ?? 25,
    currentQueueCount: s.current_queue_count ?? s.currentQueueCount ?? 0,
    estimatedWaitMinutes: s.estimated_wait_minutes ?? s.estimatedWaitMinutes ?? 0,
    coverImage: s.cover_image_url ?? s.cover_image ?? s.coverImage,
    services: (s.services || []).map((srv: any) => ({
      id: srv.id,
      name: srv.name,
      duration: srv.duration,
      price: Number(srv.price),
      description: srv.description,
    })),
    workingHours: mapHours(s.working_hours || s.workingHours),
    breaks: mapBreaks(s.breaks),
  };
}

/**
 * Fetch all shops with live turn counts & estimated wait times
 */
export async function getShops(filters?: {
  city?: string;
  search?: string;
  shopType?: 'barber' | 'salon' | 'all';
}): Promise<Shop[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.city) params.append('city', filters.city);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.shopType && filters.shopType !== 'all') {
      params.append('shop_type', filters.shopType);
    }

    const res = await fetch(`${API_BASE_URL()}/shops?${params.toString()}`, {
      next: { revalidate: 10 },
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data || []).map(mapShop);
  } catch (error) {
    console.warn('[Snapcut API] Shops fetch failed:', error);
    return [];
  }
}

/**
 * Fetch detailed shop profile by ID
 */
export async function getShopById(id: string): Promise<Shop | null> {
  try {
    const res = await fetch(`${API_BASE_URL()}/shops/${id}`, {
      next: { revalidate: 5 },
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return mapShop(await res.json());
  } catch (error) {
    console.warn(`[Snapcut API] Shop ${id} fetch failed:`, error);
    return null;
  }
}

/**
 * Fetch live queue for a shop
 */
export async function getShopLiveQueue(shopId: string): Promise<{
  queue: QueueItem[];
  totalInQueue: number;
  estimatedTotalWait: number;
  isEmergency: boolean;
  isOpen: boolean;
}> {
  try {
    const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/queue`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const queue: QueueItem[] = (data.queue || []).map((q: any) => ({
      id: q.id,
      shopId: q.shop_id || shopId,
      shopName: q.shop_name || 'Barbershop',
      customerName: q.customer_name,
      customerAvatar: q.customer_avatar || '👤',
      serviceName: q.service_name,
      serviceDuration: q.service_duration || 30,
      price: q.price || 35,
      queuePosition: q.queue_position,
      estimatedWaitMinutes: q.estimated_wait_minutes,
      scheduledTime: q.scheduled_time || '15:30',
      status: q.status || 'waiting',
      notes: q.notes,
    }));

    return {
      queue,
      totalInQueue: data.total_in_queue ?? queue.length,
      estimatedTotalWait: data.estimated_total_wait ?? 20,
      isEmergency: Boolean(data.is_emergency),
      isOpen: data.is_open ?? true,
    };
  } catch (error) {
    console.warn(`[Snapcut API] Live queue ${shopId} failed:`, error);
    return {
      queue: [],
      totalInQueue: 0,
      estimatedTotalWait: 0,
      isEmergency: false,
      isOpen: true,
    };
  }
}

/**
 * Join a shop queue (local API when Supabase is not live)
 */
export async function joinShopQueue(
  shopId: string,
  payload: { serviceId?: string; customerName?: string; notes?: string } = {},
): Promise<{
  booking: QueueItem;
  queue: QueueItem[];
  totalInQueue: number;
  estimatedTotalWait: number;
}> {
  const session = getSession();
  if (!session?.access_token) {
    throw new Error('Sign in to join the line');
  }
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/join`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      service_id: payload.serviceId,
      customer_name: payload.customerName || session.profile.full_name,
      notes: payload.notes,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Join failed (${res.status})`);
  }

  const data = await res.json();
  return {
    booking: mapQueueItem(data.booking, shopId),
    queue: (data.queue || []).map((q: any) => mapQueueItem(q, shopId)),
    totalInQueue: data.total_in_queue ?? 0,
    estimatedTotalWait: data.estimated_total_wait ?? 0,
  };
}

export async function getBookingRows(): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL()}/bookings`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getShopBookingRows(shopId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL()}/bookings/shop/${shopId}`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getMyBookings(): Promise<QueueItem[]> {
  const res = await fetch(`${API_BASE_URL()}/bookings`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Bookings failed (${res.status})`);
  }
  const data = await res.json();
  return (data || [])
    .filter((b: any) => ['pending', 'confirmed', 'in_progress'].includes(b.status))
    .map((b: any) => mapQueueItem(b));
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL()}/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status: 'cancelled' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Cancel failed (${res.status})`);
  }
}

/** Barber/Salon: finish current client and call the next */
export async function advanceShopQueue(shopId: string): Promise<{
  advanced: boolean;
  remaining?: number;
  message?: string;
}> {
  const res = await fetch(`${API_BASE_URL()}/bookings/shop/${shopId}/advance`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Could not advance queue');
  return data;
}

export type OwnShopPayload = {
  name: string;
  tagline?: string;
  address: string;
  city: string;
  phone?: string;
  avg_service_duration?: number;
  shop_type?: 'barber' | 'salon';
};

/** Current pro's shop, or null if not set up yet */
export async function getMyShop(): Promise<Shop | null> {
  const res = await fetch(`${API_BASE_URL()}/shops/mine`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Could not load shop (${res.status})`);
  }
  const data = await res.json();
  if (!data) return null;
  return mapShop(data);
}

export async function createShop(payload: OwnShopPayload): Promise<Shop> {
  const res = await fetch(`${API_BASE_URL()}/shops`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Could not create shop');
  return mapShop(data);
}

export async function updateShop(shopId: string, payload: Partial<OwnShopPayload>): Promise<Shop> {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Could not update shop');
  return mapShop(data);
}

function localStamp(time: string) {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date.toISOString();
}

/** Save which days the shop is open. Closed days are left out. */
export async function saveShopHours(shopId: string, hours: import('./types').WorkingHour[]) {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/hours`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      hours: hours
        .filter((hour) => hour.isOpen)
        .map((hour) => ({
          day_of_week: hour.dayOfWeek,
          start_time: hour.startTime,
          end_time: hour.endTime,
        })),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Could not save hours');
  return data;
}

export async function addShopBreak(
  shopId: string,
  block: { startTime: string; endTime: string; reason: string; isRecurring: boolean },
) {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/breaks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      start_datetime: localStamp(block.startTime),
      end_datetime: localStamp(block.endTime),
      reason: block.reason,
      is_recurring: block.isRecurring,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Could not save break');
  return mapBreaks([data])[0];
}

export async function removeShopBreak(shopId: string, breakId: string) {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/breaks/${breakId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Could not remove break');
}

export async function getAdminShops(): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL()}/admin/shops`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not load shops');
  return Array.isArray(data) ? data : [];
}

export async function getAdminUsers(): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL()}/admin/users`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not load people');
  return Array.isArray(data) ? data : [];
}

export async function verifyAdminShop(shopId: string) {
  const res = await fetch(`${API_BASE_URL()}/admin/shops/${shopId}/verify`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not verify shop');
  return data;
}

export async function toggleShopEmergency(
  shopId: string,
  isEmergency: boolean,
  reason?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/emergency`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ is_emergency: isEmergency, reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Could not update emergency');
}

export async function getMyNotifications(): Promise<
  import('./types').AppNotification[]
> {
  const res = await fetch(`${API_BASE_URL()}/notifications`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Notifications failed (${res.status})`);
  }
  const data = await res.json();
  return (data || []).map((n: any) => ({
    id: n.id,
    title:
      n.type === 'emergency'
        ? 'Emergency'
        : n.type === 'reschedule'
        ? 'Reschedule'
        : 'Queue update',
    message: n.message || '',
    type: (n.type === 'emergency' ? 'emergency' : n.type === 'reschedule' ? 'shifted' : 'queue_update') as
      | 'queue_update'
      | 'emergency'
      | 'shifted'
      | 'reminder',
    timestamp: n.created_at
      ? new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '',
    isRead: Boolean(n.is_read),
    shopName: n.bookings?.shops?.name,
  }));
}

export async function markNotificationsRead(): Promise<void> {
  const res = await fetch(`${API_BASE_URL()}/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Could not mark read');
  }
}
