alter table profiles
add column if not exists visibility_radius_meters int default 1000;

update profiles
set visibility_radius_meters = 1000
where visibility_radius_meters is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_visibility_radius_check'
  ) then
    alter table profiles
    add constraint profiles_visibility_radius_check
    check (visibility_radius_meters between 100 and 5000);
  end if;
end $$;
