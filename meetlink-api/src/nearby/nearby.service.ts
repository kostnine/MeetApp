import { BadRequestException, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ProfilesService } from '../profiles/profiles.service';
import { NearbyQueryDto, UpsertLocationDto } from './dto';

function approximateCoordinate(value: number) {
  return Math.round(value * 1000) / 1000;
}

@Injectable()
export class NearbyService {
  constructor(
    private readonly db: DbService,
    private readonly profiles: ProfilesService,
  ) {}

  async upsertLocation(dto: UpsertLocationDto, profileId?: string) {
    if (!profileId && !dto.nickname) {
      throw new BadRequestException('Nickname is required');
    }

    const profile = profileId
      ? await this.profiles.findById(profileId)
      : await this.profiles.findByNickname(dto.nickname as string);
    const lat = approximateCoordinate(dto.lat);
    const lng = approximateCoordinate(dto.lng);

    const result = await this.db.query(
      `insert into user_locations
       (profile_id, location, accuracy_meters, is_visible, last_seen_at)
       values (
         $1,
         extensions.ST_SetSRID(extensions.ST_MakePoint($2, $3), 4326)::extensions.geography,
         $4,
         $5,
         now()
       )
       on conflict (profile_id) do update
       set location = excluded.location,
           accuracy_meters = excluded.accuracy_meters,
           is_visible = excluded.is_visible,
           last_seen_at = now()
       returning id, profile_id, accuracy_meters, is_visible, last_seen_at`,
      [profile.id, lng, lat, dto.accuracyMeters ?? null, dto.isVisible ?? true],
    );

    return result.rows[0];
  }

  async findNearby(query: NearbyQueryDto, currentNickname?: string) {
    const radius = query.radius ?? 500;
    const lat = approximateCoordinate(query.lat);
    const lng = approximateCoordinate(query.lng);

    const result = await this.db.query(
      `with origin as (
         select extensions.ST_SetSRID(extensions.ST_MakePoint($1, $2), 4326)::extensions.geography as geo
       )
       select
         p.id,
         p.nickname,
         p.name,
         p.avatar_url,
         p.city,
         p.area,
         p.status,
         -- Honor each profile's approximate_location preference; never return private
         -- contact fields (instagram/telegram/phone) in open discovery.
         case when coalesce(p.approximate_location, true)
           then round(extensions.ST_Y(ul.location::extensions.geometry)::numeric, 3)
           else extensions.ST_Y(ul.location::extensions.geometry)::numeric end as lat,
         case when coalesce(p.approximate_location, true)
           then round(extensions.ST_X(ul.location::extensions.geometry)::numeric, 3)
           else extensions.ST_X(ul.location::extensions.geometry)::numeric end as lng,
         round(extensions.ST_Distance(ul.location, origin.geo))::int as distance_meters,
         ul.last_seen_at
       from user_locations ul
       join profiles p on p.id = ul.profile_id
       cross join origin
       where ul.is_visible = true
         and p.show_on_map = true
         and extensions.ST_DWithin(ul.location, origin.geo, $3)
         and ($4::text is null or p.nickname <> $4)
       order by distance_meters asc
       limit 50`,
      [lng, lat, radius, query.nickname ?? currentNickname ?? null],
    );

    return result.rows;
  }
}
