import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';

@Injectable()
export class AdminService {
  constructor(@Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient) {}

  async getAllShops() {
    try {
      const { data, error } = await this.supabase
        .from('shops')
        .select('*, profiles!owner_id(full_name, avatar_url, phone)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getAllShops Supabase error:', error);
        throw error;
      }
      return data || [];
    } catch (err: any) {
      console.error('AdminService.getAllShops failed:', err);
      throw new InternalServerErrorException(err.message || 'Could not load shops');
    }
  }

  async getAllUsers() {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getAllUsers Supabase error:', error);
        throw error;
      }

      // Try to enrich with real emails from Supabase auth.admin if available
      try {
        const { data: authData } = await this.supabase.auth.admin.listUsers({
          perPage: 1000,
        });
        if (authData?.users?.length) {
          const emailMap = new Map<string, string>();
          for (const u of authData.users) {
            if (u.email) emailMap.set(u.id, u.email);
          }
          return (data || []).map((p) => ({
            ...p,
            email: emailMap.get(p.id) || p.phone || 'No email on file',
          }));
        }
      } catch (authErr) {
        console.warn('Could not list auth users for emails:', authErr);
      }

      return data || [];
    } catch (err: any) {
      console.error('AdminService.getAllUsers failed:', err);
      throw new InternalServerErrorException(err.message || 'Could not load users');
    }
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
