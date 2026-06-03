-- 僅供開發與 staging 環境重置資料。
-- 這會清除已索引的遊戲資料，讓應用程式可從錢包持有的鏈上資產重新建立狀態。

truncate table public.transactions restart identity cascade;
truncate table public.market_listings restart identity cascade;
truncate table public.expeditions restart identity cascade;
truncate table public.pet_teams restart identity cascade;
truncate table public.inventory restart identity cascade;
truncate table public.currencies restart identity cascade;
truncate table public.pets restart identity cascade;
truncate table public.friend_requests restart identity cascade;
truncate table public.friends restart identity cascade;

-- 預設保留 public.users 與 public.auth_nonces，避免破壞錢包登入歷史。
-- 只有需要完整重置登入資料時，才取消註解以下兩行：
-- truncate table public.auth_nonces restart identity cascade;
-- truncate table public.users restart identity cascade;
