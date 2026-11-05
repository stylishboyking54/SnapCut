import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('shops')
  getAllShops() { return this.adminService.getAllShops(); }

  @Get('users')
  getAllUsers() { return this.adminService.getAllUsers(); }

  @Patch('shops/:id/verify')
  verifyShop(@Param('id') id: string) { return this.adminService.verifyShop(id); }
}
