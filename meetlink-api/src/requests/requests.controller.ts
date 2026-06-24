import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
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

  @Get(':code')
  find(@Param('code') code: string) {
    return this.requests.findByCode(code);
  }

  @Post(':code/responses')
  @UseGuards(OptionalAuthGuard)
  respond(
    @Req() request: AuthenticatedRequest,
    @Param('code') code: string,
    @Body() dto: RespondToMeetRequestDto,
  ) {
    return this.requests.respond(code, dto, request.user?.profileId);
  }
}
