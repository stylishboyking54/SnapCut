import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ServicesService } from './services.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('shops/:shopId/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  getByShop(@Param('shopId') shopId: string) {
    return this.servicesService.getByShop(shopId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('barber')
  create(@Param('shopId') shopId: string, @Body() dto: any) {
    return this.servicesService.create(shopId, dto);
  }

  @Delete(':serviceId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('barber')
  remove(@Param('shopId') shopId: string, @Param('serviceId') serviceId: string) {
    return this.servicesService.remove(serviceId, shopId);
  }
}
