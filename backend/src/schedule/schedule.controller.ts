import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScheduleService } from './schedule.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('shops/:shopId')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // Public: get working hours
  @Get('hours')
  getHours(@Param('shopId') shopId: string) {
    return this.scheduleService.getWorkingHours(shopId);
  }

  // Public: get available slots for a date
  @Get('availability')
  getAvailability(
    @Param('shopId') shopId: string,
    @Query('date') date: string,
  ) {
    return this.scheduleService.getAvailableSlots(shopId, date);
  }

  // Public: get breaks
  @Get('breaks')
  getBreaks(@Param('shopId') shopId: string) {
    return this.scheduleService.getBreaks(shopId);
  }

  // Barber: set working hours
  @Post('hours')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('barber', 'salon')
  setHours(@Param('shopId') shopId: string, @Body() body: { hours: any[] }) {
    return this.scheduleService.setWorkingHours(shopId, body.hours);
  }

  // Barber: add break
  @Post('breaks')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('barber', 'salon')
  addBreak(@Param('shopId') shopId: string, @Body() dto: any) {
    return this.scheduleService.addBreak(shopId, dto);
  }

  // Barber: remove break
  @Delete('breaks/:breakId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('barber', 'salon')
  removeBreak(@Param('shopId') shopId: string, @Param('breakId') breakId: string) {
    return this.scheduleService.removeBreak(shopId, breakId);
  }
}
