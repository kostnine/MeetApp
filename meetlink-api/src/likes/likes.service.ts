import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateLikeDto } from './dto';

@Injectable()
export class LikesService {
  constructor(
    private readonly db: DbService,
    private readonly profiles: ProfilesService,
  ) {}

  async create(dto: CreateLikeDto) {
    const from = await this.profiles.findByNickname(dto.fromNickname);
    const to = await this.profiles.findByNickname(dto.toNickname);

    const result = await this.db.query(
      `insert into likes (from_profile_id, to_profile_id)
       values ($1, $2)
       on conflict (from_profile_id, to_profile_id) do nothing
       returning *`,
      [from.id, to.id],
    );

    const mutual = await this.db.query(
      `select exists (
         select 1 from likes
         where from_profile_id = $1 and to_profile_id = $2
       ) as is_mutual`,
      [to.id, from.id],
    );

    return {
      like: result.rows[0] ?? null,
      mutual: Boolean(mutual.rows[0]?.is_mutual),
    };
  }

  async listForNickname(nickname: string) {
    const profile = await this.profiles.findByNickname(nickname);

    const result = await this.db.query(
      `select
         l.id,
         l.created_at,
         from_profile.nickname as from_nickname,
         to_profile.nickname as to_nickname,
         exists (
           select 1 from likes reverse_like
           where reverse_like.from_profile_id = l.to_profile_id
             and reverse_like.to_profile_id = l.from_profile_id
         ) as is_mutual
       from likes l
       join profiles from_profile on from_profile.id = l.from_profile_id
       join profiles to_profile on to_profile.id = l.to_profile_id
       where l.from_profile_id = $1 or l.to_profile_id = $1
       order by l.created_at desc`,
      [profile.id],
    );

    return result.rows;
  }
}
