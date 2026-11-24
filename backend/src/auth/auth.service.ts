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
    if (!password || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim(), role },
    });

    if (error) {
      if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('exists')) {
        throw new BadRequestException('An account with this email already exists. Please sign in instead.');
      }
      throw new BadRequestException(error.message || 'Could not create account');
    }

    await this.supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName.trim(),
      role,
    });

    // Auto sign-in after register
    return this.login(normalizedEmail, password);
  }

  async login(email: string, password: string) {
    if (!password || password.length < 6) {
      throw new UnauthorizedException('Password must be at least 6 characters long');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      if (error.message?.toLowerCase().includes('invalid') || error.message?.toLowerCase().includes('credentials')) {
        throw new UnauthorizedException('Incorrect email or password. Please try again.');
      }
      throw new UnauthorizedException(error.message || 'Incorrect email or password');
    }

    if (!data.user || !data.session) {
      throw new UnauthorizedException('Could not create session. Please try again.');
    }

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
        full_name: data.user.user_metadata?.full_name || normalizedEmail,
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

    // Mark that they chose a role so Google sign-in does not ask again or demote them.
    await this.supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role, role_picked: true },
    });

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
    const existingRole = existing?.role as string | undefined;
    const alreadyPicked = Boolean(user.user_metadata?.role_picked);

    // Never demote admin / barber / salon. Only set a new role when explicitly passed
    // and it does not wipe a pro account down to customer.
    let nextRole: string;
    if (existingRole === 'admin') {
      nextRole = 'admin';
    } else if (existingRole === 'barber' || existingRole === 'salon') {
      nextRole =
        role === 'barber' || role === 'salon' ? role : existingRole;
    } else if (role) {
      nextRole = role;
    } else {
      nextRole = existingRole || 'customer';
    }

    // If they already own a shop but the role was wiped to customer, put the pro role back.
    if (nextRole === 'customer' && !role) {
      const { data: owned } = await this.supabase
        .from('shops')
        .select('shop_type')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();
      if (owned) {
        nextRole = owned.shop_type === 'salon' ? 'salon' : 'barber';
      }
    }

    // Fresh Google accounts (or auto-created customer profiles) still need Who are you?
    const userCreatedMs = new Date(user.created_at).getTime();
    const profileCreatedMs = existing?.created_at
      ? new Date(existing.created_at).getTime()
      : userCreatedMs;
    const freshlyCreated =
      isNew || Math.abs(userCreatedMs - profileCreatedMs) < 5 * 60 * 1000;
    const needsRolePick =
      !alreadyPicked &&
      !role &&
      freshlyCreated &&
      (!existingRole || existingRole === 'customer');

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
      user_metadata: {
        ...user.user_metadata,
        full_name: fullName,
        role: nextRole,
        ...(role || alreadyPicked ? { role_picked: true } : {}),
      },
    });

    return {
      access_token: accessToken,
      is_new: isNew || needsRolePick,
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
