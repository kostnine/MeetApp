alter table meet_request_responses
add column if not exists conversation_id uuid references conversations(id) on delete set null;

create index if not exists meet_request_responses_conversation_idx
on meet_request_responses (conversation_id);
