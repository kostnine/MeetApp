-- Glass: request replies are "new" (the owner accepts later), so relax the
-- meet_request_responses status check to include 'new' and 'archived'.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'meet_request_responses'
      and constraint_name = 'meet_request_responses_status_check'
  ) then
    alter table meet_request_responses drop constraint meet_request_responses_status_check;
  end if;
end $$;

alter table meet_request_responses
add constraint meet_request_responses_status_check
check (status in ('new', 'accepted', 'declined', 'archived'));
