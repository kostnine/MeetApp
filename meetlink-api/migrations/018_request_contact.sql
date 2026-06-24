-- The owner's contact to show on the public request page (so people can reach them directly).
alter table meet_requests add column if not exists contact text;
