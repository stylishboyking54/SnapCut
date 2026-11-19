import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';

@Injectable()
export class AdminService {
  constructor(@Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient) {}

  async getAllShops() {
    const { data, error } = await this.supabase
      .from('shops')
      .select('*, profiles!owner_id(full_name, email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getAllUsers() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async verifyShop(shopId: string) {
    const { data, error } = await this.supabase
      .from('shops')
      .update({ is_verified: true })
      .eq('id', shopId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateUserRole(userId: string, role: string) {
    const validRoles = ['customer', 'barber', 'salon', 'admin'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException(
        `Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}`,
      );
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message || 'Could not update user role');
    }
    if (!data) {
      throw new NotFoundException('User profile not found');
    }

    return data;
  }
}
