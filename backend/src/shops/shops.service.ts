import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';

const SEED_SHOPS = [
  {
    id: 'shop-1',
    name: 'Blade & Fade Studio',
    tagline: 'Precision fades & traditional hot towel beard trims',
    owner_id: 'barber-1',
    address: '142 Mercer Street, Soho',
    city: 'Metro City',
    shop_type: 'barber',
    lat: 40.7223,
    lng: -73.9987,
    phone: '+1 (555) 234-5678',
    rating: 4.9,
    review_count: 142,
    is_open: true,
    is_emergency: false,
    avg_service_duration: 25,
    cover_image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    services: [
      { id: 's1', name: 'Signature Skin Fade', duration: 30, price: 35 },
      { id: 's2', name: 'Beard Sculpt & Lineup', duration: 20, price: 25 },
      { id: 's3', name: 'Full Cut + Hot Towel & Wash', duration: 45, price: 55 },
      { id: 's4', name: 'Buzz Cut & Neck Clean', duration: 15, price: 20 },
    ],
    working_hours: [
      { day_of_week: 1, start_time: '09:00', end_time: '19:00', is_open: true },
      { day_of_week: 2, start_time: '09:00', end_time: '19:00', is_open: true },
      { day_of_week: 3, start_time: '09:00', end_time: '19:00', is_open: true },
      { day_of_week: 4, start_time: '09:00', end_time: '20:00', is_open: true },
      { day_of_week: 5, start_time: '08:30', end_time: '20:00', is_open: true },
      { day_of_week: 6, start_time: '08:00', end_time: '18:00', is_open: true },
      { day_of_week: 0, start_time: '10:00', end_time: '16:00', is_open: false },
    ],
    breaks: [
      { id: 'b1', start_time: '13:00', end_time: '14:00', reason: 'Lunch & Blade Sterilization', is_recurring: true },
      { id: 'b2', start_time: '17:00', end_time: '17:20', reason: 'Afternoon Rest / Coffee', is_recurring: true },
    ],
    current_queue_count: 2,
    estimated_wait_minutes: 20,
    distance_km: 0.8,
  },
  {
    id: 'shop-2',
    name: 'Apex Grooming Lounge',
    tagline: 'Modern styling & luxury lounge atmosphere',
    owner_id: 'barber-2',
    address: '88 Kingfisher Ave, Westside',
    city: 'Metro City',
    shop_type: 'barber',
    lat: 40.7182,
    lng: -74.015,
    phone: '+1 (555) 876-5432',
    rating: 4.8,
    review_count: 98,
    is_open: true,
    is_emergency: false,
    avg_service_duration: 30,
    cover_image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
    services: [
      { id: 's5', name: 'Executive Taper Cut', duration: 30, price: 40 },
      { id: 's6', name: 'Razor Shave with Aloe', duration: 25, price: 30 },
      { id: 's7', name: 'Hair Color Treatment', duration: 50, price: 70 },
    ],
    working_hours: [
      { day_of_week: 1, start_time: '10:00', end_time: '19:00', is_open: true },
      { day_of_week: 2, start_time: '10:00', end_time: '19:00', is_open: true },
      { day_of_week: 3, start_time: '10:00', end_time: '19:00', is_open: true },
      { day_of_week: 4, start_time: '10:00', end_time: '20:00', is_open: true },
      { day_of_week: 5, start_time: '10:00', end_time: '20:00', is_open: true },
      { day_of_week: 6, start_time: '09:00', end_time: '17:00', is_open: true },
      { day_of_week: 0, start_time: '10:00', end_time: '15:00', is_open: false },
    ],
    breaks: [
      { id: 'b3', start_time: '14:30', end_time: '15:15', reason: 'Midday Rest Block', is_recurring: true },
    ],
    current_queue_count: 1,
    estimated_wait_minutes: 15,
    distance_km: 1.4,
  },
  {
    id: 'shop-3',
    name: 'Iron & Oak Barbers',
    tagline: 'Fast turnaround, zero-nonsense classic cuts',
    owner_id: 'barber-3',
    address: '304 Elmwood Blvd',
    city: 'Metro City',
    shop_type: 'barber',
    lat: 40.725,
    lng: -73.998,
    phone: '+1 (555) 432-1098',
    rating: 4.7,
    review_count: 215,
    is_open: true,
    is_emergency: true,
    emergency_reason: 'Barber chair hydraulic replacement in progress',
    avg_service_duration: 20,
    cover_image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
    services: [
      { id: 's8', name: 'Classic Crew Cut', duration: 20, price: 28 },
      { id: 's9', name: 'Moustache Groom & Wax', duration: 15, price: 18 },
    ],
    working_hours: [
      { day_of_week: 1, start_time: '08:30', end_time: '18:00', is_open: true },
      { day_of_week: 2, start_time: '08:30', end_time: '18:00', is_open: true },
      { day_of_week: 3, start_time: '08:30', end_time: '18:00', is_open: true },
      { day_of_week: 4, start_time: '08:30', end_time: '18:00', is_open: true },
      { day_of_week: 5, start_time: '08:30', end_time: '19:00', is_open: true },
      { day_of_week: 6, start_time: '08:00', end_time: '16:00', is_open: true },
      { day_of_week: 0, start_time: '00:00', end_time: '00:00', is_open: false },
    ],
    breaks: [],
    current_queue_count: 4,
    estimated_wait_minutes: 60,
    distance_km: 2.3,
  },
  {
    id: 'shop-4',
    name: 'Crown Heritage Cuts',
    tagline: 'Walk-ins always welcome, traditional gentleman cuts',
    owner_id: 'barber-4',
    address: '512 Oakridge Parkway',
    city: 'Metro City',
    shop_type: 'salon',
    lat: 40.705,
    lng: -74.02,
    phone: '+1 (555) 999-1122',
    rating: 4.9,
    review_count: 76,
    is_open: true,
    is_emergency: false,
    avg_service_duration: 35,
    cover_image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80',
    services: [
      { id: 's10', name: 'Precision Lineup & Taper', duration: 25, price: 30 },
      { id: 's11', name: 'Deluxe Beard Wash & Oil', duration: 20, price: 25 },
      { id: 's12', name: 'The Royal Treatment (Cut + Beard + Facial)', duration: 60, price: 85 },
    ],
    working_hours: [
      { day_of_week: 1, start_time: '09:00', end_time: '19:00', is_open: true },
      { day_of_week: 2, start_time: '09:00', end_time: '19:00', is_open: true },
      { day_of_week: 3, start_time: '09:00', end_time: '19:00', is_open: true },
      { day_of_week: 4, start_time: '09:00', end_time: '19:00', is_open: true },
      { day_of_week: 5, start_time: '09:00', end_time: '20:00', is_open: true },
      { day_of_week: 6, start_time: '09:00', end_time: '18:00', is_open: true },
      { day_of_week: 0, start_time: '11:00', end_time: '16:00', is_open: false },
    ],
    breaks: [
      { id: 'b4', start_time: '13:30', end_time: '14:30', reason: 'Lunch Break', is_recurring: true },
    ],
    current_queue_count: 0,
    estimated_wait_minutes: 0,
    distance_km: 3.1,
  },
];

type LocalQueueEntry = {
  id: string;
  shop_id: string;
  shop_name: string;
  shop_address?: string;
  shop_lat?: number;
  shop_lng?: number;
  customer_name: string;
  customer_avatar: string;
  service_id?: string;
  service_name: string;
  service_duration: number;
  price: number;
  queue_position: number;
  estimated_wait_minutes: number;
  scheduled_time: string;
  status: 'in_progress' | 'waiting' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
};

@Injectable()
export class ShopsService {
  private localShops = [...SEED_SHOPS];
  private localQueues = new Map<string, LocalQueueEntry[]>();

  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {
    for (const shop of SEED_SHOPS) {
      if (shop.id === 'shop-1') {
        this.localQueues.set(shop.id, [
          {
            id: 'q-101',
            shop_id: shop.id,
            shop_name: shop.name,
            customer_name: 'Ethan Carter',
            customer_avatar: '',
            service_name: 'Signature Skin Fade',
            service_duration: 30,
            price: 35,
            queue_position: 1,
            estimated_wait_minutes: 5,
            scheduled_time: '15:15',
            status: 'in_progress',
          },
          {
            id: 'q-102',
            shop_id: shop.id,
            shop_name: shop.name,
            customer_name: 'You (Alex Johnson)',
            customer_avatar: '',
            service_name: 'Full Combo (Cut + Beard + Wash)',
            service_duration: 45,
            price: 55,
            queue_position: 2,
            estimated_wait_minutes: 20,
            scheduled_time: '15:45',
            status: 'confirmed',
          },
        ]);
      } else {
        this.localQueues.set(shop.id, []);
      }
    }
  }

  private isSupabaseLive(): boolean {
    const url = process.env.SUPABASE_URL;
    return Boolean(url && !url.includes('placeholder') && !url.includes('your-project'));
  }

  private mapLiveQueueItem(shopId: string, shopName: string, b: any, shop?: any) {
    const scheduled = b.scheduled_at ? new Date(b.scheduled_at) : new Date();
    const status =
      b.status === 'in_progress'
        ? 'in_progress'
        : b.status === 'confirmed' || b.status === 'pending'
        ? 'waiting'
        : b.status;
    return {
      id: b.id,
      shop_id: shopId,
      shop_name: shopName,
      shop_address: shop?.address || b.shops?.address,
      shop_lat: shop?.lat ?? b.shops?.lat,
      shop_lng: shop?.lng ?? b.shops?.lng,
      customer_name: b.profiles?.full_name || 'Guest',
      customer_avatar: b.profiles?.avatar_url || '',
      service_id: b.service_id,
      service_name: b.services?.name || 'Service',
      service_duration: b.services?.duration || 30,
      price: Number(b.services?.price ?? 0),
      queue_position: b.queue_position ?? 0,
      estimated_wait_minutes: b.estimated_wait_minutes ?? 0,
      scheduled_time: scheduled.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      status,
      notes: b.notes,
    };
  }

  private syncShopQueueStats(shopId: string) {
    const shopIndex = this.localShops.findIndex((s) => s.id === shopId);
    if (shopIndex === -1) return;
    const queue = this.localQueues.get(shopId) || [];
    const active = queue.filter((q) => q.status !== 'cancelled' && q.status !== 'completed');
    const avg = this.localShops[shopIndex].avg_service_duration || 25;
    this.localShops[shopIndex].current_queue_count = active.length;
    this.localShops[shopIndex].estimated_wait_minutes = active.length * avg;
  }

  async findAll(filters?: { city?: string; search?: string; shopType?: string }) {
    // Auto-resume any shops whose timed pause has expired
    await this.autoResumeExpired();

    if (this.isSupabaseLive()) {
      try {
        let query = this.supabase
          .from('shops')
          .select(`*, services(*), profiles!owner_id(full_name, avatar_url)`)
          .order('name');
        if (filters?.city) query = query.ilike('city', `%${filters.city}%`);
        if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
        if (filters?.shopType === 'barber' || filters?.shopType === 'salon') {
          query = query.eq('shop_type', filters.shopType);
        }
        const { data, error } = await query;
        if (!error && data?.length) {
          return data.map((s: any) => ({
            ...s,
            shop_type: s.shop_type || 'barber',
            cover_image: s.cover_image_url || s.cover_image,
            owner_name: s.profiles?.full_name,
            current_queue_count: 0,
            estimated_wait_minutes: 0,
            distance_km: s.distance_km ?? 1.2,
          }));
        }
      } catch {
        // Fallback to local
      }
    }

    let result = [...this.localShops];
    if (filters?.city) {
      result = result.filter((s) => s.city.toLowerCase().includes(filters.city!.toLowerCase()));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
    }
    if (filters?.shopType === 'barber' || filters?.shopType === 'salon') {
      result = result.filter((s: any) => (s.shop_type || 'barber') === filters.shopType);
    }
    return result;
  }

  async findNearby(lat: number, lng: number, radiusKm = 10) {
    if (this.isSupabaseLive()) {
      try {
        const { data, error } = await this.supabase.rpc('shops_within_radius', {
          p_lat: lat,
          p_lng: lng,
          p_radius_km: radiusKm,
        });
        if (!error && data) return data;
      } catch {
        // Fallback
      }
    }
    return this.localShops;
  }

  async findOne(id: string) {
    await this.autoResumeExpired();
    if (this.isSupabaseLive()) {
      try {
        const { data, error } = await this.supabase
          .from('shops')
          .select(`*, profiles!owner_id(full_name, avatar_url, phone), services(*), working_hours(*), breaks(*)`)
          .eq('id', id)
          .single();
        if (!error && data) return data;
      } catch {
        // Fallback
      }
    }

    const shop = this.localShops.find((s) => s.id === id);
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async getLiveQueue(shopId: string) {
    if (this.isSupabaseLive()) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: shop } = await this.supabase
          .from('shops')
          .select('name, avg_service_duration, is_emergency, is_open')
          .eq('id', shopId)
          .single();

        const { data: bookings, error } = await this.supabase
          .from('bookings')
          .select(
            '*, services(name, duration, price), profiles!customer_id(full_name, avatar_url)',
          )
          .eq('shop_id', shopId)
          .in('status', ['pending', 'confirmed', 'in_progress'])
          .gte('scheduled_at', `${today}T00:00:00`)
          .lte('scheduled_at', `${today}T23:59:59`)
          .order('queue_position');

        if (!error && bookings) {
          const queue = bookings.map((b) =>
            this.mapLiveQueueItem(shopId, shop?.name || 'Barbershop', b),
          );
          const avg = shop?.avg_service_duration || 30;
          return {
            queue,
            total_in_queue: queue.length,
            estimated_total_wait: queue.length * avg,
            is_emergency: shop?.is_emergency,
            is_open: shop?.is_open,
          };
        }
      } catch {
        // Fallback
      }
    }

    const shop = this.localShops.find((s) => s.id === shopId) || this.localShops[0];
    const queue = this.localQueues.get(shopId) || [];
    return {
      queue,
      total_in_queue: queue.length,
      estimated_total_wait: shop.estimated_wait_minutes,
      is_emergency: shop.is_emergency,
      is_open: shop.is_open,
    };
  }

  async joinQueue(
    shopId: string,
    dto: {
      service_id?: string;
      customer_name?: string;
      notes?: string;
      customer_id?: string;
    },
  ) {
    const name = (dto.customer_name || 'Guest').trim();

    if (this.isSupabaseLive()) {
      const { data: shop, error: shopErr } = await this.supabase
        .from('shops')
        .select('*, services(*)')
        .eq('id', shopId)
        .single();
      if (shopErr || !shop) throw new NotFoundException('Shop not found');
      if (shop.is_emergency) {
        throw new ForbiddenException('Shop has an active emergency — joining paused');
      }
      if (!shop.is_open) {
        throw new ForbiddenException('Shop is currently closed');
      }

      const services = shop.services || [];
      const service =
        services.find((s: any) => s.id === dto.service_id) || services[0];
      if (!service) throw new NotFoundException('No services available');

      if (!dto.customer_id) {
        throw new ForbiddenException('Sign in to join the line');
      }
      const customerId = dto.customer_id;
      const { data: openLine } = await this.supabase
        .from('bookings')
        .select('id, shop_id')
        .eq('customer_id', customerId)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .limit(1)
        .maybeSingle();
      if (openLine) {
        throw new BadRequestException(
          openLine.shop_id === shopId
            ? 'You are already in this line.'
            : 'Finish your current line before joining another shop.',
        );
      }
      if (name) {
        await this.supabase
          .from('profiles')
          .update({ full_name: name })
          .eq('id', customerId);
      }
      const today = new Date().toISOString().split('T')[0];
      const { count } = await this.supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .gte('scheduled_at', `${today}T00:00:00`)
        .lte('scheduled_at', `${today}T23:59:59`);

      const position = (count || 0) + 1;
      const avg = shop.avg_service_duration || service.duration || 30;
      const wait = Math.max(0, (position - 1) * avg);
      const scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + wait);
      // Unique slot (unique index on shop_id + scheduled_at)
      scheduledAt.setSeconds(scheduledAt.getSeconds() + position);

      const { data: booking, error: bookErr } = await this.supabase
        .from('bookings')
        .insert({
          shop_id: shopId,
          customer_id: customerId,
          service_id: service.id,
          scheduled_at: scheduledAt.toISOString(),
          status: position === 1 ? 'in_progress' : 'confirmed',
          queue_position: position,
          estimated_wait_minutes: wait,
          notes: dto.notes || null,
        })
        .select(
          '*, services(name, duration, price), profiles!customer_id(full_name, avatar_url)',
        )
        .single();
      if (bookErr) throw new BadRequestException(bookErr.message);

      const live = await this.getLiveQueue(shopId);
      return {
        booking: this.mapLiveQueueItem(shopId, shop.name, booking),
        queue: live.queue,
        total_in_queue: live.total_in_queue,
        estimated_total_wait: live.estimated_total_wait,
      };
    }

    const shop = this.localShops.find((s) => s.id === shopId);
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.is_emergency) {
      throw new ForbiddenException('Shop has an active emergency — joining paused');
    }
    if (!shop.is_open) {
      throw new ForbiddenException('Shop is currently closed');
    }

    const service =
      shop.services.find((s) => s.id === dto.service_id) || shop.services[0];
    if (!service) throw new NotFoundException('No services available');

    const queue = this.localQueues.get(shopId) || [];
    for (const [otherId, otherQueue] of this.localQueues) {
      const open = otherQueue.find(
        (entry) =>
          entry.customer_name.replace(' (You)', '') === name &&
          !['completed', 'cancelled'].includes(entry.status),
      );
      if (open) {
        throw new BadRequestException(
          otherId === shopId
            ? 'You are already in this line.'
            : 'Finish your current line before joining another shop.',
        );
      }
    }
    const position = queue.length + 1;
    const avg = shop.avg_service_duration || service.duration;
    const wait = Math.max(0, (position - 1) * avg);
    const seat = new Date();
    seat.setMinutes(seat.getMinutes() + wait);
    const scheduled_time = seat.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const entry: LocalQueueEntry = {
      id: `q-${Date.now()}`,
      shop_id: shopId,
      shop_name: shop.name,
      customer_name: name.includes('(You)') ? name : `${name} (You)`,
      customer_avatar: '',
      service_id: service.id,
      service_name: service.name,
      service_duration: service.duration,
      price: service.price,
      queue_position: position,
      estimated_wait_minutes: wait,
      scheduled_time,
      status: position === 1 ? 'in_progress' : 'waiting',
      notes: dto.notes,
    };

    queue.push(entry);
    this.localQueues.set(shopId, queue);
    this.syncShopQueueStats(shopId);

    return {
      booking: entry,
      queue,
      total_in_queue: queue.length,
      estimated_total_wait: shop.estimated_wait_minutes,
    };
  }

  async findMine(ownerId: string) {
    await this.autoResumeExpired();
    if (this.isSupabaseLive()) {
      const { data, error } = await this.supabase
        .from('shops')
        .select(`*, services(*), working_hours(*), breaks(*)`)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw new BadRequestException(error.message);
      if (!data) return null;
      return {
        ...data,
        shop_type: data.shop_type || 'barber',
        cover_image: data.cover_image_url || data.cover_image,
      };
    }

    const local = this.localShops.find((s) => s.owner_id === ownerId) || null;
    return local;
  }

  async create(ownerId: string, dto: any) {
    const shopType = dto.shop_type === 'salon' ? 'salon' : 'barber';
    const name = (dto.name || '').trim();
    const address = (dto.address || '').trim();
    const city = (dto.city || '').trim() || 'Accra';
    if (!name || !address) {
      throw new BadRequestException('Name and address are required');
    }

    if (this.isSupabaseLive()) {
      const existing = await this.findMine(ownerId);
      if (existing) {
        throw new BadRequestException('You already have a shop. Edit it instead.');
      }

      const { data: shop, error } = await this.supabase
        .from('shops')
        .insert({
          owner_id: ownerId,
          name,
          tagline: dto.tagline || null,
          description: dto.description || null,
          address,
          city,
          phone: dto.phone || null,
          shop_type: shopType,
          avg_service_duration: Number(dto.avg_service_duration) || (shopType === 'salon' ? 45 : 30),
          is_open: true,
          is_emergency: false,
          lat: dto.lat ?? null,
          lng: dto.lng ?? null,
        })
        .select()
        .single();
      if (error) throw new BadRequestException(error.message);

      const defaultServices =
        shopType === 'salon'
          ? [
              { shop_id: shop.id, name: 'Wash & Style', duration: 45, price: 80 },
              { shop_id: shop.id, name: 'Braids', duration: 90, price: 150 },
              { shop_id: shop.id, name: 'Treatment', duration: 60, price: 120 },
            ]
          : [
              { shop_id: shop.id, name: 'Haircut', duration: 30, price: 40 },
              { shop_id: shop.id, name: 'Fade', duration: 35, price: 50 },
              { shop_id: shop.id, name: 'Beard trim', duration: 20, price: 25 },
            ];
      await this.supabase.from('services').insert(defaultServices);

      // Mon–Sat open; Sunday omitted = closed
      const hours = [1, 2, 3, 4, 5, 6].map((day) => ({
        shop_id: shop.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '18:00',
      }));
      await this.supabase.from('working_hours').insert(hours);

      return this.findMine(ownerId);
    }

    const newShop = {
      id: `shop-${Date.now()}`,
      name,
      tagline: dto.tagline || '',
      address,
      city,
      phone: dto.phone || '',
      shop_type: shopType,
      owner_id: ownerId,
      avg_service_duration: Number(dto.avg_service_duration) || 30,
      lat: Number(dto.lat) || 5.6037,
      lng: Number(dto.lng) || -0.187,
      cover_image: dto.cover_image || '',
      distance_km: 0,
      rating: 5.0,
      review_count: 0,
      is_open: true,
      is_emergency: false,
      emergency_reason: undefined as string | undefined,
      current_queue_count: 0,
      estimated_wait_minutes: 0,
      services: [] as any[],
      working_hours: [] as any[],
      breaks: [] as any[],
    };
    this.localShops.push(newShop as any);
    this.localQueues.set(newShop.id, []);
    return newShop;
  }

  private readPhotos(value: unknown): string[] {
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item);
    if (typeof value !== 'string' || !value.trim()) return [];
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string' && item);
      } catch {
        /* plain url */
      }
    }
    return [trimmed];
  }

  private async savePhotos(shopId: string, ownerId: string, photos: string[]) {
    const { error } = await this.supabase
      .from('shops')
      .update({ cover_image_url: photos.length ? JSON.stringify(photos) : null })
      .eq('id', shopId)
      .eq('owner_id', ownerId);
    if (error) throw new BadRequestException(error.message);
    return this.findMine(ownerId);
  }

  async addPhoto(shopId: string, ownerId: string, image: string) {
    const match = image.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) throw new BadRequestException('Choose a photo from your phone or computer');
    const buffer = Buffer.from(match[1].replace(/\s/g, ''), 'base64');
    if (!buffer.length || buffer.length > 1_500_000) {
      throw new BadRequestException('That photo is too large. Try another one.');
    }

    const { data: shop } = await this.supabase
      .from('shops')
      .select('id, cover_image_url')
      .eq('id', shopId)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (!shop) throw new ForbiddenException('Not your shop');

    const photos = this.readPhotos(shop.cover_image_url);
    if (photos.length >= 8) throw new BadRequestException('You can add up to 8 photos.');

    const bucket = 'shop-photos';
    const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
    if (listError) throw new BadRequestException(listError.message);
    if (!buckets?.some((item) => item.name === bucket)) {
      const created = await this.supabase.storage.createBucket(bucket, { public: true });
      if (created.error && !/already exists/i.test(created.error.message)) {
        throw new BadRequestException(created.error.message);
      }
    }

    const path = `${shopId}/${Date.now()}.jpg`;
    const uploaded = await this.supabase.storage.from(bucket).upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (uploaded.error) throw new BadRequestException(uploaded.error.message);
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    photos.push(`${data.publicUrl}?v=${Date.now()}`);
    return this.savePhotos(shopId, ownerId, photos);
  }

  async removePhoto(shopId: string, ownerId: string, url: string) {
    const { data: shop } = await this.supabase
      .from('shops')
      .select('cover_image_url')
      .eq('id', shopId)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (!shop) throw new ForbiddenException('Not your shop');
    const photos = this.readPhotos(shop.cover_image_url).filter((item) => item !== url);
    return this.savePhotos(shopId, ownerId, photos);
  }

  private async ownedShop(shopId: string, ownerId: string) {
    const { data } = await this.supabase
      .from('shops')
      .select('id')
      .eq('id', shopId)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (!data) throw new ForbiddenException('Not your shop');
  }

  async addService(shopId: string, ownerId: string, dto: { name?: string; price?: number; duration?: number }) {
    const name = (dto.name || '').trim();
    const price = Number(dto.price);
    const duration = Number(dto.duration) || 30;
    if (!name) throw new BadRequestException('Give the service a name.');
    if (!Number.isFinite(price) || price < 0) throw new BadRequestException('Enter the price in GHS.');
    if (duration < 5 || duration > 240) throw new BadRequestException('How long should be between 5 and 240 minutes.');

    if (this.isSupabaseLive()) {
      await this.ownedShop(shopId, ownerId);
      const { count } = await this.supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId);
      if ((count || 0) >= 12) throw new BadRequestException('You can list up to 12 services.');
      const { error } = await this.supabase.from('services').insert({
        shop_id: shopId,
        name,
        price,
        duration,
      });
      if (error) throw new BadRequestException(error.message);
      return this.findMine(ownerId);
    }

    const shop = this.localShops.find((item) => item.id === shopId);
    if (!shop) throw new NotFoundException('Shop not found');
    shop.services.push({ id: `svc-${Date.now()}`, name, price, duration });
    return shop;
  }

  async updateService(
    shopId: string,
    ownerId: string,
    serviceId: string,
    dto: { name?: string; price?: number; duration?: number },
  ) {
    const name = dto.name !== undefined ? String(dto.name).trim() : undefined;
    const price = dto.price !== undefined ? Number(dto.price) : undefined;
    const duration = dto.duration !== undefined ? Number(dto.duration) : undefined;
    if (name !== undefined && !name) throw new BadRequestException('Give the service a name.');
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      throw new BadRequestException('Enter the price in GHS.');
    }
    if (duration !== undefined && (duration < 5 || duration > 240)) {
      throw new BadRequestException('How long should be between 5 and 240 minutes.');
    }

    if (this.isSupabaseLive()) {
      await this.ownedShop(shopId, ownerId);
      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = name;
      if (price !== undefined) patch.price = price;
      if (duration !== undefined) patch.duration = duration;
      const { error } = await this.supabase
        .from('services')
        .update(patch)
        .eq('id', serviceId)
        .eq('shop_id', shopId);
      if (error) throw new BadRequestException(error.message);
      return this.findMine(ownerId);
    }

    const shop = this.localShops.find((item) => item.id === shopId);
    const service = shop?.services.find((item) => item.id === serviceId);
    if (!service) throw new NotFoundException('Service not found');
    if (name !== undefined) service.name = name;
    if (price !== undefined) service.price = price;
    if (duration !== undefined) service.duration = duration;
    return shop;
  }

  async removeService(shopId: string, ownerId: string, serviceId: string) {
    if (this.isSupabaseLive()) {
      await this.ownedShop(shopId, ownerId);
      const { error } = await this.supabase
        .from('services')
        .delete()
        .eq('id', serviceId)
        .eq('shop_id', shopId);
      if (error) throw new BadRequestException(error.message);
      return this.findMine(ownerId);
    }

    const shop = this.localShops.find((item) => item.id === shopId);
    if (!shop) throw new NotFoundException('Shop not found');
    shop.services = shop.services.filter((item) => item.id !== serviceId);
    return shop;
  }

  async update(id: string, ownerId: string, dto: any) {
    if (this.isSupabaseLive()) {
      const { data: owned } = await this.supabase
        .from('shops')
        .select('id')
        .eq('id', id)
        .eq('owner_id', ownerId)
        .maybeSingle();
      if (!owned) throw new ForbiddenException('Not your shop');

      const patch: Record<string, unknown> = {};
      if (dto.name !== undefined) patch.name = String(dto.name).trim();
      if (dto.tagline !== undefined) patch.tagline = dto.tagline;
      if (dto.address !== undefined) patch.address = String(dto.address).trim();
      if (dto.city !== undefined) patch.city = String(dto.city).trim();
      if (dto.phone !== undefined) patch.phone = dto.phone;
      if (dto.avg_service_duration !== undefined) {
        patch.avg_service_duration = Number(dto.avg_service_duration);
      }
      if (dto.is_open !== undefined) patch.is_open = Boolean(dto.is_open);
      if (dto.lat !== undefined) patch.lat = dto.lat === null ? null : Number(dto.lat);
      if (dto.lng !== undefined) patch.lng = dto.lng === null ? null : Number(dto.lng);

      const { error } = await this.supabase.from('shops').update(patch).eq('id', id);
      if (error) throw new BadRequestException(error.message);
      return this.findMine(ownerId);
    }

    const shopIndex = this.localShops.findIndex((s) => s.id === id && s.owner_id === ownerId);
    if (shopIndex === -1) throw new NotFoundException('Shop not found');
    this.localShops[shopIndex] = { ...this.localShops[shopIndex], ...dto };
    return this.localShops[shopIndex];
  }

  async saveHours(
    shopId: string,
    ownerId: string,
    hours: { day_of_week: number; start_time: string; end_time: string }[],
  ) {
    if (this.isSupabaseLive()) {
      await this.ownedShop(shopId, ownerId);
      // Delete existing then re-insert so it's a clean replace
      await this.supabase.from('working_hours').delete().eq('shop_id', shopId);
      if (hours.length) {
        const rows = hours.map((h) => ({
          shop_id: shopId,
          day_of_week: h.day_of_week,
          start_time: h.start_time,
          end_time: h.end_time,
        }));
        const { error } = await this.supabase.from('working_hours').insert(rows);
        if (error) throw new BadRequestException(error.message);
      }
      return this.findMine(ownerId);
    }

    // Local fallback — patch the in-memory shop
    const shopIndex = this.localShops.findIndex((s) => s.id === shopId && s.owner_id === ownerId);
    if (shopIndex === -1) throw new NotFoundException('Shop not found');
    (this.localShops[shopIndex] as any).working_hours = hours.map((h) => ({
      day_of_week: h.day_of_week,
      start_time: h.start_time,
      end_time: h.end_time,
      is_open: true,
    }));
    return this.localShops[shopIndex];
  }

  async toggleEmergency(shopId: string, ownerId: string, isEmergency: boolean, reason?: string, resumeAt?: string) {
    if (this.isSupabaseLive()) {
      const { data: owned } = await this.supabase
        .from('shops')
        .select('id')
        .eq('id', shopId)
        .eq('owner_id', ownerId)
        .maybeSingle();
      if (!owned) throw new ForbiddenException('Not your shop');

      const { error } = await this.supabase
        .from('shops')
        .update({
          is_emergency: isEmergency,
          emergency_reason: isEmergency ? reason || null : null,
          resume_at: isEmergency && resumeAt ? resumeAt : null,
        })
        .eq('id', shopId);
      if (error) throw new BadRequestException(error.message);
      return { is_emergency: isEmergency, shop_id: shopId, emergency_reason: reason, resume_at: resumeAt || null };
    }

    const shopIndex = this.localShops.findIndex((s) => s.id === shopId && s.owner_id === ownerId);
    if (shopIndex !== -1) {
      this.localShops[shopIndex].is_emergency = isEmergency;
      (this.localShops[shopIndex] as any).emergency_reason = reason;
      (this.localShops[shopIndex] as any).resume_at = isEmergency && resumeAt ? resumeAt : null;
    }
    return { is_emergency: isEmergency, shop_id: shopId, emergency_reason: reason, resume_at: resumeAt || null };
  }

  /**
   * Auto-resume shops whose pause timer has expired.
   * Called on shop reads so there's no need for a cron job.
   */
  async autoResumeExpired() {
    if (!this.isSupabaseLive()) return;
    try {
      await this.supabase
        .from('shops')
        .update({ is_emergency: false, emergency_reason: null, resume_at: null })
        .eq('is_emergency', true)
        .not('resume_at', 'is', null)
        .lte('resume_at', new Date().toISOString());
    } catch {
      /* best-effort */
    }
  }
}
