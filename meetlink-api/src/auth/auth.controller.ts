import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { AuthenticatedRequest } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.identifier, dto.password);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@Req() request: AuthenticatedRequest) {
    return {
      role: request.user?.role || 'admin',
      profileId: request.user?.profileId,
      nickname: request.user?.nickname || 'admin',
      email: request.user?.email,
    };
  }
}
