import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthTokenPayload } from './auth.types';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const legacyToken = request.headers['x-admin-token'];
    const expected = this.config.get<string>('ADMIN_TOKEN');

    if (expected && legacyToken === expected) {
      request.user = {
        role: 'admin',
        nickname: this.config.get<string>('ADMIN_NICKNAME') || 'admin',
      };
      return true;
    }

    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (bearerToken) {
      try {
        const secret = this.config.get<string>('ADMIN_JWT_SECRET')
          || this.config.get<string>('ADMIN_TOKEN')
          || 'meetlink-dev-secret-change-me';
        const payload = jwt.verify(bearerToken, secret);

        if (
          typeof payload !== 'string'
          && (payload.role === 'admin' || payload.role === 'user')
        ) {
          request.user = payload as AuthTokenPayload;
          return true;
        }
      } catch {
        throw new UnauthorizedException('Session expired');
      }
    }

    throw new UnauthorizedException('Login is required');
  }
}
