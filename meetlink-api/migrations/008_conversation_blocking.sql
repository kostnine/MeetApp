alter table conversations
add column if not exists blocked boolean not null default false,
add column if not exists blocked_at timestamptz;
