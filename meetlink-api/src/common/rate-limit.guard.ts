import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Type,
  mixin,
} from '@nestjs/common';

/**
 * Lightweight, dependency-free per-IP rate limiter (sliding window, in-memory).
 * Used to blunt brute-force enumeration / spam on public endpoints (e.g. guessing
 * request-link codes, password guessing). Single-instance scope is fine for this deploy.
 *
 * Usage: `@UseGuards(RateLimit(60, 60_000))` — max 60 requests / 60s per client IP.
 */
export function RateLimit(limit: number, windowMs: number): Type<CanActivate> {
  @Injectable()
  class RateLimitGuard implements CanActivate {
    private readonly hits = new Map<string, number[]>();

    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      const fwd = req.headers?.['x-forwarded-for'];
      const ip =
        (Array.isArray(fwd) ? fwd[0] : String(fwd || '')).split(',')[0].trim() ||
        req.ip ||
        'unknown';
      const now = Date.now();
      const recent = (this.hits.get(ip) || []).filter((t) => now - t < windowMs);

      if (recent.length >= limit) {
        throw new HttpException('Too many requests — slow down.', HttpStatus.TOO_MANY_REQUESTS);
      }

      recent.push(now);
      this.hits.set(ip, recent);

      // Opportunistic cleanup so the map can't grow unbounded.
      if (this.hits.size > 10_000) {
        for (const [key, times] of this.hits) {
          if (!times.some((t) => now - t < windowMs)) this.hits.delete(key);
        }
      }

      return true;
    }
  }

  return mixin(RateLimitGuard);
}
