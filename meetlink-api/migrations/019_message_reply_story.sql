-- Persist the "replied to a story" context per message so the quoted-story block in chats
-- survives a reload (it was frontend-only in memory). Small JSONB: { name, snippet, gradient,
-- image } — never a base64 blob (the service stores image only when it's an http(s) URL).
alter table messages add column if not exists reply_story jsonb;
