import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { DbService } from '../db/db.service';
import { RegisterDto } from './dto';
import { AuthTokenPayload, UserRole } from './auth.types';
import { resolveJwtSecret } from './jwt-secret';

interface UserRow {
  id: string;
  profile_id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: UserRole;
  nickname: string;
  name: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DbService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const nickname = this.normalizeNickname(dto.nickname);
    const name = dto.name?.trim() || nickname;
    const password = this.hashPassword(dto.password);

    try {
      const result = await this.db.query<UserRow>(
        `with created_profile as (
           insert into profiles (nickname, name, bio, status, show_on_map)
           values ($1, $2, $3, 'online', false)
           returning id, nickname, name
         ),
         created_user as (
           insert into app_users (profile_id, email, password_hash, password_salt, role)
           select id, $4, $5, $6, 'user'
           from created_profile
           returning id, profile_id, email, password_hash, password_salt, role
         )
         select
           u.id,
           u.profile_id,
           u.email,
           u.password_hash,
           u.password_salt,
           u.role,
           p.nickname,
           p.name
         from created_user u
         join created_profile p on p.id = u.profile_id`,
        [nickname, name, null, email, password.hash, password.salt],
      );

      return this.issueSession(result.rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Email or nickname is already taken');
      }

      throw error;
    }
  }

  async login(identifier: string | undefined, password: string) {
    if (identifier?.trim()) {
      return this.loginUser(identifier, password);
    }

    return this.loginLegacyAdmin(password);
  }

  verify(token: string): AuthTokenPayload | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret());

      if (typeof payload === 'string') {
        return null;
      }

      if (payload.role !== 'admin' && payload.role !== 'user') {
        return null;
      }

      return payload as AuthTokenPayload;
    } catch {
      return null;
    }
  }

  private async loginUser(identifier: string, password: string) {
    const normalized = identifier.trim().toLowerCase().replace(/^@/, '');
    const result = await this.db.query<UserRow>(
      `select
         u.id,
         u.profile_id,
         u.email,
         u.password_hash,
         u.password_salt,
         u.role,
         p.nickname,
         p.name
       from app_users u
       join profiles p on p.id = u.profile_id
       where lower(u.email) = $1 or lower(p.nickname) = $1
       limit 1`,
      [normalized],
    );

    const user = result.rows[0];
    if (!user || !this.verifyPassword(password, user.password_salt, user.password_hash)) {
      throw new UnauthorizedException('Wrong login or password');
    }

    return this.issueSession(user);
  }

  private async loginLegacyAdmin(password: string) {
    const expectedPassword = this.config.get<string>('ADMIN_PASSWORD') || this.config.get<string>('ADMIN_TOKEN');

    if (!expectedPassword || password !== expectedPassword) {
      throw new UnauthorizedException('Wrong login or password');
    }

    const profileResult = await this.db.query<{ id: string; nickname: string; name: string | null }>(
      `select id, nickname, name
       from profiles
       where is_admin = true
       order by created_at asc
       limit 1`,
    );
    const profile = profileResult.rows[0];
    const nickname = profile?.nickname || this.adminNickname();

    const payload: AuthTokenPayload = {
      role: 'admin',
      profileId: profile?.id,
      nickname,
    };

    return {
      token: jwt.sign(payload, this.jwtSecret(), { expiresIn: '7d' }),
      user: {
        role: 'admin',
        profileId: profile?.id,
        nickname,
        name: profile?.name || nickname,
      },
      expiresIn: '7d',
    };
  }

  private issueSession(user: UserRow) {
    const payload: AuthTokenPayload = {
      role: user.role,
      userId: user.id,
      profileId: user.profile_id,
      nickname: user.nickname,
      email: user.email,
    };

    return {
      token: jwt.sign(payload, this.jwtSecret(), { expiresIn: '7d' }),
      user: {
        id: user.id,
        profileId: user.profile_id,
        role: user.role,
        nickname: user.nickname,
        name: user.name || user.nickname,
        email: user.email,
      },
      expiresIn: '7d',
    };
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 120_000, 32, 'sha256').toString('hex');

    return { salt, hash };
  }

  private verifyPassword(password: string, salt: string, hash: string) {
    const candidate = pbkdf2Sync(password, salt, 120_000, 32, 'sha256');
    const stored = Buffer.from(hash, 'hex');

    return stored.length === candidate.length && timingSafeEqual(stored, candidate);
  }

  private normalizeNickname(nickname: string) {
    return nickname.trim().replace(/^@/, '').toLowerCase();
  }

  private jwtSecret() {
    return resolveJwtSecret(this.config);
  }

  private adminNickname() {
    return this.config.get<string>('ADMIN_NICKNAME') || 'kostnine';
  }
}
