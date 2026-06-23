create extension if not exists postgis with schema extensions;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  nickname text unique not null,
  name text,
  avatar_url text,
  bio text,
  instagram text,
  telegram text,
  phone text,
  city text,
  area text,
  status text default 'offline',
  is_admin boolean default false,
  show_on_map boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists availability_slots (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references profiles(id) on delete cascade,
  slot_date date not null,
  slot_time time not null,
  place text,
  is_available boolean default true,
  created_at timestamptz default now(),
  unique (owner_profile_id, slot_date, slot_time)
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references profiles(id) on delete cascade,
  guest_nickname text not null,
  contact text not null,
  comment text,
  meeting_date date not null,
  meeting_time time not null,
  place text,
  status text default 'new' check (status in ('new', 'confirmed', 'cancelled', 'done')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists reservations_owner_status_idx
on reservations (owner_profile_id, status, meeting_date, meeting_time);

create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references profiles(id) on delete cascade,
  guest_nickname text not null,
  instagram text,
  telegram text,
  phone text,
  comment text,
  source text default 'profile' check (source in ('profile', 'map', 'booking', 'nearby')),
  created_at timestamptz default now()
);

create index if not exists contact_requests_owner_created_idx
on contact_requests (owner_profile_id, created_at desc);

create table if not exists user_locations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete cascade,
  location extensions.geography(point, 4326) not null,
  accuracy_meters int,
  is_visible boolean default true,
  last_seen_at timestamptz default now()
);

create index if not exists user_locations_location_idx
on user_locations using gist (location);

create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid references profiles(id) on delete cascade,
  to_profile_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (from_profile_id, to_profile_id),
  check (from_profile_id <> to_profile_id)
);

insert into profiles (nickname, name, city, area, bio, instagram, telegram, phone, status, is_admin, show_on_map)
values (
  'kirov',
  'Kirov',
  'Vilnius',
  'Old Town',
  'Coffee, walk, calm meetups. Slots are confirmed manually.',
  '@kirov.meets',
  't.me/kirov',
  '+370 *** ** 280',
  'online',
  true,
  true
)
on conflict (nickname) do nothing;
