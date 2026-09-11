-- Run once in the SQL Editor of the supplied Supabase project.
create table if not exists public.hn_conferences (
  id uuid primary key,
  owner_id uuid not null references auth.users(id),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hn_conferences enable row level security;
drop policy if exists hn_owner on public.hn_conferences;
create policy hn_owner on public.hn_conferences for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke all on public.hn_conferences from anon;
grant select, insert, update on public.hn_conferences to authenticated;

create or replace function public.hn_save_conference(conference_id uuid, data jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = public as $$
declare next_revision bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if data->>'id' is distinct from conference_id::text or jsonb_typeof(data->'customers') is distinct from 'array' then
    raise exception 'Invalid conference';
  end if;
  if expected_revision = 0 then
    insert into hn_conferences(id, owner_id, payload) values (conference_id, auth.uid(), data)
      on conflict do nothing returning revision into next_revision;
  else
    update hn_conferences set payload = data, revision = revision + 1, updated_at = now()
      where id = conference_id and owner_id = auth.uid() and revision = expected_revision
      returning revision into next_revision;
  end if;
  if next_revision is null then raise sqlstate 'PT409' using message = 'Conference conflict'; end if;
  return next_revision;
end;
$$;
revoke all on function public.hn_save_conference(uuid,jsonb,bigint) from public, anon;
grant execute on function public.hn_save_conference(uuid,jsonb,bigint) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('conference-images', 'conference-images', false, 20971520, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists hn_images_owner on storage.objects;
create policy hn_images_owner on storage.objects for all to authenticated
using (bucket_id = 'conference-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'conference-images' and (storage.foldername(name))[1] = auth.uid()::text);
