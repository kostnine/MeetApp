create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references profiles(id) on delete cascade,
  guest_nickname text not null,
  contact text,
  source text default 'profile' check (source in ('profile', 'map', 'booking', 'nearby', 'chat')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (owner_profile_id, guest_nickname)
);

create index if not exists conversations_owner_updated_idx
on conversations (owner_profile_id, updated_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender text not null check (sender in ('owner', 'guest')),
  body text not null,
  created_at timestamptz default now()
);

create index if not exists messages_conversation_created_idx
on messages (conversation_id, created_at asc);
