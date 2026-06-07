alter table public.pets
  add column if not exists base_pet_id text not null default 'TEST-PET-001',
  add column if not exists iv integer not null default 0 check (iv >= 0),
  add column if not exists skin_id integer not null default 0 check (skin_id >= 0);

update public.pets
set iv = coalesce((stats ->> 'iv')::integer, iv)
where stats ? 'iv';
