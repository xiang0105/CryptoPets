create table if not exists public.expedition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expedition_id uuid references public.expeditions(id) on delete cascade,
  occurred_at timestamptz not null,
  message_zh text not null,
  message_en text not null,
  variant text check (variant is null or variant in ('notice')),
  created_at timestamptz not null default now()
);

create index if not exists expedition_logs_user_occurred_idx
  on public.expedition_logs(user_id, occurred_at desc);

create index if not exists expedition_logs_expedition_idx
  on public.expedition_logs(expedition_id, occurred_at);

alter table public.expedition_logs enable row level security;

drop policy if exists expedition_logs_select_own on public.expedition_logs;

create policy expedition_logs_select_own on public.expedition_logs
  for select using (
    exists (
      select 1 from public.users
      where users.id = expedition_logs.user_id
      and users.wallet = lower(coalesce(auth.jwt() ->> 'wallet', ''))
    )
  );
