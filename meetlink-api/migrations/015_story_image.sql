-- Stories carry an optional photo (Instagram-style).
alter table stories add column if not exists image_url text;
