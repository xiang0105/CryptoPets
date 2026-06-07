-- 僅供開發與 staging 環境使用的 seed 資料。
-- 本檔案使用固定資料，設計上可重複執行。

insert into public.users (id, wallet, username)
values
  ('00000000-0000-4000-8000-000000000101', '0x1111111111111111111111111111111111111111', 'seed-alice'),
  ('00000000-0000-4000-8000-000000000102', '0x2222222222222222222222222222222222222222', 'seed-bob'),
  ('00000000-0000-4000-8000-000000000103', '0x3333333333333333333333333333333333333333', 'seed-caro')
on conflict (id) do update set
  wallet = excluded.wallet,
  username = excluded.username;

insert into public.currencies (user_id, coins)
values
  ('00000000-0000-4000-8000-000000000101', 500),
  ('00000000-0000-4000-8000-000000000102', 250),
  ('00000000-0000-4000-8000-000000000103', 120)
on conflict (user_id) do update set
  coins = excluded.coins,
  updated_at = now();

insert into public.pets (
  id,
  user_id,
  token_id,
  contract_address,
  chain_id,
  name,
  element,
  stage,
  token_uri,
  stats,
  exp_current,
  exp_next,
  birth_time
)
values
  (
    '10000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000101',
    'seed-alice:TEST-PET-001',
    '0x0000000000000000000000000000000000000000',
    1,
    'sakiko',
    'citrus',
    1,
    'test-local://pets/sakiko',
    '{"iv":84,"hp":100,"maxHp":100,"atk":75,"def":60}'::jsonb,
    0,
    1000,
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000101',
    'seed-alice:TEST-PET-002',
    '0x0000000000000000000000000000000000000000',
    1,
    'MAX',
    'ember',
    1,
    'test-local://pets/max',
    '{"iv":91,"hp":95,"maxHp":95,"atk":85,"def":40}'::jsonb,
    120,
    1000,
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000102',
    'seed-bob:TEST-PET-003',
    '0x0000000000000000000000000000000000000000',
    1,
    'SONORATO',
    'frost',
    1,
    'test-local://pets/sonorato',
    '{"iv":76,"hp":90,"maxHp":90,"atk":55,"def":70}'::jsonb,
    0,
    1000,
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000103',
    'seed-caro:TEST-PET-004',
    '0x0000000000000000000000000000000000000000',
    1,
    'CANESAN',
    'bloom',
    1,
    'test-local://pets/canesan',
    '{"iv":88,"hp":120,"maxHp":120,"atk":90,"def":85}'::jsonb,
    0,
    1000,
    now()
  )
on conflict (id) do update set
  user_id = excluded.user_id,
  token_id = excluded.token_id,
  contract_address = excluded.contract_address,
  chain_id = excluded.chain_id,
  name = excluded.name,
  element = excluded.element,
  stage = excluded.stage,
  token_uri = excluded.token_uri,
  stats = excluded.stats,
  exp_current = excluded.exp_current,
  exp_next = excluded.exp_next;

insert into public.inventory (user_id, material_id, amount)
values
  ('00000000-0000-4000-8000-000000000101', 'MAT-2C', 10),
  ('00000000-0000-4000-8000-000000000101', 'MAT-4B', 2),
  ('00000000-0000-4000-8000-000000000102', 'MAT-2C', 4),
  ('00000000-0000-4000-8000-000000000103', 'MAT-4B', 1)
on conflict (user_id, material_id) do update set
  amount = excluded.amount,
  updated_at = now();

insert into public.market_listings (
  id,
  seller_id,
  material_id,
  amount,
  price,
  status,
  buyer_id,
  sold_at,
  cancelled_at
)
values (
  '20000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000101',
  'MAT-2C',
  2,
  70,
  'active',
  null,
  null,
  null
)
on conflict (id) do update set
  seller_id = excluded.seller_id,
  material_id = excluded.material_id,
  amount = excluded.amount,
  price = excluded.price,
  status = excluded.status,
  buyer_id = excluded.buyer_id,
  sold_at = excluded.sold_at,
  cancelled_at = excluded.cancelled_at;

insert into public.friends (user_id, friend_id)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000101')
on conflict (user_id, friend_id) do nothing;

insert into public.friend_requests (id, requester_id, recipient_id, status)
values
  (
    '30000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102',
    'accepted'
  ),
  (
    '30000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000101',
    'pending'
  )
on conflict (requester_id, recipient_id) do update set
  status = excluded.status,
  updated_at = now();

insert into public.transactions (
  id,
  user_id,
  counterparty_id,
  listing_id,
  action,
  material_id,
  material_amount,
  coin_amount,
  metadata
)
values (
  '40000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000101',
  null,
  '20000000-0000-4000-8000-000000000101',
  'list',
  'MAT-2C',
  2,
  0,
  '{"seed":true}'::jsonb
)
on conflict (id) do update set
  user_id = excluded.user_id,
  counterparty_id = excluded.counterparty_id,
  listing_id = excluded.listing_id,
  action = excluded.action,
  material_id = excluded.material_id,
  material_amount = excluded.material_amount,
  coin_amount = excluded.coin_amount,
  metadata = excluded.metadata;
