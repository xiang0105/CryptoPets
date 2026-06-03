alter table public.market_listings
  alter column price type numeric(30, 18)
  using price::numeric;
