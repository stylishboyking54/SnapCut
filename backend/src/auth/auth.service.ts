import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async register(
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'barber' | 'salon' = 'customer',
  ) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });

    if (error) throw error;

    await this.supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      role,
    });

    // Auto sign-in after register
    return this.login(email, password);
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
      profile: profile || {
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name || email,
        role: data.user.user_metadata?.role || 'customer',
      },
    };
  }

  async logout(token: string) {
    await this.supabase.auth.admin.signOut(token);
    return { message: 'Logged out successfully' };
  }

  /**
   * Sync a Supabase OAuth session into our profiles table.
   * Always honor the role picked in this sign-in (Google often creates the
   * profile as customer via trigger before we get here).
   * Never demote admin.
   */
  async setAvatar(userId: string, image: string) {
    if (!image) {
      const { error } = await this.supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
      if (error) throw new BadRequestException(error.message || 'Could not remove the photo');
      return { avatar_url: null };
    }

    const match = image.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) throw new BadRequestException('Choose a photo from your phone or computer');
    const buffer = Buffer.from(match[1].replace(/\s/g, ''), 'base64');
    if (!buffer.length || buffer.length > 1_500_000) {
      throw new BadRequestException('That photo is too large. Try another one.');
    }

    const bucket = 'avatars';
    const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
    if (listError) throw new BadRequestException(listError.message);
    if (!buckets?.some((item) => item.name === bucket)) {
      const created = await this.supabase.storage.createBucket(bucket, { public: true });
      if (created.error && !/already exists/i.test(created.error.message)) {
        throw new BadRequestException(created.error.message);
      }
    }

    const path = `${userId}.jpg`;
    const uploaded = await this.supabase.storage.from(bucket).upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (uploaded.error) throw new BadRequestException(uploaded.error.message);

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    const avatar_url = `${data.publicUrl}?v=${Date.now()}`;
    const { error } = await this.supabase.from('profiles').update({ avatar_url }).eq('id', userId);
    if (error) throw new BadRequestException(error.message || 'Could not save the photo');
    return { avatar_url };
  }

  async updateProfile(userId: string, dto: { full_name?: string; phone?: string }) {
    const patch: { full_name?: string; phone?: string | null } = {};
    if (typeof dto.full_name === 'string' && dto.full_name.trim()) {
      patch.full_name = dto.full_name.trim();
    }
    if (typeof dto.phone === 'string') {
      patch.phone = dto.phone.trim() || null;
    }
    if (!Object.keys(patch).length) {
      throw new BadRequestException('Add a name or phone number');
    }
    const { data, error } = await this.supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message || 'Could not save your profile');
    return data;
  }

  async setRole(userId: string, role: 'customer' | 'barber' | 'salon') {
    const { data: existing } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existing?.role === 'admin') return existing;

    const { data, error } = await this.supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message || 'Could not save your role');
    return data;
  }

  async syncOAuth(
    accessToken: string,
    role?: 'customer' | 'barber' | 'salon',
  ) {
    const { data, error } = await this.supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      throw new UnauthorizedException(error?.message || 'Invalid session');
    }

    const user = data.user;
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'SnapCut User';
    const avatarUrl =
      user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    const { data: existing } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const isNew = !existing;

    // Keep whatever role is already in the DB; only override if a new role was explicitly passed.
    // Never demote admin. Never reset an existing barber/salon to customer.
    const existingRole = existing?.role as string | undefined;
    let nextRole: string;
    if (existingRole === 'admin') {
      nextRole = 'admin';
    } else if (role) {
      // Caller explicitly chose a role (e.g. first-time Google sign-up)
      nextRole = role;
    } else {
      // Returning user — preserve whatever they already are
      nextRole = existingRole || 'customer';
    }

    const { data: profile, error: upsertErr } = await this.supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: existing?.full_name || fullName,
        role: nextRole,
        avatar_url: existing?.avatar_url || avatarUrl,
      })
      .select()
      .single();

    if (upsertErr) {
      throw new BadRequestException(upsertErr.message || 'Could not sync profile');
    }

    await this.supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, full_name: fullName, role: nextRole },
    });

    return {
      access_token: accessToken,
      is_new: isNew,
      user,
      profile: profile || {
        id: user.id,
        full_name: fullName,
        role: nextRole,
        avatar_url: avatarUrl,
      },
    };
  }
}
