create table if not exists public.traffic_lights (
  id text primary key,
  name text not null check (char_length(name) between 1 and 60),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  green_seconds integer not null check (green_seconds between 1 and 3600),
  amber_seconds integer not null check (amber_seconds between 1 and 3600),
  red_seconds integer not null check (red_seconds between 1 and 3600),
  started_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.traffic_lights enable row level security;
alter table public.admin_users enable row level security;

do $$
begin
  alter publication supabase_realtime add table public.traffic_lights;
exception
  when duplicate_object then null;
end $$;

drop policy if exists "Semáforos visibles públicamente" on public.traffic_lights;
create policy "Semáforos visibles públicamente"
on public.traffic_lights
for select
using (true);

drop policy if exists "Solo administradores pueden crear semáforos" on public.traffic_lights;
create policy "Solo administradores pueden crear semáforos"
on public.traffic_lights
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Solo administradores pueden modificar semáforos" on public.traffic_lights;
create policy "Solo administradores pueden modificar semáforos"
on public.traffic_lights
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Solo administradores pueden borrar semáforos" on public.traffic_lights;
create policy "Solo administradores pueden borrar semáforos"
on public.traffic_lights
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

-- Después de crear tu usuario administrador en Supabase Auth, sustituye el email:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'tu-email@example.com'
-- on conflict do nothing;
