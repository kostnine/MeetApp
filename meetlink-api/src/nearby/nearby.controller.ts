import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { NearbyQueryDto, UpsertLocationDto } from './dto';
import { NearbyService } from './nearby.service';

@Controller('nearby')
export class NearbyController {
  constructor(private readonly nearby: NearbyService) {}

  @Post('location')
  @UseGuards(AdminGuard)
  upsertLocation(@Req() request: AuthenticatedRequest, @Body() dto: UpsertLocationDto) {
    return this.nearby.upsertLocation(dto, request.user?.profileId);
  }

  @Get()
  @UseGuards(AdminGuard)
  findNearby(@Req() request: AuthenticatedRequest, @Query() query: NearbyQueryDto) {
    return this.nearby.findNearby(query, request.user?.nickname);
  }
}
