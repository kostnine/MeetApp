import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { offloadImage } from '../common/image-storage';
import { AddProfilePhotoDto, UpdateProfileDto, UpdateProfilePhotoDto } from './dto';

export interface ProfileRow {
  id: string;
  nickname: string;
  name: string | null;
  avatar_url: string | null;
  avatar_position_x: number | null;
  avatar_position_y: number | null;
  bio: string | null;
  instagram: string | null;
  telegram: string | null;
  phone: string | null;
  city: string | null;
  area: string | null;
  status: string | null;
  show_on_map: boolean;
  visibility_radius_meters: number | null;
  age: number | null;
  interests: string[];
  approximate_location: boolean;
  messages_from_nearby: boolean;
  messages_from_requests: boolean;
  contacts_after_approval: boolean;
  allow_messages: boolean;
  photos?: ProfilePhotoRow[];
}

export interface ProfilePhotoRow {
  id: string;
  profile_id: string;
  image_url: string;
  caption: string | null;
  position_x: number | null;
  position_y: number | null;
  sort_order: number | null;
  created_at: string;
}

@Injectable()
export class ProfilesService {
  constructor(private readonly db: DbService) {}

  async findByNickname(nickname: string): Promise<ProfileRow> {
    const result = await this.db.query<ProfileRow>(
      `select id, nickname, name, avatar_url,
         coalesce(avatar_position_x, 50) as avatar_position_x,
         coalesce(avatar_position_y, 50) as avatar_position_y,
         bio, instagram, telegram, phone, city, area, status, show_on_map,
         coalesce(visibility_radius_meters, 1000) as visibility_radius_meters,
           age, coalesce(interests, '[]'::jsonb) as interests,
           coalesce(approximate_location, true) as approximate_location,
           coalesce(messages_from_nearby, true) as messages_from_nearby,
           coalesce(messages_from_requests, true) as messages_from_requests,
           coalesce(contacts_after_approval, true) as contacts_after_approval,
           coalesce(allow_messages, true) as allow_messages
       from profiles
       where nickname = $1`,
      [nickname],
    );

    const profile = result.rows[0];
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.withPhotos(profile);
  }

  // Public profile view (GET /profiles/:nickname): expose only public fields. NEVER return
  // instagram/telegram/phone — those are shared only after the owner approves someone.
  async findPublicByNickname(nickname: string) {
    const result = await this.db.query(
      `select id, nickname, name, avatar_url,
         coalesce(avatar_position_x, 50) as avatar_position_x,
         coalesce(avatar_position_y, 50) as avatar_position_y,
         bio, city, area, status, age, coalesce(interests, '[]'::jsonb) as interests
       from profiles
       where nickname = $1`,
      [nickname],
    );

    const profile = result.rows[0];
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.withPhotos(profile as ProfileRow);
  }

  async findAdminProfile(): Promise<ProfileRow> {
    const result = await this.db.query<ProfileRow>(
      `select id, nickname, name, avatar_url,
         coalesce(avatar_position_x, 50) as avatar_position_x,
         coalesce(avatar_position_y, 50) as avatar_position_y,
         bio, instagram, telegram, phone, city, area, status, show_on_map,
         coalesce(visibility_radius_meters, 1000) as visibility_radius_meters,
           age, coalesce(interests, '[]'::jsonb) as interests,
           coalesce(approximate_location, true) as approximate_location,
           coalesce(messages_from_nearby, true) as messages_from_nearby,
           coalesce(messages_from_requests, true) as messages_from_requests,
           coalesce(contacts_after_approval, true) as contacts_after_approval,
           coalesce(allow_messages, true) as allow_messages
       from profiles
       where is_admin = true
       order by created_at asc
       limit 1`,
    );

    const profile = result.rows[0];
    if (!profile) {
      throw new NotFoundException('Admin profile not found. Run migrations/001_init.sql first.');
    }

    return this.withPhotos(profile);
  }

  async findById(profileId: string): Promise<ProfileRow> {
    const result = await this.db.query<ProfileRow>(
      `select id, nickname, name, avatar_url,
         coalesce(avatar_position_x, 50) as avatar_position_x,
         coalesce(avatar_position_y, 50) as avatar_position_y,
         bio, instagram, telegram, phone, city, area, status, show_on_map,
         coalesce(visibility_radius_meters, 1000) as visibility_radius_meters,
           age, coalesce(interests, '[]'::jsonb) as interests,
           coalesce(approximate_location, true) as approximate_location,
           coalesce(messages_from_nearby, true) as messages_from_nearby,
           coalesce(messages_from_requests, true) as messages_from_requests,
           coalesce(contacts_after_approval, true) as contacts_after_approval,
           coalesce(allow_messages, true) as allow_messages
       from profiles
       where id = $1`,
      [profileId],
    );

    const profile = result.rows[0];
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.withPhotos(profile);
  }

  async findOwnProfile(profileId?: string): Promise<ProfileRow> {
    // "My profile" requires knowing who the caller is. Never silently fall back to the
    // admin profile (that let a profile-less principal read/edit the admin's profile).
    if (!profileId) throw new UnauthorizedException('A user profile is required');
    return this.findById(profileId);
  }

  async updateProfile(profileId: string | undefined, dto: UpdateProfileDto): Promise<ProfileRow> {
    const owner = await this.findOwnProfile(profileId);
    const nickname = dto.nickname?.trim().replace(/^@/, '') || owner.nickname;
    // Offload a freshly-picked avatar (base64 data-URL) to object storage; an already-stored
    // URL re-sent by the client is returned unchanged (no re-upload), undefined → keep current.
    const avatarUrl =
      dto.avatarUrl !== undefined ? await offloadImage(dto.avatarUrl, 'avatars') : owner.avatar_url;

    try {
      const result = await this.db.query<ProfileRow>(
        `update profiles
         set nickname = $2,
             name = $3,
             bio = $4,
             instagram = $5,
             telegram = $6,
             phone = $7,
             city = $8,
             area = $9,
             show_on_map = $10,
             visibility_radius_meters = $11,
             avatar_url = $12,
             avatar_position_x = $13,
             avatar_position_y = $14,
             age = coalesce($15, age),
             interests = coalesce($16::jsonb, interests),
             approximate_location = coalesce($17, approximate_location),
             messages_from_nearby = coalesce($18, messages_from_nearby),
             messages_from_requests = coalesce($19, messages_from_requests),
             contacts_after_approval = coalesce($20, contacts_after_approval),
             allow_messages = coalesce($21, allow_messages),
             updated_at = now()
         where id = $1
         returning id, nickname, name, avatar_url,
           coalesce(avatar_position_x, 50) as avatar_position_x,
           coalesce(avatar_position_y, 50) as avatar_position_y,
           bio, instagram, telegram, phone, city, area, status,
           show_on_map, coalesce(visibility_radius_meters, 1000) as visibility_radius_meters,
           age, coalesce(interests, '[]'::jsonb) as interests,
           coalesce(approximate_location, true) as approximate_location,
           coalesce(messages_from_nearby, true) as messages_from_nearby,
           coalesce(messages_from_requests, true) as messages_from_requests,
           coalesce(contacts_after_approval, true) as contacts_after_approval,
           coalesce(allow_messages, true) as allow_messages`,
        [
          owner.id,
          nickname,
          dto.name?.trim() || null,
          dto.bio?.trim() || null,
          dto.instagram?.trim() || null,
          dto.telegram?.trim() || null,
          dto.phone?.trim() || null,
          dto.city?.trim() || null,
          dto.area?.trim() || null,
          dto.showOnMap ?? owner.show_on_map,
          dto.visibilityRadiusMeters ?? owner.visibility_radius_meters ?? 1000,
          avatarUrl,
          dto.avatarPositionX ?? owner.avatar_position_x ?? 50,
          dto.avatarPositionY ?? owner.avatar_position_y ?? 50,
          dto.age ?? null,
          dto.interests ? JSON.stringify(dto.interests) : null,
          dto.approximateLocation ?? null,
          dto.messagesFromNearby ?? null,
          dto.messagesFromRequests ?? null,
          dto.contactsAfterApproval ?? null,
          dto.allowMessages ?? null,
        ],
      );

      return this.withPhotos(result.rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Nickname is already taken');
      }

      throw error;
    }
  }

  async updateAdminProfile(dto: UpdateProfileDto): Promise<ProfileRow> {
    return this.updateProfile(undefined, dto);
  }

  async addProfilePhoto(profileId: string | undefined, dto: AddProfilePhotoDto): Promise<ProfilePhotoRow> {
    const owner = await this.findOwnProfile(profileId);
    const imageUrl = await offloadImage(dto.imageUrl, 'photos');
    const orderResult = await this.db.query(
      `select coalesce(max(sort_order), -1) + 1 as next_order
       from profile_photos
       where profile_id = $1`,
      [owner.id],
    );

    const result = await this.db.query<ProfilePhotoRow>(
      `insert into profile_photos (profile_id, image_url, caption, sort_order, position_x, position_y)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [
        owner.id,
        imageUrl,
        dto.caption?.trim() || null,
        orderResult.rows[0]?.next_order ?? 0,
        dto.positionX ?? 50,
        dto.positionY ?? 50,
      ],
    );

    return result.rows[0];
  }

  async addAdminPhoto(dto: AddProfilePhotoDto): Promise<ProfilePhotoRow> {
    return this.addProfilePhoto(undefined, dto);
  }

  async deleteProfilePhoto(profileId: string | undefined, photoId: string) {
    const owner = await this.findOwnProfile(profileId);
    const result = await this.db.query(
      `delete from profile_photos
       where id = $1 and profile_id = $2
       returning id`,
      [photoId, owner.id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Photo not found');
    }

    return { ok: true };
  }

  async deleteAdminPhoto(photoId: string) {
    return this.deleteProfilePhoto(undefined, photoId);
  }

  async updateProfilePhoto(
    profileId: string | undefined,
    photoId: string,
    dto: UpdateProfilePhotoDto,
  ): Promise<ProfilePhotoRow> {
    const owner = await this.findOwnProfile(profileId);
    const imageUrl = dto.imageUrl ? await offloadImage(dto.imageUrl, 'photos') : null;
    const result = await this.db.query<ProfilePhotoRow>(
      `update profile_photos
       set image_url = coalesce($3, image_url),
           caption = $4,
           position_x = coalesce($5, position_x),
           position_y = coalesce($6, position_y)
       where id = $1 and profile_id = $2
       returning id, profile_id, image_url, caption,
         coalesce(position_x, 50) as position_x,
         coalesce(position_y, 50) as position_y,
         sort_order, created_at`,
      [
        photoId,
        owner.id,
        imageUrl,
        dto.caption?.trim() || null,
        dto.positionX ?? null,
        dto.positionY ?? null,
      ],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Photo not found');
    }

    return result.rows[0];
  }

  async updateAdminPhoto(photoId: string, dto: UpdateProfilePhotoDto): Promise<ProfilePhotoRow> {
    return this.updateProfilePhoto(undefined, photoId, dto);
  }

  private async withPhotos(profile: ProfileRow): Promise<ProfileRow> {
    const photos = await this.db.query<ProfilePhotoRow>(
      `select id, profile_id, image_url, caption,
         coalesce(position_x, 50) as position_x,
         coalesce(position_y, 50) as position_y,
         sort_order, created_at
       from profile_photos
       where profile_id = $1
       order by sort_order asc, created_at desc`,
      [profile.id],
    );

    return {
      ...profile,
      photos: photos.rows,
    };
  }
}
