import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';
export const SUPABASE_ADMIN = 'SUPABASE_ADMIN';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createClient(
          config.get<string>('SUPABASE_URL') || 'https://placeholder.supabase.co',
          config.get<string>('SUPABASE_ANON_KEY') || 'placeholder-anon-key',
        ),
    },
    {
      provide: SUPABASE_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createClient(
          config.get<string>('SUPABASE_URL') || 'https://placeholder.supabase.co',
          config.get<string>('SUPABASE_SERVICE_ROLE_KEY') || 'placeholder-service-key',
        ),
    },
  ],
  exports: [SUPABASE_CLIENT, SUPABASE_ADMIN],
})
export class SupabaseModule {}
