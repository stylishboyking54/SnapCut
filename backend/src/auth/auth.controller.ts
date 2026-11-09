import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SupabaseAuthGuard } from './supabase-auth.guard';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  full_name: string;

  @IsEnum(['customer', 'barber', 'salon'])
  role: 'customer' | 'barber' | 'salon';
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

class OAuthSyncDto {
  @IsOptional()
  @IsEnum(['customer', 'barber', 'salon'])
  role?: 'customer' | 'barber' | 'salon';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.full_name, dto.role);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /** After Google (or other) OAuth — Bearer token required */
  @Post('oauth')
  async oauth(@Req() req: any, @Body() dto: OAuthSyncDto) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('Missing access token');
    return this.authService.syncOAuth(token, dto.role || 'customer');
  }

  @Post('logout')
  @UseGuards(SupabaseAuthGuard)
  logout(@Req() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    return this.authService.logout(token);
  }
}
