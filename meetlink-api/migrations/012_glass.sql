-- Glass redesign: additive schema for the full Glass model.
-- Idempotent — safe to run more than once.

-- Profiles: age + interests
alter table profiles add column if not exists age int;
alter table profiles add column if not exists interests jsonb not null default '[]'::jsonb;

-- Ages for the seed profiles (used by map markers + profile card)
update profiles set age = 27 where nickname = 'kostnine' and age is null;
update profiles set age = 24 where nickname = 'lina_vln' and age is null;
update profiles set age = 29 where nickname = 'mark_near' and age is null;
update profiles set age = 26 where nickname = 'nika_live' and age is null;

-- meet_requests: Glass fields (place / display-as / custom name / link expiry)
alter table meet_requests add column if not exists place text;
alter table meet_requests add column if not exists display_as text not null default 'profile';
alter table meet_requests add column if not exists custom_name text;
alter table meet_requests add column if not exists expires text not null default '24h';

-- Stories: short notes posted on the map, expiring
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references profiles(id) on delete cascade,
  text text not null,
  place text,
  visible_for text not null default '1h',
  who_can_message text not null default 'everyone',
  created_at timestamptz default now(),
  expires_at timestamptz
);

create index if not exists stories_active_idx on stories (expires_at, created_at desc);

-- Seed one active story per nearby profile (only if they have none yet)
insert into stories (owner_profile_id, text, place, visible_for, who_can_message, expires_at)
select p.id, s.text, s.place, '3h', 'everyone', now() + interval '30 days'
from (values
  ('lina_vln', 'Reading by the window at this tiny coffee place — say hi if you''re around ☕', 'Old Town'),
  ('mark_near', 'Looking for a calm conversation around the center this afternoon.', 'Center'),
  ('nika_live', 'Nearby today and open to a short walk by the cathedral.', 'Cathedral Sq.')
) as s(nickname, text, place)
join profiles p on p.nickname = s.nickname
where not exists (select 1 from stories st where st.owner_profile_id = p.id);
