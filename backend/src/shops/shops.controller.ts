import {
  Controller, Get, Post, Patch, Body, Param, Query,
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
  ) {
    return this.shopsService.findAll({ city, search });
  }

  @Get('nearby')
  findNearby(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radius', new DefaultValuePipe(10), ParseFloatPipe) radius: number,
  ) {
    return this.shopsService.findNearby(lat, lng, radius);
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
  @Roles('barber')
  create(@Req() req: any, @Body() dto: any) {
    return this.shopsService.create(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('barber')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.shopsService.update(id, req.user.id, dto);
  }

  @Patch(':id/emergency')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('barber')
  toggleEmergency(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { is_emergency: boolean; reason?: string },
  ) {
    return this.shopsService.toggleEmergency(id, req.user.id, body.is_emergency, body.reason);
  }
}
