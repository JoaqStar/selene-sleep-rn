-- Replace provisional user_xxxxxxxx handles with real usernames from display_name
-- and/or Supabase Auth metadata (full_name / name).
-- Run in SQL editor after 20250529120000 and 20250529140000.

with sources as (
  select
    u.id,
    u.username as current_username,
    coalesce(
      nullif(trim(u.display_name), ''),
      nullif(trim(au.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(au.raw_user_meta_data->>'name'), ''),
      ''
    ) as label
  from public.users u
  left join auth.users au on au.id = u.id
  where u.username ~ '^user_[a-f0-9]{8}$'
),
normalized as (
  select
    id,
    current_username,
    label,
    left(
      lower(
        regexp_replace(
          regexp_replace(trim(label), '\s+', '_', 'g'),
          '[^a-zA-Z0-9_]',
          '',
          'g'
        )
      ),
      20
    ) as candidate
  from sources
  where trim(label) <> ''
),
valid as (
  select *
  from normalized
  where length(candidate) >= 3
    and candidate ~ '^[a-zA-Z0-9_]{3,20}$'
    and lower(candidate) not in (
      'admin', 'selene', 'support', 'help', 'moderator', 'mod',
      'system', 'anonymous', 'friend', 'user', 'null', 'undefined'
    )
),
with_final as (
  select
    v.id,
    v.label,
    case
      when exists (
        select 1
        from public.users o
        where o.id <> v.id
          and lower(o.username) = v.candidate
          and o.username !~ '^user_[a-f0-9]{8}$'
      )
      then left(v.candidate, 16) || '_' || substr(replace(v.id::text, '-', ''), 1, 3)
      else v.candidate
    end as final_username
  from valid v
)
update public.users u
set
  username = f.final_username,
  display_name = coalesce(nullif(trim(u.display_name), ''), f.label)
from with_final f
where u.id = f.id;

-- Preview rows that still have provisional handles (no usable name source):
-- select u.id, u.email, u.display_name, u.username, au.raw_user_meta_data
-- from public.users u
-- left join auth.users au on au.id = u.id
-- where u.username ~ '^user_[a-f0-9]{8}$';
