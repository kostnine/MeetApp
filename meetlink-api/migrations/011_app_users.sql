create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique not null references profiles(id) on delete cascade,
  email text unique not null,
  password_hash text not null,
  password_salt text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop index if exists app_users_email_lower_idx;

create unique index if not exists app_users_email_lower_idx
on app_users (lower(email));
