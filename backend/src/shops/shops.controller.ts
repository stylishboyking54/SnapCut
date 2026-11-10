import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Req, ParseFloatPipe, DefaultValuePipe, Inject,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ShopsService } from './shops.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';

@Controller('shops')
export class ShopsController {
  constructor(
    private readonly shopsService: ShopsService,
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  @Get()
  findAll(
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('shop_type') shopType?: string,
  ) {
    return this.shopsService.findAll({ city, search, shopType });
  }

  @Get('nearby')
  findNearby(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radius', new DefaultValuePipe(10), ParseFloatPipe) radius: number,
  ) {
    return this.shopsService.findNearby(lat, lng, radius);
  }

  /** Owner's shop — must stay above :id */
  @Get('mine')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('barber', 'salon')
  findMine(@Req() req: any) {
    return this.shopsService.findMine(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }

  @Get(':id/queue')
  getQueue(@Param('id') id: string) {
    return this.shopsService.getLiveQueue(id);
  }

  @Post(':id/join')
  async joinQueue(
    @Param('id') id: string,
    @Body() body: { service_id?: string; customer_name?: string; notes?: string },
    @Req() req: any,
  ) {
    let customerId: string | undefined;
    const header = req.headers?.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const { data } = await this.supabase.auth.getUser(token);
      customerId = data.user?.id;
    }
    return this.shopsService.joinQueue(id, { ...(body || {}), customer_id: customerId });
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('barber', 'salon')
  create(@Req() req: any, @Body() dto: any) {
    const role = req.user?.role === 'salon' ? 'salon' : 'barber';
    return this.shopsService.create(req.user.id, { ...dto, shop_type: dto?.shop_type || role });
  }

  @Post(':id/photos')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('barber', 'salon')
  addPhoto(@Param('id') id: string, @Req() req: any, @Body() body: { image?: string }) {
    return this.shopsService.addPhoto(id, req.user.id, body?.image || '');
  }

  @Delete(':id/photos')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('barber', 'salon')
  removePhoto(@Param('id') id: string, @Req() req: any, @Body() body: { url?: string }) {
    return this.shopsService.removePhoto(id, req.user.id, body?.url || '');
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('barber', 'salon')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.shopsService.update(id, req.user.id, dto);
  }

  @Patch(':id/emergency')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('barber', 'salon')
  toggleEmergency(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { is_emergency: boolean; reason?: string },
  ) {
    return this.shopsService.toggleEmergency(id, req.user.id, body.is_emergency, body.reason);
  }
}
