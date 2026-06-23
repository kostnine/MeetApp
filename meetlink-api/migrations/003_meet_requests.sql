create table if not exists meet_requests (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references profiles(id) on delete cascade,
  code text unique not null,
  type text not null default 'nearby' check (type in ('nearby', 'offline')),
  message text not null,
  looking_for text,
  radius int,
  age_min int,
  age_max int,
  visible_on_map boolean default true,
  status text default 'active' check (status in ('active', 'closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists meet_requests_owner_created_idx
on meet_requests (owner_profile_id, created_at desc);

create index if not exists meet_requests_map_visible_idx
on meet_requests (visible_on_map, status, type);

create table if not exists meet_request_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references meet_requests(id) on delete cascade,
  guest_nickname text not null,
  age int,
  contact text,
  message text,
  status text not null check (status in ('accepted', 'declined')),
  created_at timestamptz default now()
);

create index if not exists meet_request_responses_request_created_idx
on meet_request_responses (request_id, created_at desc);

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'conversations'
      and constraint_name = 'conversations_source_check'
  ) then
    alter table conversations drop constraint conversations_source_check;
  end if;
end $$;

alter table conversations
add constraint conversations_source_check
check (source in ('profile', 'map', 'booking', 'nearby', 'request', 'chat'));
