-- Unique public username for Community / Stream display.
-- Run in Supabase SQL editor or via: supabase db push (if using CLI migrations)

alter table public.users
  add column if not exists username text;

-- Case-insensitive uniqueness for non-null usernames
create unique index if not exists users_username_lower_uidx
  on public.users (lower(username))
  where username is not null;

alter table public.users
  drop constraint if exists users_username_format_chk;

alter table public.users
  add constraint users_username_format_chk
  check (
    username is null
    or username ~ '^[a-zA-Z0-9_]{3,20}$'
  );

-- Backfill existing rows without a username (collision-safe provisional handles)
update public.users
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 8)
where username is null;

-- Availability check (authenticated users only; excludes own row when editing)
create or replace function public.is_username_available(
  p_username text,
  p_exclude_user_id uuid default null
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.users u
    where lower(trim(u.username)) = lower(trim(p_username))
      and u.username is not null
      and trim(p_username) <> ''
      and (p_exclude_user_id is null or u.id <> p_exclude_user_id)
  );
$$;

revoke all on function public.is_username_available(text, uuid) from public, anon;
grant execute on function public.is_username_available(text, uuid) to authenticated;
