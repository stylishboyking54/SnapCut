import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SupabaseAuthGuard } from './supabase-auth.guard';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
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
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}

class AvatarDto {
  @IsString()
  image: string;
}

class ProfileDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
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
    // Pass undefined when no role is supplied so syncOAuth preserves the existing role
    return this.authService.syncOAuth(token, dto.role || undefined);
  }

  @Post('role')
  @UseGuards(SupabaseAuthGuard)
  setRole(@Req() req: any, @Body() dto: OAuthSyncDto) {
    if (!dto.role) throw new UnauthorizedException('Pick customer, barber, or salon');
    return this.authService.setRole(req.user.id, dto.role);
  }

  @Post('avatar')
  @UseGuards(SupabaseAuthGuard)
  setAvatar(@Req() req: any, @Body() dto: AvatarDto) {
    return this.authService.setAvatar(req.user.id, dto.image);
  }

  @Post('profile')
  @UseGuards(SupabaseAuthGuard)
  updateProfile(@Req() req: any, @Body() dto: ProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post('logout')
  @UseGuards(SupabaseAuthGuard)
  logout(@Req() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    return this.authService.logout(token);
  }
}
