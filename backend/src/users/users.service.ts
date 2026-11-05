import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';

@Injectable()
export class UsersService {
  constructor(@Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient) {}

  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  }

  async updateProfile(userId: string, dto: { full_name?: string; phone?: string; avatar_url?: string }) {
    const { data, error } = await this.supabase
      .from('profiles').update(dto).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  }
}
