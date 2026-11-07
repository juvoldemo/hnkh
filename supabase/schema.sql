-- Run once in the SQL Editor of the supplied Supabase project.
begin;
create or replace function public.hn_role()
returns text language sql stable security definer set search_path = public as $$
 select case coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-conference-password', '')
  when '1795' then 'admin' when '0000' then 'user' else null end;
$$;
revoke all on function public.hn_role() from public;
grant execute on function public.hn_role() to anon, authenticated;

create or replace function public.hn_login()
returns boolean language sql stable security definer set search_path = public as $$
 select public.hn_role() is not null;
$$;
revoke all on function public.hn_login() from public;
grant execute on function public.hn_login() to anon, authenticated;

create or replace function public.hn_open(data jsonb)
returns boolean language sql stable set search_path = public as $$
 select coalesce(now() < (((data->>'date')::date + 2)::timestamp at time zone 'Asia/Ho_Chi_Minh'), false);
$$;
create table if not exists public.hn_conferences (
  id uuid primary key,
  owner_id uuid references auth.users(id),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hn_conferences enable row level security;
-- NULL owner identifies the shared workspace. Existing account-owned rows stay private.
alter table public.hn_conferences alter column owner_id drop not null;
drop policy if exists hn_owner on public.hn_conferences;
create policy hn_owner on public.hn_conferences for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke all on public.hn_conferences from anon;
grant select on public.hn_conferences to anon;
drop policy if exists hn_shared on public.hn_conferences;
create policy hn_shared on public.hn_conferences for all to anon
using (owner_id is null and public.hn_login()) with check (owner_id is null and public.hn_login());
grant select, insert, update on public.hn_conferences to authenticated;

create or replace function public.hn_save_conference(conference_id uuid, data jsonb, expected_revision bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare next_revision bigint;
begin
  if not public.hn_login() then raise exception 'Invalid password'; end if;
  if expected_revision is null or expected_revision < 0 then raise exception 'Invalid revision'; end if;
  if data->>'id' is distinct from conference_id::text or jsonb_typeof(data->'customers') is distinct from 'array' then
    raise exception 'Invalid conference';
  end if;
  if expected_revision = 0 then
    insert into hn_conferences(id, owner_id, payload) values (conference_id, auth.uid(), data)
      on conflict do nothing returning revision into next_revision;
  else
    update hn_conferences set payload = data, revision = revision + 1, updated_at = now()
      where id = conference_id and owner_id is not distinct from auth.uid() and revision = expected_revision
      returning revision into next_revision;
  end if;
  if next_revision is null then raise sqlstate 'PT409' using message = 'Conference conflict'; end if;
  return next_revision;
end;
$$;
revoke all on function public.hn_save_conference(uuid,jsonb,bigint) from public, anon;
grant execute on function public.hn_save_conference(uuid,jsonb,bigint) to authenticated, anon;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('conference-images', 'conference-images', false, 20971520, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists hn_images_owner on storage.objects;
create policy hn_images_owner on storage.objects for all to authenticated
using (bucket_id = 'conference-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'conference-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists hn_images_shared on storage.objects;
create policy hn_images_shared on storage.objects for select to anon
using (bucket_id = 'conference-images' and (storage.foldername(name))[1] = 'shared' and public.hn_login());
drop policy if exists hn_images_shared_insert on storage.objects;
create policy hn_images_shared_insert on storage.objects for insert to anon
with check (bucket_id = 'conference-images' and (storage.foldername(name))[1] = 'shared' and public.hn_login());
drop policy if exists hn_images_shared_update on storage.objects;
create policy hn_images_shared_update on storage.objects for update to anon
using (bucket_id = 'conference-images' and (storage.foldername(name))[1] = 'shared' and public.hn_login())
with check (bucket_id = 'conference-images' and (storage.foldername(name))[1] = 'shared' and public.hn_login());

create or replace function public.hn_guard_conference()
returns trigger language plpgsql set search_path = public as $$
begin
 if new.owner_id is null then
  if not public.hn_login() then raise exception 'Invalid password'; end if;
  if public.hn_role() <> 'admin' then
   if not public.hn_open(new.payload) then raise exception 'Conference is closed'; end if;
   if TG_OP = 'UPDATE' then
    if not public.hn_open(old.payload) then raise exception 'Conference is closed'; end if;
   end if;
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists hn_guard on public.hn_conferences;
create trigger hn_guard before insert or update on public.hn_conferences
for each row execute function public.hn_guard_conference();
commit;
