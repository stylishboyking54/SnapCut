import { Shop, QueueItem } from './types';
import { authHeaders, getApiBaseUrl, getSession, ensureFreshToken, handleSessionExpired } from './auth';

const API_BASE_URL = () => getApiBaseUrl();

function mapQueueItem(q: any, shopId?: string): QueueItem {
  const isPast = q.status === 'completed' || q.status === 'cancelled';
  let scheduled = q.scheduled_time || '';
  if (q.scheduled_at) {
    const d = new Date(q.scheduled_at);
    if (!isNaN(d.getTime())) {
      const isToday = new Date().toDateString() === d.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      if (isPast) {
        scheduled = d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      } else if (isToday) {
        scheduled = timeStr;
      } else {
        scheduled = `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${timeStr}`;
      }
    }
  }
  return {
    id: q.id,
    shopId: q.shop_id || shopId || q.shops?.id || '',
    shopName: q.shop_name || q.shops?.name || 'Barbershop',
    shopAddress: q.shop_address || q.shops?.address || '',
    shopLat: q.shops?.lat ?? q.shop_lat ?? undefined,
    shopLng: q.shops?.lng ?? q.shop_lng ?? undefined,
    customerName: q.customer_name || q.profiles?.full_name || 'You',
    customerAvatar: q.customer_avatar || q.profiles?.avatar_url || '',
    customerPhone: q.profiles?.phone || q.customer_phone || undefined,
    serviceName: q.service_name || q.services?.name || 'Service',
    serviceDuration: q.service_duration || q.services?.duration || 30,
    price: Number(q.price ?? q.services?.price ?? 0),
    queuePosition: q.queue_position ?? 0,
    estimatedWaitMinutes: q.estimated_wait_minutes ?? 0,
    scheduledTime: scheduled,
    scheduledAt: q.scheduled_at || q.scheduledAt || undefined,
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

function readPhotos(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item);
  if (typeof value !== 'string' || !value.trim()) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string' && item);
    } catch {
      /* a normal photo link */
    }
  }
  return [trimmed];
}

function mapShop(s: any): Shop {
  const photos = readPhotos(s.cover_image_url ?? s.cover_image ?? s.coverImage ?? s.photos);
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
    resumeAt: s.resume_at ?? s.resumeAt ?? undefined,
    avgDurationPerClient: s.avg_service_duration ?? s.avgDurationPerClient ?? 25,
    chairCount: Math.max(1, Number(s.chair_count ?? s.chairCount ?? 1)),
    currentQueueCount: s.current_queue_count ?? s.currentQueueCount ?? 0,
    estimatedWaitMinutes: s.estimated_wait_minutes ?? s.estimatedWaitMinutes ?? 0,
    coverImage: photos[0] || '',
    photos,
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
    console.warn('[SnapCut API] Shops fetch failed:', error);
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
    console.warn(`[SnapCut API] Shop ${id} fetch failed:`, error);
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
      shopAddress: q.shop_address || '',
      shopLat: q.shop_lat,
      shopLng: q.shop_lng,
      customerName: q.customer_name,
      customerAvatar: q.customer_avatar || '👤',
      serviceName: q.service_name,
      serviceDuration: q.service_duration || 30,
      price: q.price || 35,
      queuePosition: q.queue_position,
      estimatedWaitMinutes: q.estimated_wait_minutes,
      scheduledTime: q.scheduled_time || '15:30',
      scheduledAt: q.scheduled_at || q.scheduledAt || undefined,
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
    console.warn(`[SnapCut API] Live queue ${shopId} failed:`, error);
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
  payload: {
    serviceId?: string;
    customerName?: string;
    notes?: string;
    scheduledAt?: string;
  } = {},
): Promise<{
  booking: QueueItem;
  queue: QueueItem[];
  totalInQueue: number;
  estimatedTotalWait: number;
}> {
  const token = await ensureFreshToken();
  const session = getSession();
  if (!token || !session) {
    handleSessionExpired('Sign in to join the line');
    throw new Error('Sign in to join the line');
  }

  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      service_id: payload.serviceId,
      customer_name: payload.customerName || session.profile.full_name,
      notes: payload.notes,
      scheduled_at: payload.scheduledAt,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.message || '';
    if (res.status === 401 || (res.status === 403 && message.toLowerCase().includes('sign in'))) {
      handleSessionExpired('Your session has expired. Please sign in again.');
      throw new Error('Your session has expired. Please sign in again.');
    }
    throw new Error(message || `Join failed (${res.status})`);
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

export async function tellShopIAmHere(bookingId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL()}/bookings/${bookingId}/here`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Could not tell the shop you are here');
  }
}

export async function askShopForMoreTime(bookingId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL()}/bookings/${bookingId}/grace`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Could not ask for more time');
  }
}

export function ticketSaysHere(notes?: string | null) {
  return Boolean(notes && notes.includes('[[here]]'));
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
export async function advanceShopQueue(shopId: string, bookingId?: string): Promise<{
  advanced: boolean;
  remaining?: number;
  message?: string;
}> {
  const token = await ensureFreshToken();
  const res = await fetch(`${API_BASE_URL()}/bookings/shop/${shopId}/advance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : authHeaders()),
    },
    body: JSON.stringify(bookingId ? { booking_id: bookingId } : {}),
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
  chair_count?: number;
  shop_type?: 'barber' | 'salon';
  lat?: number | null;
  lng?: number | null;
};

/** Current pro's shop, or null if not set up yet */
export async function getMyShop(): Promise<Shop | null> {
  const token = await ensureFreshToken();
  const res = await fetch(`${API_BASE_URL()}/shops/mine`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : authHeaders()),
    },
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

export async function addShopPhoto(shopId: string, image: string): Promise<Shop> {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/photos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ image }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not add that photo');
  return mapShop(data);
}

export async function removeShopPhoto(shopId: string, url: string): Promise<Shop> {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/photos`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ url }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not remove that photo');
  return mapShop(data);
}

export async function addShopService(
  shopId: string,
  payload: { name: string; price: number; duration: number },
): Promise<Shop> {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/services`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not add that service');
  return mapShop(data);
}

export async function updateShopService(
  shopId: string,
  serviceId: string,
  payload: { name: string; price: number; duration: number },
): Promise<Shop> {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/services/${serviceId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not save that service');
  return mapShop(data);
}

export async function removeShopService(shopId: string, serviceId: string): Promise<Shop> {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/services/${serviceId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not remove that service');
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

export async function deleteShop(shopId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Could not delete shop');
  }
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

export async function updateAdminUserRole(userId: string, role: string) {
  const res = await fetch(`${API_BASE_URL()}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not update user role');
  return data;
}

export async function toggleShopEmergency(
  shopId: string,
  isEmergency: boolean,
  reason?: string,
  resumeAt?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/emergency`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ is_emergency: isEmergency, reason, resume_at: resumeAt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Could not update emergency');
}

export async function getMyNotifications(): Promise<
  import('./types').AppNotification[]
> {
  const session = getSession();
  if (!session?.access_token) return [];

  const res = await fetch(`${API_BASE_URL()}/notifications`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) return [];
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

export async function getCompletedUnratedBooking(): Promise<QueueItem | null> {
  const session = getSession();
  if (!session?.access_token) return null;

  try {
    const res = await fetch(`${API_BASE_URL()}/bookings`, {
      cache: 'no-store',
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;

    const unrated = data.find((b: any) => {
      if (b.status !== 'completed') return false;
      const notes = b.notes || '';
      if (notes.includes('[[rated:')) return false;
      const dt = new Date(b.scheduled_at || b.created_at);
      const ageHours = (Date.now() - dt.getTime()) / (1000 * 60 * 60);
      return ageHours < 72; // within last 3 days
    });

    return unrated ? mapQueueItem(unrated) : null;
  } catch {
    return null;
  }
}

export async function rateShop(
  shopId: string,
  payload: { rating: number; comment?: string; bookingId?: string }
): Promise<{ success: boolean; rating: number; review_count: number }> {
  const res = await fetch(`${API_BASE_URL()}/shops/${shopId}/rate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      rating: payload.rating,
      comment: payload.comment,
      booking_id: payload.bookingId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Could not submit rating');
  }
  return res.json();
}

export async function getAllMyBookings(): Promise<{ active: QueueItem[]; past: QueueItem[] }> {
  const res = await fetch(`${API_BASE_URL()}/bookings`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Bookings failed (${res.status})`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : [];
  const active: QueueItem[] = [];
  const past: QueueItem[] = [];

  for (const b of list) {
    const mapped = mapQueueItem(b);
    if (['pending', 'confirmed', 'in_progress'].includes(b.status)) {
      active.push(mapped);
    } else {
      past.push(mapped);
    }
  }

  // Sort active tickets chronologically: soonest date & time first
  active.sort((a, b) => {
    const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return timeA - timeB;
  });

  return { active, past };
}

export async function getShopBookingsWithHistory(shopId: string): Promise<{
  active: QueueItem[];
  todayQueue: QueueItem[];
  upcoming: QueueItem[];
  past: QueueItem[];
  all: QueueItem[];
}> {
  const [liveQueueData, dbRows] = await Promise.all([
    getShopLiveQueue(shopId).catch(() => ({ queue: [] })),
    getShopBookingRows(shopId).catch(() => []),
  ]);

  const mappedDbRows: QueueItem[] = (dbRows || []).map((r: any) => mapQueueItem(r, shopId));

  // Merge liveQueueData.queue with dbRows, avoiding duplicates by id
  const itemMap = new Map<string, QueueItem>();
  for (const item of liveQueueData.queue || []) {
    itemMap.set(item.id, item);
  }
  for (const item of mappedDbRows) {
    if (!itemMap.has(item.id)) {
      itemMap.set(item.id, item);
    }
  }

  const allItems = Array.from(itemMap.values());
  const isFinished = (status: string) => status === 'completed' || status === 'cancelled';

  const past = allItems.filter((item) => isFinished(item.status));
  const activeItems = allItems.filter((item) => !isFinished(item.status));

  // Sort active chronologically by scheduled date/time ASC (earliest appointment first)
  activeItems.sort((a, b) => {
    const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return timeA - timeB;
  });

  // Calculate dynamic line positions in chronological order
  activeItems.forEach((item, idx) => {
    item.queuePosition = idx + 1;
  });

  const todayIso = new Date().toISOString().split('T')[0];
  const todayQueue: QueueItem[] = [];
  const upcoming: QueueItem[] = [];

  for (const item of activeItems) {
    const itemDate = item.scheduledAt ? item.scheduledAt.split('T')[0] : '';
    const isToday = itemDate ? itemDate === todayIso : !item.scheduledTime.includes('·');
    if (isToday) {
      todayQueue.push(item);
    } else {
      upcoming.push(item);
    }
  }

  return {
    active: activeItems,
    todayQueue,
    upcoming,
    past,
    all: [...activeItems, ...past],
  };
}
