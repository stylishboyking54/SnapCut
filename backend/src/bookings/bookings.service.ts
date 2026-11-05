import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async getMyBookings(customerId: string) {
    const { data, error } = await this.supabase
      .from('bookings')
      .select(`
        *,
        shops(name, address, cover_image_url, is_emergency),
        services(name, duration, price)
      `)
      .eq('customer_id', customerId)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getShopBookings(shopId: string, ownerId: string) {
    // verify ownership
    const { data: shop } = await this.supabase
      .from('shops').select('owner_id').eq('id', shopId).single();
    if (shop?.owner_id !== ownerId) throw new ForbiddenException('Not your shop');

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('bookings')
      .select(`
        *,
        profiles!customer_id(full_name, avatar_url, phone),
        services(name, duration, price)
      `)
      .eq('shop_id', shopId)
      .gte('scheduled_at', `${today}T00:00:00`)
      .order('scheduled_at');

    if (error) throw error;
    return data;
  }

  async create(customerId: string, dto: {
    shop_id: string;
    service_id: string;
    scheduled_at: string;
    notes?: string;
  }) {
    // 1. Check shop is open and not in emergency
    const { data: shop } = await this.supabase
      .from('shops')
      .select('is_open, is_emergency, avg_service_duration')
      .eq('id', dto.shop_id)
      .single();

    if (!shop?.is_open) throw new BadRequestException('Shop is currently closed');
    if (shop?.is_emergency) throw new BadRequestException('Shop has an active emergency — bookings paused');

    // 2. Check slot is not during a break
    const { data: breaks } = await this.supabase
      .from('breaks')
      .select('*')
      .eq('shop_id', dto.shop_id)
      .lte('start_datetime', dto.scheduled_at)
      .gte('end_datetime', dto.scheduled_at);

    if (breaks && breaks.length > 0) {
      throw new BadRequestException('This time slot is blocked (barber break)');
    }

    // 3. Check for double booking
    const { data: existing } = await this.supabase
      .from('bookings')
      .select('id')
      .eq('shop_id', dto.shop_id)
      .eq('scheduled_at', dto.scheduled_at)
      .in('status', ['pending', 'confirmed']);

    if (existing && existing.length > 0) {
      throw new BadRequestException('This time slot is already booked');
    }

    // 4. Get current queue position
    const scheduledDate = dto.scheduled_at.split('T')[0];
    const { count } = await this.supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', dto.shop_id)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', `${scheduledDate}T00:00:00`)
      .lte('scheduled_at', dto.scheduled_at);

    const queuePosition = (count || 0) + 1;
    const estimatedWait = queuePosition * (shop.avg_service_duration || 30);

    // 5. Create booking
    const { data: booking, error } = await this.supabase
      .from('bookings')
      .insert({
        ...dto,
        customer_id: customerId,
        status: 'confirmed',
        queue_position: queuePosition,
        estimated_wait_minutes: estimatedWait,
      })
      .select()
      .single();

    if (error) throw error;
    return booking;
  }

  async updateStatus(bookingId: string, actorId: string, status: string, actorRole: string) {
    const { data: booking } = await this.supabase
      .from('bookings').select('*, shops(owner_id)').eq('id', bookingId).single();

    if (!booking) throw new NotFoundException('Booking not found');

    // Customer can only cancel their own
    if (actorRole === 'customer' && booking.customer_id !== actorId) {
      throw new ForbiddenException('Not your booking');
    }
    // Barber can only update their shop's bookings
    if (actorRole === 'barber' && booking.shops?.owner_id !== actorId) {
      throw new ForbiddenException('Not your shop booking');
    }

    const { data, error } = await this.supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    // Notify customer on status change
    await this.supabase.from('notifications').insert({
      user_id: booking.customer_id,
      booking_id: bookingId,
      type: 'queue_update',
      message: `Your booking status changed to: ${status}`,
    });

    return data;
  }

  async shiftBooking(bookingId: string, ownerId: string, newScheduledAt: string) {
    const { data: booking } = await this.supabase
      .from('bookings').select('*, shops(owner_id), customer_id').eq('id', bookingId).single();

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.shops?.owner_id !== ownerId) throw new ForbiddenException('Not your shop');

    const { data, error } = await this.supabase
      .from('bookings')
      .update({ scheduled_at: newScheduledAt, status: 'rescheduled' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    // Notify customer
    await this.supabase.from('notifications').insert({
      user_id: booking.customer_id,
      booking_id: bookingId,
      type: 'reschedule',
      message: `Your booking has been rescheduled to ${new Date(newScheduledAt).toLocaleString()}`,
    });

    return data;
  }
}
