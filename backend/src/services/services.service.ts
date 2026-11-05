import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';

@Injectable()
export class ServicesService {
  constructor(@Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient) {}

  async getByShop(shopId: string) {
    const { data, error } = await this.supabase
      .from('services').select('*').eq('shop_id', shopId).order('price');
    if (error) throw error;
    return data;
  }

  async create(shopId: string, dto: { name: string; duration: number; price: number }) {
    const { data, error } = await this.supabase
      .from('services').insert({ ...dto, shop_id: shopId }).select().single();
    if (error) throw error;
    return data;
  }

  async remove(serviceId: string, shopId: string) {
    const { error } = await this.supabase
      .from('services').delete().eq('id', serviceId).eq('shop_id', shopId);
    if (error) throw error;
    return { message: 'Service removed' };
  }
}
