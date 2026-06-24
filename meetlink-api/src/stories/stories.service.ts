import { BadRequestException, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { offloadImage } from '../common/image-storage';
import { OnlineGateway } from '../online/online.gateway';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateStoryDto } from './dto';

function durationToExpiry(visibleFor?: string): Date | null {
  if (visibleFor === 'forever') return null;
  const mins: Record<string, number> = { '30m': 30, '1h': 60, '3h': 180 };
  return new Date(Date.now() + (mins[visibleFor ?? '1h'] ?? 60) * 60_000);
}

function mapStory(row: Record<string, any>) {
  return {
    id: row.id,
    text: row.text,
    place: row.place,
    visibleFor: row.visible_for,
    whoCanMessage: row.who_can_message,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    image: row.image_url ?? null,
    name: row.owner_name || row.owner_nickname || 'Someone',
    nickname: row.owner_nickname ?? null,
    age: row.owner_age ?? null,
    avatar: row.owner_avatar ?? null,
    online: row.owner_status === 'online',
  };
}

@Injectable()
export class StoriesService {
  constructor(
    private readonly db: DbService,
    private readonly profiles: ProfilesService,
    private readonly realtime: OnlineGateway,
  ) {}

  // Active stories from everyone except the viewer (you are the centre marker).
  async listNearby(viewerProfileId?: string) {
    const params: unknown[] = [];
    let exclude = '';
    if (viewerProfileId) {
      params.push(viewerProfileId);
      exclude = 'and s.owner_profile_id <> $1';
    }

    const result = await this.db.query(
      `select s.id, s.text, s.place, s.visible_for, s.who_can_message, s.created_at, s.expires_at, s.image_url,
              p.nickname as owner_nickname, p.name as owner_name, p.age as owner_age,
              p.avatar_url as owner_avatar, p.status as owner_status
       from stories s
       join profiles p on p.id = s.owner_profile_id
       where (s.expires_at is null or s.expires_at > now())
         ${exclude}
       order by s.created_at desc
       limit 50`,
      params,
    );

    return result.rows.map(mapStory);
  }

  // My own active stories (for "check my story").
  async listMine(ownerProfileId?: string) {
    const owner = await this.profiles.findOwnProfile(ownerProfileId);
    const result = await this.db.query(
      `select s.id, s.text, s.place, s.visible_for, s.who_can_message, s.created_at, s.expires_at, s.image_url,
              p.nickname as owner_nickname, p.name as owner_name, p.age as owner_age,
              p.avatar_url as owner_avatar, p.status as owner_status
       from stories s
       join profiles p on p.id = s.owner_profile_id
       where s.owner_profile_id = $1
         and (s.expires_at is null or s.expires_at > now())
       order by s.created_at desc`,
      [owner.id],
    );
    return result.rows.map(mapStory);
  }

  async create(dto: CreateStoryDto, ownerProfileId?: string) {
    const text = dto.text?.trim() || '';
    const image = dto.imageUrl?.trim() || null;
    // A story needs at least a photo or some text (the column is NOT NULL → store '').
    if (!text && !image) {
      throw new BadRequestException('Add a photo or write something for your story');
    }

    const owner = await this.profiles.findOwnProfile(ownerProfileId);
    // Offload a base64 photo to object storage; store just the URL (falls back to the
    // data-URL if storage isn't configured).
    const storedImage = image ? await offloadImage(image, 'stories') : null;
    const result = await this.db.query(
      `insert into stories (owner_profile_id, text, place, visible_for, who_can_message, expires_at, image_url)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        owner.id,
        text,
        dto.place?.trim() || null,
        dto.visibleFor || '1h',
        dto.whoCanMessage || 'everyone',
        durationToExpiry(dto.visibleFor),
        storedImage,
      ],
    );

    const story = mapStory({
      ...result.rows[0],
      owner_name: owner.name,
      owner_nickname: owner.nickname,
      owner_status: owner.status,
    });
    // Broadcast so nearby viewers see it instantly (no page reload).
    this.realtime.emitStory({ ...story, ownerProfileId: owner.id });
    return story;
  }
}
