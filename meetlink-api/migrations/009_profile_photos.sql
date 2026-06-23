create table if not exists profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists profile_photos_profile_idx
on profile_photos (profile_id, sort_order, created_at desc);
