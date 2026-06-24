import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthTokenPayload } from './auth.types';
import { resolveJwtSecret } from './jwt-secret';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // NOTE: the legacy `x-admin-token` shared-secret header was removed — it granted admin
    // with NO profile id (a profile-less principal that fed the fail-open queries). Auth is
    // now exclusively a verified Bearer JWT, which always carries a profileId.
    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (bearerToken) {
      try {
        const secret = resolveJwtSecret(this.config);
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
