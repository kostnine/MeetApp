delete from user_locations a
using user_locations b
where a.profile_id = b.profile_id
  and a.last_seen_at < b.last_seen_at;

create unique index if not exists user_locations_profile_unique_idx
on user_locations (profile_id);
