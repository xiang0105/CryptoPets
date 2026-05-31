create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  wallet text not null unique check (wallet = lower(wallet) and wallet ~ '^0x[a-f0-9]{40}$'),
  username text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_nonces (
  nonce uuid primary key,
  wallet text not null check (wallet = lower(wallet) and wallet ~ '^0x[a-f0-9]{40}$'),
  message text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_id text not null,
  contract_address text not null check (contract_address = lower(contract_address) and contract_address ~ '^0x[a-f0-9]{40}$'),
  chain_id integer not null,
  name text not null,
  element text not null check (element in ('citrus', 'ember', 'frost', 'bloom')),
  stage integer not null default 1 check (stage between 1 and 5),
  token_uri text not null,
  stats jsonb not null,
  exp_current integer not null default 0 check (exp_current >= 0),
  exp_next integer not null default 1000 check (exp_next > 0),
  birth_time timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chain_id, contract_address, token_id)
);

create table if not exists public.pet_teams (
  user_id uuid primary key references public.users(id) on delete cascade,
  pet_ids uuid[] not null default '{}'::uuid[] check (array_length(pet_ids, 1) between 1 and 4 or array_length(pet_ids, 1) is null),
  updated_at timestamptz not null default now()
);

create table if not exists public.currencies (
  user_id uuid primary key references public.users(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  user_id uuid not null references public.users(id) on delete cascade,
  material_id text not null,
  amount integer not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, material_id)
);

create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  material_id text not null,
  amount integer not null default 1 check (amount > 0),
  price integer not null check (price > 0),
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sold_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  counterparty_id uuid references public.users(id) on delete set null,
  listing_id uuid references public.market_listings(id) on delete set null,
  action text not null check (action in ('reward', 'list', 'buy', 'sell', 'cancel', 'upgrade', 'advance')),
  material_id text,
  material_amount integer check (material_amount is null or material_amount > 0),
  coin_amount integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.expeditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  pet_ids uuid[] not null check (array_length(pet_ids, 1) between 1 and 4),
  expedition_type text not null default 'orange' check (expedition_type in ('orange', 'apple', 'snow-peach')),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  claimed_at timestamptz,
  status text not null default 'started' check (status in ('started', 'claimed', 'cancelled')),
  reward jsonb,
  created_at timestamptz not null default now()
);

alter table public.expeditions
  alter column expedition_type set default 'orange';

alter table public.expeditions
  drop constraint if exists expeditions_expedition_type_check;

alter table public.expeditions
  add constraint expeditions_expedition_type_check
  check (expedition_type in ('orange', 'apple', 'snow-peach')) not valid;

create table if not exists public.friends (
  user_id uuid not null references public.users(id) on delete cascade,
  friend_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);

create index if not exists users_wallet_idx on public.users(wallet);
create index if not exists auth_nonces_wallet_idx on public.auth_nonces(wallet);
create index if not exists auth_nonces_expires_at_idx on public.auth_nonces(expires_at);
create index if not exists pets_user_id_idx on public.pets(user_id);
create index if not exists pets_nft_idx on public.pets(chain_id, contract_address, token_id);
create index if not exists inventory_user_id_idx on public.inventory(user_id);
create index if not exists market_listings_status_idx on public.market_listings(status, created_at desc);
create index if not exists market_listings_seller_status_idx on public.market_listings(seller_id, status);
create index if not exists transactions_user_created_idx on public.transactions(user_id, created_at desc);
create index if not exists expeditions_user_status_idx on public.expeditions(user_id, status);
create index if not exists expeditions_ends_at_idx on public.expeditions(ends_at);
create index if not exists friends_friend_id_idx on public.friends(friend_id);
create index if not exists friend_requests_recipient_status_idx on public.friend_requests(recipient_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists pets_set_updated_at on public.pets;
create trigger pets_set_updated_at
  before update on public.pets
  for each row execute function public.set_updated_at();

drop trigger if exists pet_teams_set_updated_at on public.pet_teams;
create trigger pet_teams_set_updated_at
  before update on public.pet_teams
  for each row execute function public.set_updated_at();

drop trigger if exists currencies_set_updated_at on public.currencies;
create trigger currencies_set_updated_at
  before update on public.currencies
  for each row execute function public.set_updated_at();

drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

drop trigger if exists market_listings_set_updated_at on public.market_listings;
create trigger market_listings_set_updated_at
  before update on public.market_listings
  for each row execute function public.set_updated_at();

drop trigger if exists friend_requests_set_updated_at on public.friend_requests;
create trigger friend_requests_set_updated_at
  before update on public.friend_requests
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.auth_nonces enable row level security;
alter table public.pets enable row level security;
alter table public.pet_teams enable row level security;
alter table public.currencies enable row level security;
alter table public.inventory enable row level security;
alter table public.market_listings enable row level security;
alter table public.transactions enable row level security;
alter table public.expeditions enable row level security;
alter table public.friends enable row level security;
alter table public.friend_requests enable row level security;

create policy users_select_own on public.users
  for select using (wallet = lower(coalesce(auth.jwt() ->> 'wallet', '')));

create policy pets_select_own on public.pets
  for select using (
    exists (
      select 1 from public.users
      where users.id = pets.user_id
      and users.wallet = lower(coalesce(auth.jwt() ->> 'wallet', ''))
    )
  );

create policy pet_teams_select_own on public.pet_teams
  for select using (
    exists (
      select 1 from public.users
      where users.id = pet_teams.user_id
      and users.wallet = lower(coalesce(auth.jwt() ->> 'wallet', ''))
    )
  );

create policy currencies_select_own on public.currencies
  for select using (
    exists (
      select 1 from public.users
      where users.id = currencies.user_id
      and users.wallet = lower(coalesce(auth.jwt() ->> 'wallet', ''))
    )
  );

create policy inventory_select_own on public.inventory
  for select using (
    exists (
      select 1 from public.users
      where users.id = inventory.user_id
      and users.wallet = lower(coalesce(auth.jwt() ->> 'wallet', ''))
    )
  );

create policy market_listings_select_visible on public.market_listings
  for select using (
    status = 'active'
    or exists (
      select 1 from public.users
      where users.id in (market_listings.seller_id, market_listings.buyer_id)
      and users.wallet = lower(coalesce(auth.jwt() ->> 'wallet', ''))
    )
  );

create policy transactions_select_own on public.transactions
  for select using (
    exists (
      select 1 from public.users
      where users.id = transactions.user_id
      and users.wallet = lower(coalesce(auth.jwt() ->> 'wallet', ''))
    )
  );

create policy expeditions_select_own on public.expeditions
  for select using (
    exists (
      select 1 from public.users
      where users.id = expeditions.user_id
      and users.wallet = lower(coalesce(auth.jwt() ->> 'wallet', ''))
    )
  );

create policy friends_select_own on public.friends
  for select using (
    exists (
      select 1 from public.users
      where users.id = friends.user_id
      and users.wallet = lower(coalesce(auth.jwt() ->> 'wallet', ''))
    )
  );

create policy friend_requests_select_own on public.friend_requests
  for select using (
    exists (
      select 1 from public.users
      where users.id in (friend_requests.requester_id, friend_requests.recipient_id)
      and users.wallet = lower(coalesce(auth.jwt() ->> 'wallet', ''))
    )
  );

-- No anon insert/update/delete policies are defined. The backend uses the service role key,
-- which must remain server-only, to perform validated game-state mutations.
