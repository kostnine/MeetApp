insert into profiles (nickname, name, bio, instagram, telegram, phone, city, area, status, show_on_map)
values
  (
    'lina_vln',
    'Lina',
    'Coffee, walks, easy chats nearby.',
    '@linavibes',
    't.me/linavibes',
    null,
    'Vilnius',
    'Old Town',
    'online',
    true
  ),
  (
    'mark_near',
    'Mark',
    'Looking for calm conversations around the center.',
    '@mark.near',
    null,
    null,
    'Vilnius',
    'Center',
    'online',
    true
  ),
  (
    'nika_live',
    'Nika',
    'Nearby today, open to a short walk.',
    '@nika.live',
    't.me/nikalive',
    null,
    'Vilnius',
    'Cathedral Sq.',
    'online',
    true
  )
on conflict (nickname) do update
set name = excluded.name,
    bio = excluded.bio,
    instagram = excluded.instagram,
    telegram = excluded.telegram,
    phone = excluded.phone,
    city = excluded.city,
    area = excluded.area,
    status = excluded.status,
    show_on_map = excluded.show_on_map,
    updated_at = now();

insert into user_locations (profile_id, location, accuracy_meters, is_visible, last_seen_at)
select id, extensions.ST_SetSRID(extensions.ST_MakePoint(25.280, 54.688), 4326)::extensions.geography, 120, true, now()
from profiles
where nickname = 'lina_vln'
on conflict (profile_id) do update
set location = excluded.location,
    accuracy_meters = excluded.accuracy_meters,
    is_visible = excluded.is_visible,
    last_seen_at = now();

insert into user_locations (profile_id, location, accuracy_meters, is_visible, last_seen_at)
select id, extensions.ST_SetSRID(extensions.ST_MakePoint(25.282, 54.686), 4326)::extensions.geography, 140, true, now()
from profiles
where nickname = 'mark_near'
on conflict (profile_id) do update
set location = excluded.location,
    accuracy_meters = excluded.accuracy_meters,
    is_visible = excluded.is_visible,
    last_seen_at = now();

insert into user_locations (profile_id, location, accuracy_meters, is_visible, last_seen_at)
select id, extensions.ST_SetSRID(extensions.ST_MakePoint(25.276, 54.689), 4326)::extensions.geography, 160, true, now()
from profiles
where nickname = 'nika_live'
on conflict (profile_id) do update
set location = excluded.location,
    accuracy_meters = excluded.accuracy_meters,
    is_visible = excluded.is_visible,
    last_seen_at = now();
