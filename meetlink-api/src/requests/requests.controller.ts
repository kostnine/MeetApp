import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { RateLimit } from '../common/rate-limit.guard';
import { CreateMeetRequestDto, RespondToMeetRequestDto } from './dto';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateMeetRequestDto) {
    return this.requests.create(dto, request.user?.profileId);
  }

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() request: AuthenticatedRequest) {
    return this.requests.listForOwner(request.user?.profileId);
  }

  // Public lookup — rate-limited so the short codes can't be brute-force enumerated.
  @Get(':code')
  @UseGuards(RateLimit(60, 60_000))
  find(@Param('code') code: string) {
    return this.requests.findPublicByCode(code);
  }

  @Post(':code/responses')
  @UseGuards(OptionalAuthGuard, RateLimit(20, 60_000))
  respond(
    @Req() request: AuthenticatedRequest,
    @Param('code') code: string,
    @Body() dto: RespondToMeetRequestDto,
  ) {
    return this.requests.respond(code, dto, request.user?.profileId);
  }
}
