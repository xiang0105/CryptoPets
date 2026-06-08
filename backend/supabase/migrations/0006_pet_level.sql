alter table public.pets
  add column if not exists level integer not null default 1 check (level >= 0);

update public.pets
set level = greatest(0, floor(exp_current::numeric / greatest(1, exp_next))::integer)
where level = 1 and exp_current > 0;
