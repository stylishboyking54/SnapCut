import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('shops')
  getAllShops() {
    return this.adminService.getAllShops();
  }

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('shops/:id/verify')
  verifyShop(@Param('id') id: string) {
    return this.adminService.verifyShop(id);
  }

  @Patch('shops/:id/unverify')
  unverifyShop(@Param('id') id: string) {
    return this.adminService.unverifyShop(id);
  }

  @Patch('shops/:id/emergency')
  toggleShopEmergency(
    @Param('id') id: string,
    @Body('is_emergency') isEmergency: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.toggleShopEmergency(id, Boolean(isEmergency), reason);
  }

  @Delete('shops/:id')
  deleteShop(@Param('id') id: string) {
    return this.adminService.deleteShop(id);
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(id, role);
  }

  @Patch('users/:id/ban')
  toggleUserBan(@Param('id') id: string, @Body('is_banned') isBanned: boolean) {
    return this.adminService.toggleUserBan(id, Boolean(isBanned));
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('broadcast')
  broadcast(
    @Body() dto: { target: 'all' | 'barbers' | 'customers'; title?: string; message: string },
  ) {
    return this.adminService.broadcast(dto);
  }
}
