import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';

@Injectable()
export class ScheduleService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async getWorkingHours(shopId: string) {
    const { data, error } = await this.supabase
      .from('working_hours')
      .select('*')
      .eq('shop_id', shopId)
      .order('day_of_week');
    if (error) throw error;
    return data;
  }

  async setWorkingHours(shopId: string, hours: { day_of_week: number; start_time: string; end_time: string }[]) {
    // Replace all working hours for the shop
    await this.supabase.from('working_hours').delete().eq('shop_id', shopId);
    const { data, error } = await this.supabase
      .from('working_hours')
      .insert(hours.map((h) => ({ ...h, shop_id: shopId })))
      .select();
    if (error) throw error;
    return data;
  }

  async getBreaks(shopId: string) {
    const { data, error } = await this.supabase
      .from('breaks')
      .select('*')
      .eq('shop_id', shopId)
      .order('start_datetime');
    if (error) throw error;
    return data;
  }

  async addBreak(shopId: string, dto: {
    start_datetime: string;
    end_datetime: string;
    reason?: string;
    is_recurring?: boolean;
    recurrence_rule?: string;
  }) {
    const { data, error } = await this.supabase
      .from('breaks')
      .insert({ ...dto, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async removeBreak(shopId: string, breakId: string) {
    const { error } = await this.supabase
      .from('breaks')
      .delete()
      .eq('id', breakId)
      .eq('shop_id', shopId);
    if (error) throw error;
    return { message: 'Break removed' };
  }

  async getAvailableSlots(shopId: string, date: string) {
    // Get working hours for the day of week
    const dayOfWeek = new Date(date).getDay();
    const { data: hours } = await this.supabase
      .from('working_hours')
      .select('*')
      .eq('shop_id', shopId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!hours) return { slots: [], message: 'Shop closed on this day' };

    const { data: shop } = await this.supabase
      .from('shops')
      .select('avg_service_duration')
      .eq('id', shopId)
      .single();

    const duration = shop?.avg_service_duration || 30;

    // Build all possible slots
    const slots: string[] = [];
    const [startH, startM] = hours.start_time.split(':').map(Number);
    const [endH, endM] = hours.end_time.split(':').map(Number);
    let current = new Date(`${date}T${hours.start_time}`);
    const end = new Date(`${date}T${hours.end_time}`);

    while (current < end) {
      slots.push(current.toISOString());
      current = new Date(current.getTime() + duration * 60000);
    }

    // Filter out booked slots
    const { data: booked } = await this.supabase
      .from('bookings')
      .select('scheduled_at')
      .eq('shop_id', shopId)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', `${date}T00:00:00`)
      .lte('scheduled_at', `${date}T23:59:59`);

    const bookedTimes = new Set(booked?.map((b) => b.scheduled_at));

    // Filter out break slots
    const { data: breaks } = await this.supabase
      .from('breaks')
      .select('*')
      .eq('shop_id', shopId)
      .lte('start_datetime', `${date}T23:59:59`)
      .gte('end_datetime', `${date}T00:00:00`);

    const available = slots.filter((slot) => {
      if (bookedTimes.has(slot)) return false;
      const slotTime = new Date(slot).getTime();
      return !breaks?.some((b) => {
        const bStart = new Date(b.start_datetime).getTime();
        const bEnd = new Date(b.end_datetime).getTime();
        return slotTime >= bStart && slotTime < bEnd;
      });
    });

    return { slots: available, total: available.length, date };
  }
}
