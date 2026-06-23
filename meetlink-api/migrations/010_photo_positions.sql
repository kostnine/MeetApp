alter table profiles
  add column if not exists avatar_position_x int default 50,
  add column if not exists avatar_position_y int default 50;

alter table profile_photos
  add column if not exists position_x int default 50,
  add column if not exists position_y int default 50;

update profiles
set avatar_position_x = coalesce(avatar_position_x, 50),
    avatar_position_y = coalesce(avatar_position_y, 50);

update profile_photos
set position_x = coalesce(position_x, 50),
    position_y = coalesce(position_y, 50);
