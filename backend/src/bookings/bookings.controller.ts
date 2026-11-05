import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('bookings')
@UseGuards(SupabaseAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  getMyBookings(@Req() req: any) {
    return this.bookingsService.getMyBookings(req.user.id);
  }

  @Get('shop/:shopId')
  @UseGuards(RolesGuard)
  @Roles('barber', 'admin')
  getShopBookings(@Param('shopId') shopId: string, @Req() req: any) {
    return this.bookingsService.getShopBookings(shopId, req.user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('customer')
  create(@Req() req: any, @Body() dto: any) {
    return this.bookingsService.create(req.user.id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { status: string },
  ) {
    return this.bookingsService.updateStatus(id, req.user.id, body.status, req.user.role);
  }

  @Patch(':id/shift')
  @UseGuards(RolesGuard)
  @Roles('barber')
  shiftBooking(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { scheduled_at: string },
  ) {
    return this.bookingsService.shiftBooking(id, req.user.id, body.scheduled_at);
  }
}
