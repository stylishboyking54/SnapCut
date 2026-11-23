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
        .select('*, profiles!owner_id(full_name, avatar_url, phone), services(id, name, price)')
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

      // Try to enrich with real emails and ban status from Supabase auth.admin
      try {
        const { data: authData } = await this.supabase.auth.admin.listUsers({
          perPage: 1000,
        });
        if (authData?.users?.length) {
          const authMap = new Map<string, any>();
          for (const u of authData.users) {
            authMap.set(u.id, u);
          }
          return (data || []).map((p) => {
            const authUser = authMap.get(p.id);
            const isBanned = Boolean(
              authUser?.banned_until ||
                authUser?.app_metadata?.is_banned ||
                authUser?.user_metadata?.is_banned,
            );
            return {
              ...p,
              email: authUser?.email || p.phone || 'No email on file',
              is_banned: isBanned,
            };
          });
        }
      } catch (authErr) {
        console.warn('Could not list auth users for emails/bans:', authErr);
      }

      return (data || []).map((p) => ({ ...p, is_banned: false }));
    } catch (err: any) {
      console.error('AdminService.getAllUsers failed:', err);
      throw new InternalServerErrorException(err.message || 'Could not load users');
    }
  }

  async verifyShop(shopId: string) {
    const { data: shop, error } = await this.supabase
      .from('shops')
      .update({ is_verified: true })
      .eq('id', shopId)
      .select('*, profiles!owner_id(full_name, phone)')
      .single();

    if (error) throw new BadRequestException(error.message);

    // Notify owner
    if (shop?.owner_id) {
      try {
        await this.supabase.from('notifications').insert({
          user_id: shop.owner_id,
          type: 'system_broadcast',
          message: `🎉 Congratulations! "${shop.name}" has been verified and is now live to all customers on SnapCut.`,
        });
      } catch (notifErr) {
        console.warn('Failed to send verification notification:', notifErr);
      }
    }

    return shop;
  }

  async unverifyShop(shopId: string) {
    const { data: shop, error } = await this.supabase
      .from('shops')
      .update({ is_verified: false })
      .eq('id', shopId)
      .select('*, profiles!owner_id(full_name, phone)')
      .single();

    if (error) throw new BadRequestException(error.message);

    // Notify owner
    if (shop?.owner_id) {
      try {
        await this.supabase.from('notifications').insert({
          user_id: shop.owner_id,
          type: 'system_broadcast',
          message: `⚠️ Notice: "${shop.name}" has been placed in pending review status by an administrator. Please ensure your shop details are up to date.`,
        });
      } catch (notifErr) {
        console.warn('Failed to send unverify notification:', notifErr);
      }
    }

    return shop;
  }

  async toggleShopEmergency(shopId: string, isEmergency: boolean, reason?: string) {
    const { data, error } = await this.supabase
      .from('shops')
      .update({
        is_emergency: isEmergency,
        emergency_reason: reason || (isEmergency ? 'Queue paused by Administrator' : null),
        resume_at: null,
      })
      .eq('id', shopId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteShop(shopId: string) {
    // Delete associated data first to maintain referential integrity
    try {
      await this.supabase.from('bookings').delete().eq('shop_id', shopId);
      await this.supabase.from('services').delete().eq('shop_id', shopId);
      await this.supabase.from('working_hours').delete().eq('shop_id', shopId);
      await this.supabase.from('breaks').delete().eq('shop_id', shopId);
    } catch (e) {
      console.warn('Non-fatal error cleaning related shop records:', e);
    }

    const { error } = await this.supabase.from('shops').delete().eq('id', shopId);
    if (error) {
      throw new BadRequestException(error.message || 'Could not delete shop');
    }
    return { success: true, message: 'Shop and related records successfully deleted' };
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

  async toggleUserBan(userId: string, isBanned: boolean) {
    try {
      const { data, error } = await this.supabase.auth.admin.updateUserById(userId, {
        app_metadata: { is_banned: isBanned },
        user_metadata: { is_banned: isBanned },
        ban_duration: isBanned ? '876600h' : 'none',
      });
      if (error) throw new BadRequestException(error.message);
      return { success: true, is_banned: isBanned, user: data.user };
    } catch (err: any) {
      console.error('toggleUserBan error:', err);
      throw new BadRequestException(err.message || 'Could not update user ban status');
    }
  }

  async deleteUser(userId: string) {
    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);
      if (error) {
        // Fallback: delete from profiles table
        await this.supabase.from('profiles').delete().eq('id', userId);
      }
      return { success: true, message: 'User deleted' };
    } catch (err: any) {
      console.error('deleteUser error:', err);
      throw new BadRequestException(err.message || 'Could not delete user');
    }
  }

  async broadcast(dto: { target: 'all' | 'barbers' | 'customers'; title?: string; message: string }) {
    if (!dto.message?.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }

    let query = this.supabase.from('profiles').select('id, role');
    if (dto.target === 'barbers') {
      query = query.in('role', ['barber', 'salon']);
    } else if (dto.target === 'customers') {
      query = query.eq('role', 'customer');
    }

    const { data: users, error } = await query;
    if (error) throw new BadRequestException(error.message);

    if (!users?.length) {
      return { success: true, recipientCount: 0 };
    }

    const titlePrefix = dto.title?.trim() ? `[${dto.title.trim()}] ` : '';
    const formattedMessage = `📢 ${titlePrefix}${dto.message.trim()}`;

    const batch = users.map((u) => ({
      user_id: u.id,
      type: 'system_broadcast',
      message: formattedMessage,
    }));

    // Insert in chunks of 100 to prevent payload limits
    for (let i = 0; i < batch.length; i += 100) {
      const slice = batch.slice(i, i + 100);
      await this.supabase.from('notifications').insert(slice);
    }

    return { success: true, recipientCount: batch.length };
  }
}
