import { BadRequestException, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateContactRequestDto } from './dto';

@Injectable()
export class ContactsService {
  constructor(
    private readonly db: DbService,
    private readonly profiles: ProfilesService,
  ) {}

  async create(dto: CreateContactRequestDto) {
    if (!dto.instagram && !dto.telegram && !dto.phone && !dto.comment) {
      throw new BadRequestException('At least one contact field is required');
    }

    const owner = dto.ownerNickname
      ? await this.profiles.findByNickname(dto.ownerNickname)
      : await this.profiles.findAdminProfile();

    const guestNickname = dto.guestNickname?.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await this.db.query(
      `insert into contact_requests
       (owner_profile_id, guest_nickname, instagram, telegram, phone, comment, source)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        owner.id,
        guestNickname,
        dto.instagram ?? null,
        dto.telegram ?? null,
        dto.phone ?? null,
        dto.comment ?? null,
        dto.source ?? 'profile',
      ],
    );

    return result.rows[0];
  }

  async listForOwner(ownerProfileId?: string, source?: string) {
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (source) {
      params.push(source);
      conditions.push(`c.source = $${params.length}`);
    }

    if (ownerProfileId) {
      params.push(ownerProfileId);
      conditions.push(`c.owner_profile_id = $${params.length}`);
    }

    const result = await this.db.query(
      `select c.*, p.nickname as owner_nickname
       from contact_requests c
       join profiles p on p.id = c.owner_profile_id
       ${conditions.length ? `where ${conditions.join(' and ')}` : ''}
       order by c.created_at desc`,
      params,
    );

    return result.rows;
  }

  async listForAdmin(source?: string) {
    return this.listForOwner(undefined, source);
  }
}
