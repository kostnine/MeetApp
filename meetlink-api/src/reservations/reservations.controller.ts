import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  create(@Body() dto: CreateReservationDto) {
    return this.reservations.create(dto);
  }

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() request: AuthenticatedRequest, @Query('status') status?: string) {
    return this.reservations.listForOwner(request.user?.profileId, status);
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.reservations.updateStatus(id, dto.status, request.user?.profileId);
  }
}
