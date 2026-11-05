import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';

@Injectable()
export class AdminService {
  constructor(@Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient) {}

  async getAllShops() {
    const { data, error } = await this.supabase
      .from('shops').select('*, profiles!owner_id(full_name, email)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getAllUsers() {
    const { data, error } = await this.supabase
      .from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async verifyShop(shopId: string) {
    const { data, error } = await this.supabase
      .from('shops').update({ is_verified: true }).eq('id', shopId).select().single();
    if (error) throw error;
    return data;
  }
}
