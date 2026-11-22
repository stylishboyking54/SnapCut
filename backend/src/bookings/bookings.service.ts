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
        shops(id, name, address, cover_image_url, is_emergency, lat, lng),
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

    const { data, error } = await this.supabase
      .from('bookings')
      .select(`
        *,
        profiles!customer_id(full_name, avatar_url, phone),
        services(name, duration, price)
      `)
      .eq('shop_id', shopId)
      .order('scheduled_at', { ascending: true });

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
      .select('is_open, is_emergency, avg_service_duration, chair_count')
      .eq('id', dto.shop_id)
      .single();

    if (!shop?.is_open) throw new BadRequestException('Shop is currently closed');
    if (shop?.is_emergency) throw new BadRequestException('Shop has an active emergency — bookings paused');

    const { data: openLine } = await this.supabase
      .from('bookings')
      .select('id, shop_id')
      .eq('customer_id', customerId)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .limit(1)
      .maybeSingle();
    if (openLine) {
      throw new BadRequestException(
        openLine.shop_id === dto.shop_id
          ? 'You are already in this line.'
          : 'Finish your current line before joining another shop.',
      );
    }

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

    // 3. Check for slot capacity based on chair_count
    const chairCount = Math.max(1, Number(shop?.chair_count) || 1);
    const { data: existing } = await this.supabase
      .from('bookings')
      .select('id')
      .eq('shop_id', dto.shop_id)
      .eq('scheduled_at', dto.scheduled_at)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    if (existing && existing.length >= chairCount) {
      throw new BadRequestException(
        chairCount === 1
          ? 'This time slot is already booked'
          : `All ${chairCount} chairs/stylists are already booked for this time slot.`,
      );
    }

    // 4. Get current queue position chronologically
    const { count } = await this.supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', dto.shop_id)
      .in('status', ['pending', 'confirmed', 'in_progress'])
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

    // Resequence all active bookings chronologically
    await this.resequenceShopQueue(dto.shop_id);

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
    if (actorRole === 'customer' && status !== 'cancelled') {
      throw new ForbiddenException('You can only cancel your own spot');
    }
    // Pro can only update their shop's bookings
    if (
      (actorRole === 'barber' || actorRole === 'salon') &&
      booking.shops?.owner_id !== actorId
    ) {
      throw new ForbiddenException('Not your shop booking');
    }

    const { data, error } = await this.supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    // When someone finishes / cancels, tighten the remaining line
    if (status === 'completed' || status === 'cancelled') {
      await this.resequenceShopQueue(booking.shop_id);
    }

    const message =
      status === 'in_progress'
        ? "You're up — head to the chair."
        : status === 'completed'
        ? 'All done. Thanks for visiting SnapCut.'
        : status === 'cancelled'
        ? 'Your spot was released.'
        : `Your booking status changed to: ${status}`;

    await this.supabase.from('notifications').insert({
      user_id: booking.customer_id,
      booking_id: bookingId,
      type: 'queue_update',
      message,
    });

    return data;
  }

  /** Recalc queue_position + wait for active bookings in a shop chronologically. */
  async resequenceShopQueue(shopId: string) {
    const { data: shop } = await this.supabase
      .from('shops')
      .select('avg_service_duration')
      .eq('id', shopId)
      .single();
    const avg = shop?.avg_service_duration || 30;

    const { data: active } = await this.supabase
      .from('bookings')
      .select('id, status, scheduled_at')
      .eq('shop_id', shopId)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .order('scheduled_at', { ascending: true });

    if (!active?.length) return;

    // Keep in_progress first, then sort waiting chronologically by scheduled_at
    const inProgress = active.filter((b) => b.status === 'in_progress');
    const waiting = active.filter((b) => b.status !== 'in_progress');
    waiting.sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    );
    const ordered = [...inProgress, ...waiting];

    for (let i = 0; i < ordered.length; i++) {
      const pos = i + 1;
      await this.supabase
        .from('bookings')
        .update({
          queue_position: pos,
          estimated_wait_minutes: Math.max(0, (pos - 1) * avg),
        })
        .eq('id', ordered[i].id);
    }
  }

  /** Finish current client and call the next person up (supporting multiple chairs). */
  async advanceQueue(shopId: string, ownerId: string, finishBookingId?: string) {
    const { data: shop } = await this.supabase
      .from('shops')
      .select('owner_id, avg_service_duration, name, chair_count')
      .eq('id', shopId)
      .single();
    if (!shop || shop.owner_id !== ownerId) {
      throw new ForbiddenException('Not your shop');
    }

    const chairCount = Math.max(1, Number(shop.chair_count) || 1);
    // Wide window so timezone skew does not hide today's line
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 1);
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date();
    to.setUTCDate(to.getUTCDate() + 1);
    to.setUTCHours(23, 59, 59, 999);
    const { data: active } = await this.supabase
      .from('bookings')
      .select('id, status, customer_id, queue_position, scheduled_at, profiles!customer_id(full_name)')
      .eq('shop_id', shopId)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .gte('scheduled_at', from.toISOString())
      .lte('scheduled_at', to.toISOString())
      .order('scheduled_at', { ascending: true });

    if (!active?.length) {
      return { advanced: false, message: 'Line is empty' };
    }

    const now = Date.now();
    // Barber can call someone up to 12h ahead (covers clock/timezone mismatch on old tickets)
    const DUE_THRESHOLD_MS = 12 * 60 * 60 * 1000;

    if (finishBookingId) {
      const target = active.find((b) => b.id === finishBookingId);
      if (target && ['in_progress', 'confirmed', 'pending'].includes(target.status)) {
        await this.supabase.from('bookings').update({ status: 'completed' }).eq('id', target.id);
        await this.supabase.from('notifications').insert({
          user_id: target.customer_id,
          booking_id: target.id,
          type: 'queue_update',
          message: 'All done. Thanks for visiting SnapCut.',
        });
        target.status = 'completed';
      }
    }

    const live = active.filter((b) => b.status !== 'completed');
    const inProgressClients = live.filter((b) => b.status === 'in_progress');
    const waitingClients = live.filter((b) => b.status !== 'in_progress');
    const justFinishedId = finishBookingId && active.some((b) => b.id === finishBookingId && b.status === 'completed')
      ? finishBookingId
      : undefined;

    if (!live.length) {
      if (justFinishedId) {
        await this.resequenceShopQueue(shopId);
        return { advanced: true, completed_id: justFinishedId, seat_empty: true };
      }
      return { advanced: false, message: 'Line is empty' };
    }

    // If an open chair exists AND there is a waiting client who is due, seat them into an open chair
    if (inProgressClients.length < chairCount && waitingClients.length > 0) {
      const nextToCall = waitingClients[0];
      const nextScheduledTime = nextToCall.scheduled_at ? new Date(nextToCall.scheduled_at).getTime() : now;
      const isNextDue = isNaN(nextScheduledTime) || nextScheduledTime <= now + DUE_THRESHOLD_MS;
      const nextTimeStr = nextToCall.scheduled_at
        ? new Date(nextToCall.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'now';
      const clientName = (nextToCall as any).profiles?.full_name || 'Client';

      if (!isNextDue) {
        // If someone is in a chair and the barber clicked to advance, complete the inProgress client
        if (inProgressClients.length > 0) {
          const finished = inProgressClients[0];
          await this.supabase.from('bookings').update({ status: 'completed' }).eq('id', finished.id);
          await this.supabase.from('notifications').insert({
            user_id: finished.customer_id,
            booking_id: finished.id,
            type: 'queue_update',
            message: 'All done. Thanks for visiting SnapCut.',
          });
          await this.resequenceShopQueue(shopId);
          return {
            advanced: true,
            completed_id: finished.id,
            seated: false,
            seat_empty: true,
            message: `Finished cut. Chair is open — next appointment is at ${nextTimeStr}.`,
          };
        }

        throw new BadRequestException(
          `It is not ${clientName}'s appointment time yet. They are scheduled for ${nextTimeStr}. You can only call them when their time is near.`,
        );
      }

      // Seat into the available chair
      await this.supabase.from('bookings').update({ status: 'in_progress' }).eq('id', nextToCall.id);
      await this.supabase.from('notifications').insert({
        user_id: nextToCall.customer_id,
        booking_id: nextToCall.id,
        type: 'queue_update',
        message: "You're up — head over now.",
      });
      await this.resequenceShopQueue(shopId);
      return {
        advanced: true,
        seated: true,
        next_customer_name: clientName,
        message: `Called ${clientName} to chair (${inProgressClients.length + 1} of ${chairCount} chairs occupied).`,
      };
    }

    // If all chairs are full, finish the first inProgress client to free up a chair
    if (inProgressClients.length > 0) {
      const finished = inProgressClients[0];
      await this.supabase.from('bookings').update({ status: 'completed' }).eq('id', finished.id);
      await this.supabase.from('notifications').insert({
        user_id: finished.customer_id,
        booking_id: finished.id,
        type: 'queue_update',
        message: 'All done. Thanks for visiting SnapCut.',
      });

      // Now see if next waiting client can be seated into the freed chair
      if (waitingClients.length > 0) {
        const next = waitingClients[0];
        const nextScheduledTime = next.scheduled_at ? new Date(next.scheduled_at).getTime() : now;
        const isNextDue = isNaN(nextScheduledTime) || nextScheduledTime <= now + DUE_THRESHOLD_MS;

        if (isNextDue) {
          await this.supabase.from('bookings').update({ status: 'in_progress' }).eq('id', next.id);
          await this.supabase.from('notifications').insert({
            user_id: next.customer_id,
            booking_id: next.id,
            type: 'queue_update',
            message: "You're up — head over now.",
          });
          await this.resequenceShopQueue(shopId);
          return {
            advanced: true,
            completed_id: finished.id,
            seated: true,
            message: `Finished cut. Called next client to chair.`,
          };
        } else {
          const nextTimeStr = new Date(next.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          await this.resequenceShopQueue(shopId);
          return {
            advanced: true,
            completed_id: finished.id,
            seated: false,
            seat_empty: true,
            message: `Finished cut. Chair is open — next appointment is at ${nextTimeStr}.`,
          };
        }
      }

      await this.resequenceShopQueue(shopId);
      return { advanced: true, completed_id: finished.id, seat_empty: true };
    }

    return { advanced: false, message: 'Line is empty' };
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

  /** Customer tells the shop they have arrived. Saved on the ticket, so it stays after refresh. */
  async markHere(bookingId: string, customerId: string) {
    const booking = await this.ownActiveBooking(bookingId, customerId);
    if (String(booking.notes || '').includes('[[here]]')) {
      return { here: true, already: true };
    }
    const notes = booking.notes ? `[[here]] ${booking.notes}` : '[[here]]';
    const { error } = await this.supabase.from('bookings').update({ notes }).eq('id', bookingId);
    if (error) throw new BadRequestException(error.message);
    const name = booking.profiles?.full_name || 'A customer';
    await this.notifyShop(booking, `${name} is here and waiting.`);
    return { here: true };
  }

  /** Customer asks the shop for 10 more minutes. The wait on the ticket goes up, and the shop is told. */
  async askForMoreTime(bookingId: string, customerId: string) {
    const booking = await this.ownActiveBooking(bookingId, customerId);
    const current = Number(String(booking.notes || '').match(/\[\[grace:(\d+)\]\]/)?.[1] || 0);
    if (current >= 30) {
      throw new BadRequestException('You already asked for 30 extra minutes. Talk to the shop if you need longer.');
    }
    const next = current + 10;
    const base = String(booking.notes || '').replace(/\[\[grace:\d+\]\]\s*/g, '').trim();
    const notes = `[[grace:${next}]]${base ? ` ${base}` : ''}`;
    const wait = Number(booking.estimated_wait_minutes || 0) + 10;
    const { error } = await this.supabase
      .from('bookings')
      .update({ notes, estimated_wait_minutes: wait })
      .eq('id', bookingId);
    if (error) throw new BadRequestException(error.message);
    const name = booking.profiles?.full_name || 'A customer';
    await this.notifyShop(booking, `${name} needs about ${next} more minutes.`);
    return { extraMinutes: next, estimatedWaitMinutes: wait };
  }

  private async ownActiveBooking(bookingId: string, customerId: string) {
    const { data: booking } = await this.supabase
      .from('bookings')
      .select('*, shops(owner_id), profiles!customer_id(full_name)')
      .eq('id', bookingId)
      .single();
    if (!booking) throw new NotFoundException('Ticket not found');
    if (booking.customer_id !== customerId) throw new ForbiddenException('Not your ticket');
    if (!['pending', 'confirmed', 'in_progress'].includes(booking.status)) {
      throw new BadRequestException('This ticket is already finished.');
    }
    return booking;
  }

  private async notifyShop(booking: { shops?: { owner_id?: string }; id: string }, message: string) {
    const ownerId = booking.shops?.owner_id;
    if (!ownerId) return;
    await this.supabase.from('notifications').insert({
      user_id: ownerId,
      booking_id: booking.id,
      type: 'queue_update',
      message,
    });
  }
}
