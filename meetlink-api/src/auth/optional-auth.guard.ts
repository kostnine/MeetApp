import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthTokenPayload } from './auth.types';

/**
 * Populates request.user when a valid bearer token is present, but NEVER rejects.
 * Use for endpoints that work anonymously yet want to link a signed-in actor —
 * e.g. replying to a request link while logged in (so the chat links to the
 * responder's real profile instead of an anonymous "Someone").
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
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
        }
      } catch {
        // Invalid/expired token — fall through and treat the caller as anonymous.
      }
    }

    return true;
  }
}
