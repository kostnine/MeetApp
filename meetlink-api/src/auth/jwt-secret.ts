import { ConfigService } from '@nestjs/config';

/** The public placeholder secret — only ever acceptable for local development. */
export const INSECURE_DEFAULT_JWT_SECRET = 'meetlink-dev-secret-change-me';

/**
 * Single source of truth for the secret used to sign + verify auth JWTs.
 * Resolves ADMIN_JWT_SECRET (preferred) or ADMIN_TOKEN. In production we REFUSE to fall
 * back to the public default — otherwise anyone could forge admin/user tokens and bypass
 * every authorization check. In non-production the default keeps local runs zero-config.
 */
export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('ADMIN_JWT_SECRET') || config.get<string>('ADMIN_TOKEN');
  if (secret && secret !== INSECURE_DEFAULT_JWT_SECRET) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_JWT_SECRET (or ADMIN_TOKEN) must be set to a real secret in production — ' +
        'refusing to sign/verify JWTs with the public default secret.',
    );
  }

  return INSECURE_DEFAULT_JWT_SECRET;
}
