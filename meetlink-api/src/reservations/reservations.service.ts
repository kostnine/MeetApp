import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateReservationDto } from './dto';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly db: DbService,
    private readonly profiles: ProfilesService,
  ) {}

  async create(dto: CreateReservationDto) {
    const owner = dto.ownerNickname
      ? await this.profiles.findByNickname(dto.ownerNickname)
      : await this.profiles.findAdminProfile();

    const guestNickname = dto.guestNickname?.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await this.db.query(
      `insert into reservations
       (owner_profile_id, guest_nickname, contact, comment, meeting_date, meeting_time, place)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        owner.id,
        guestNickname,
        dto.contact,
        dto.comment ?? null,
        dto.meetingDate,
        dto.meetingTime,
        dto.place ?? null,
      ],
    );

    return result.rows[0];
  }

  async listForOwner(ownerProfileId?: string, status?: string) {
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (ownerProfileId) {
      params.push(ownerProfileId);
      conditions.push(`r.owner_profile_id = $${params.length}`);
    }

    const result = await this.db.query(
      `select r.*, p.nickname as owner_nickname
       from reservations r
       join profiles p on p.id = r.owner_profile_id
       ${conditions.length ? `where ${conditions.join(' and ')}` : ''}
       order by r.created_at desc`,
      params,
    );

    return result.rows;
  }

  async listForAdmin(status?: string) {
    return this.listForOwner(undefined, status);
  }

  async updateStatus(id: string, status: string, ownerProfileId?: string) {
    const params: unknown[] = [id, status];
    let ownerWhere = '';

    if (ownerProfileId) {
      params.push(ownerProfileId);
      ownerWhere = 'and owner_profile_id = $3';
    }

    const result = await this.db.query(
      `update reservations
       set status = $2, updated_at = now()
       where id = $1
       ${ownerWhere}
       returning *`,
      params,
    );

    return result.rows[0];
  }
}
