# 後端任務

後端是玩家資料、錢包驗證、遠征、市場、好友、背包與鏈上彙整狀態的可信任入口。前端只送出使用者操作，所有狀態判定、資產變更與錯誤碼都應由後端回傳。

## 專案基礎

- [x] 建立 Express + TypeScript backend workspace。
  - 驗收：`backend/package.json`、`tsconfig.json`、`src/index.ts` 可透過 workspace script build。
- [x] 建立 Express app、router、controller、service 分層。
  - 驗收：route 只負責 HTTP wiring，controller 只處理 request/response，主要商業邏輯在 service。
- [x] 建立環境變數 validation 與 Supabase client。
  - 驗收：啟動時會驗證 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`JWT_SECRET`、CORS 與鏈上設定。
- [x] 建立共用錯誤處理與 async handler。
  - 驗收：Zod validation 回 `VALIDATION_ERROR`，業務錯誤回穩定錯誤碼。

## 登入驗證

- [x] 建立錢包登入 nonce API。
  - 驗收：`POST /auth/nonce` 產生一次性 nonce、message、expiresAt，並寫入 `auth_nonces`。
- [x] 建立錢包簽名登入 API。
  - 驗收：`POST /auth/login` 驗證 nonce、message、signature、過期時間與已使用狀態。
- [x] 建立 JWT session。
  - 驗收：登入成功回傳 token，token payload 包含 user id 與 wallet，issuer/audience 固定。
- [x] 建立 JWT auth middleware。
  - 驗收：受保護 API 無 token 回 `AUTH_REQUIRED`，無效 token 回 `INVALID_AUTH_TOKEN`。
- [x] 補齊登入驗證 integration tests。
  - 驗收：涵蓋 nonce 建立、成功登入、錯誤簽名、過期 nonce、重複使用 nonce。

## 玩家與寵物資料

- [x] 建立玩家初始化流程。
  - 驗收：首次登入會建立 user、starter pets、currencies 初始資料。
- [x] 建立 `GET /player`。
  - 驗收：回傳 `PlayerProfile`，包含 wallet、pets、activeExpedition、chain 狀態。
- [x] 建立鏈上寵物狀態回傳。
  - 驗收：未設定 RPC 或 NFT contract 時 `chain.enabled=false` 且 `nftContractAddress=null`。
- [ ] 接入正式 Pet NFT ownership 來源。
  - 驗收：後端以 ERC-721 或 indexer 驗證玩家持有權，不依賴前端宣告。
- [x] 建立玩家資料 service tests。
  - 驗收：初始化 idempotent，已存在玩家不會重複建立 pets。

## 素材背包與資產彙整

- [x] 建立 `MaterialBalanceProvider` 介面。
  - 驗收：市場與遠征都透過 provider 增減素材，不直接散落操作 `inventory`。
- [x] 建立 `SupabaseMaterialBalanceProvider`。
  - 驗收：可 list/increase/decrease balance，餘額不足回穩定錯誤碼。
- [x] 建立 `GET /resources`。
  - 驗收：回傳 `sepoliaBalance` 相容欄位與 inventory；測試階段 `sepoliaBalance` 不代表可用交易餘額。
- [x] 建立 `GET /materials/backpack`。
  - 驗收：回傳 `MaterialBackpack`，包含 `source`、`syncedAt`、`chain.enabled`、chain id 與 contract address。
- [x] 未實作鏈上素材時回傳不可用狀態。
  - 驗收：未設定 RPC 或 material contract 時 `chain.enabled=false` 且 `materialContractAddress=null`。
- [ ] 接入正式 ERC-1155 Material balance 來源。
  - 驗收：新增 `IndexedMaterialBalanceProvider` 或 `ChainMaterialBalanceProvider`，並保持市場/遠征 service 不改呼叫介面。

## 遠征流程

- [x] 建立 `POST /start-expedition`。
  - 驗收：驗證玩家擁有 pet ids、阻止重複遠征、寫入 `expeditions`，回傳 `ExpeditionSummary`。
- [x] 建立 `POST /claim-reward`。
  - 驗收：驗證遠征存在、屬於玩家、已完成且未領取，成功後更新 status/reward/claimed_at。
- [x] 遠征獎勵寫入玩家資產。
  - 驗收：領獎後顯示 Sepolia 測試幣提示但不轉帳，素材 balance 增加、pets exp 增加。
- [x] 遠征獎勵寫入交易紀錄。
  - 驗收：領獎後 `transactions.action='reward'`，metadata 包含 expeditionId、exp、materials。
- [x] 套用森林 ID migration。
  - 驗收：資料庫接受 `orange`、`apple`、`snow-peach` 作為 `expedition_type`。
- [x] 完成遠征 full-stack E2E。
  - 驗收：nonce/login/player/backpack/start/wait/claim/backpack/transactions 全流程通過。
- [x] 補齊遠征 integration tests。
  - 驗收：涵蓋成功開始、重複開始、非本人 pet、未完成領獎、重複領獎、獎勵入帳。

## 市場流程

- [x] 建立市場列表查詢。
  - 驗收：`GET /market/listings` 回 active listings，seller wallet 以 shared type camelCase 回傳。
- [x] 建立素材上架。
  - 驗收：`POST /market/listings` 驗證素材 ID、數量、價格，並扣除賣家素材。
- [x] 建立取消上架。
  - 驗收：`POST /market/cancel-listing` 驗證 listing ownership，取消後素材返還賣家。
- [x] 建立購買上架。
  - 驗收：`POST /market/buy-listing` 阻止購買自己的 listing；測試階段不扣款、不轉帳，只加買家素材並更新 listing 狀態。
- [x] 建立市場交易紀錄。
  - 驗收：list/cancel/buy/sell 都寫入 `transactions`。
- [x] 補齊市場 integration tests。
  - 驗收：涵蓋測試階段不轉帳、素材不足、非本人取消、成功交易與衝突狀態。

## 好友流程

- [x] 建立新增好友 request。
  - 驗收：不可加自己，找不到 wallet 回 `FRIEND_WALLET_NOT_FOUND`。
- [x] 建立互相邀請自動接受。
  - 驗收：存在 reciprocal pending request 時建立雙向 friendship。
- [x] 建立好友列表查詢。
  - 驗收：`GET /friends` 回 `FriendSummary[]`。
- [x] 補齊好友 integration tests。
  - 驗收：涵蓋 pending、accepted、self、unknown wallet。

## API 合約與驗證

- [x] 使用 `@cryptopets/shared` 回傳核心 API type。
  - 驗收：前後端共用 `PlayerProfile`、`MaterialBackpack`、`ExpeditionSummary`、`MarketListing` 等型別。
- [x] 使用 shared request type 對齊前後端參數名稱。
  - 驗收：`StartExpeditionRequest`、`ClaimRewardRequest`、`ListMarketMaterialRequest`、`ListingIdRequest`、`AddFriendRequest` 由前後端共同引用。
- [x] 為主要 mutation 加上 Zod body validation。
  - 驗收：auth、friend、market、expedition mutation 都有 schema。
- [x] 強化所有 request body 與 query validation。
  - 驗收：所有公開 API 的 input 都有明確 schema，錯誤回 `VALIDATION_ERROR`。
- [x] 建立 API error code 對照文件。
  - 驗收：列出每個 endpoint 可能錯誤碼，前端可據此顯示提示。

## 資料庫與 Migration

- [x] 建立 Supabase schema、index 與清除測試資料 SQL。
  - 驗收：`backend/supabase/schema.sql` 與 `clear_game_data.sql` 可重建 MVP 資料結構。
- [x] 建立遠征森林 ID migration。
  - 驗收：`migrate_expedition_type_to_forests.sql` 將 constraint 改為 `orange/apple/snow-peach`。
- [x] 建立正式 migration 流程。
  - 驗收：不只 schema dump，還有可排序、可重跑、可審查的 migration 檔案。
- [x] 補齊 seed 或測試資料建立流程。
  - 驗收：能建立可登入玩家、素材餘額、市場 listing 與好友資料。

## 營運與安全

- [ ] 建立 Pet ERC-721 合約。
  - 驗收：合約支援 mint、ownerOf、tokenURI、baseURI 或 per-token URI、角色權限與事件；後端可用 tokenId 查詢玩家持有權。
- [ ] 建立 Material ERC-1155 合約。
  - 驗收：合約支援 mint/burn、balanceOf、uri、批量查詢友善介面、角色權限與事件；後端可用 wallet + material tokenId 查詢餘額。
- [ ] 建立 Sepolia 交易/轉帳合約。
  - 驗收：正式開啟交易前，合約規格明確定義付款方、收款方、金額、listingId、事件與防重放；測試階段不得由前端或後端發起實際轉帳。
- [ ] 建立鏈上合約部署與地址管理文件。
  - 驗收：記錄 chain id、合約地址、部署者、角色權限、RPC、區塊鏈瀏覽器連結與前後端 env 對應。
- [ ] 補齊 production logging。
  - 驗收：request id、endpoint、status、duration、錯誤碼可追蹤，不輸出 secret。
- [ ] 補齊 rate limit。
  - 驗收：auth 與 mutation endpoint 有基本濫用保護。
- [ ] 強化 CORS allowlist 與 Helmet 設定。
  - 驗收：production 只允許指定前端 origin。
- [ ] 補齊 secret 管理與部署檢查。
  - 驗收：文件明確列出 Render/Supabase/前端需要的 env，且不把 private key 放入 `VITE_`。
- [ ] 補齊 CI。
  - 驗收：pull request 執行 type-check、build 與測試。
