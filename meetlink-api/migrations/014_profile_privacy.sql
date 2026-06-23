-- Glass: persist the remaining Settings privacy toggles on the profile.
alter table profiles add column if not exists approximate_location boolean not null default true;
alter table profiles add column if not exists messages_from_nearby boolean not null default true;
alter table profiles add column if not exists messages_from_requests boolean not null default true;
alter table profiles add column if not exists contacts_after_approval boolean not null default true;
alter table profiles add column if not exists allow_messages boolean not null default true;
