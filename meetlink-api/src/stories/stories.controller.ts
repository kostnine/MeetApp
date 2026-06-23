import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CreateStoryDto } from './dto';
import { StoriesService } from './stories.service';

@Controller('stories')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Get('nearby')
  @UseGuards(AdminGuard)
  nearby(@Req() request: AuthenticatedRequest) {
    return this.stories.listNearby(request.user?.profileId);
  }

  @Get('mine')
  @UseGuards(AdminGuard)
  mine(@Req() request: AuthenticatedRequest) {
    return this.stories.listMine(request.user?.profileId);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateStoryDto) {
    return this.stories.create(dto, request.user?.profileId);
  }
}
