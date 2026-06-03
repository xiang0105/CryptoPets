alter table public.expeditions
  alter column expedition_type set default 'orange';

alter table public.expeditions
  drop constraint if exists expeditions_expedition_type_check;

alter table public.expeditions
  add constraint expeditions_expedition_type_check
  check (expedition_type in ('orange', 'apple', 'snow-peach')) not valid;
