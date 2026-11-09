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
   * New users get the chosen role; existing users keep their profile role.
   */
  async syncOAuth(
    accessToken: string,
    role: 'customer' | 'barber' | 'salon' = 'customer',
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
      'Snapcut User';
    const avatarUrl =
      user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    const { data: existing } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    let profile = existing;

    if (!existing) {
      const { data: created, error: createErr } = await this.supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          role,
          avatar_url: avatarUrl,
        })
        .select()
        .single();
      if (createErr) {
        throw new BadRequestException(createErr.message || 'Could not create profile');
      }
      profile = created;

      await this.supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, full_name: fullName, role },
      });
    } else if (!existing.avatar_url && avatarUrl) {
      const { data: updated } = await this.supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)
        .select()
        .single();
      if (updated) profile = updated;
    }

    return {
      access_token: accessToken,
      user,
      profile: profile || {
        id: user.id,
        full_name: fullName,
        role: existing?.role || role,
        avatar_url: avatarUrl,
      },
    };
  }
}
