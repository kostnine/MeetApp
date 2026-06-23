-- Track when each side last read a conversation, for unread counts + sent/seen status.
alter table conversations add column if not exists owner_last_read_at timestamptz;
alter table conversations add column if not exists guest_last_read_at timestamptz;
