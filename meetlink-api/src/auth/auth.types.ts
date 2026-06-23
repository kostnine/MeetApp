import { JwtPayload } from 'jsonwebtoken';

export type UserRole = 'admin' | 'user';

export interface AuthTokenPayload extends JwtPayload {
  role: UserRole;
  userId?: string;
  profileId?: string;
  nickname: string;
  email?: string;
}

export interface AuthenticatedRequest {
  headers: Record<string, string | undefined>;
  user?: AuthTokenPayload;
}
