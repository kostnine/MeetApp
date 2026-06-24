import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { AddProfilePhotoDto, UpdateProfileDto, UpdateProfilePhotoDto } from './dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('me')
  @UseGuards(AdminGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.profiles.findOwnProfile(request.user?.profileId);
  }

  @Patch('me')
  @UseGuards(AdminGuard)
  updateMe(@Req() request: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.profiles.updateProfile(request.user?.profileId, dto);
  }

  @Post('me/photos')
  @UseGuards(AdminGuard)
  addPhoto(@Req() request: AuthenticatedRequest, @Body() dto: AddProfilePhotoDto) {
    return this.profiles.addProfilePhoto(request.user?.profileId, dto);
  }

  @Delete('me/photos/:id')
  @UseGuards(AdminGuard)
  deletePhoto(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.profiles.deleteProfilePhoto(request.user?.profileId, id);
  }

  @Patch('me/photos/:id')
  @UseGuards(AdminGuard)
  updatePhoto(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProfilePhotoDto,
  ) {
    return this.profiles.updateProfilePhoto(request.user?.profileId, id, dto);
  }

  // Public profile lookup — returns a contacts-free projection (IG/Telegram/phone are shared
  // only after approval, so they must never appear here).
  @Get(':nickname')
  findByNickname(@Param('nickname') nickname: string) {
    return this.profiles.findPublicByNickname(nickname.replace(/^@/, ''));
  }
}
