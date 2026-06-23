-- Link a conversation to the recipient's real account so BOTH people see the chat.
-- (Previously a conversation only had one owner + a guest *nickname string*, so the
--  person you messaged from a story never saw the conversation.)

alter table conversations add column if not exists guest_profile_id uuid references profiles(id);

-- Backfill: connect existing conversations whose guest name matches a real account.
update conversations c
set guest_profile_id = p.id
from profiles p
where c.guest_profile_id is null
  and p.id <> c.owner_profile_id
  and (lower(p.nickname) = lower(c.guest_nickname) or lower(p.name) = lower(c.guest_nickname));

create index if not exists conversations_guest_profile_idx on conversations(guest_profile_id);
