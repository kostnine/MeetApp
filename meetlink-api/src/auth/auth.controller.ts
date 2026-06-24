import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { AuthenticatedRequest } from './auth.types';
import { RateLimit } from '../common/rate-limit.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseGuards(RateLimit(15, 60_000))
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // Rate-limited to blunt password guessing (generous enough for normal + guest login).
  @Post('login')
  @UseGuards(RateLimit(20, 60_000))
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
