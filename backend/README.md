# CryptoPets 後端說明

`backend` 是 CryptoPets 的 API 伺服器，使用 Express、TypeScript、Supabase 與 ethers。後端負責錢包簽名登入、玩家資料、遠征、市場、好友、素材背包，以及正式階段的鏈上資料彙整。

後端是遊戲狀態的可信任入口。前端可以連錢包與送出操作，但玩家是否擁有 Pet NFT、素材餘額是否足夠、遠征與市場狀態是否有效，應由後端透過資料庫與鏈上資料驗證。

## 後端負責事項

- 發 nonce、驗證錢包簽名並簽發 JWT。
- 管理玩家資料、寵物資料、遠征、素材、市場、交易紀錄與好友資料。
- 使用 Supabase PostgreSQL 儲存不上鏈的遊戲狀態。
- 使用 `@cryptopets/game-content` 驗證素材 ID 與內容資料。
- 使用 `@cryptopets/shared` 維持 API 型別一致。
- 正式階段讀取 Pet ERC-721 與 Material ERC-1155 資料，彙整後提供 API。
- 維護鏈上資料、資料庫快取與同步時間的邊界。
- MVP 市場維持 Supabase DB 市場；真正上鏈的資產只有 ERC-721 Pet 與 ERC-1155 Material。
- 透過 `MaterialBalanceProvider` 管理素材餘額，讓目前的 Supabase `inventory` 實作未來可替換為索引器或鏈上資料來源。
- 測試階段不發起 Sepolia 轉帳；遠征獎勵只回傳 Sepolia 提示，市場只記錄使用者輸入的 Sepolia 價格。

## 資料夾階層

```text
backend/
├── src/
│   ├── config/          環境變數與 Supabase 用戶端
│   ├── controllers/     Express 控制器，處理請求與回應
│   ├── middleware/      驗證、錯誤處理等中介層
│   ├── routes/          API 路由註冊
│   ├── services/        遊戲規則、資料庫操作、素材餘額提供者與未來鏈上整合
│   ├── utils/           HTTP 錯誤與非同步處理等工具
│   ├── app.ts           Express app 組裝
│   └── index.ts         伺服器進入點
├── supabase/
│   ├── schema.sql       Supabase 結構、索引、RLS 政策
│   ├── migrations/      可排序、可審查的正式 migration SQL
│   ├── seed_game_data.sql
│   └── clear_game_data.sql
├── Blockchain.md        鏈上資產與中繼資料實作規格
└── package.json         後端工作區指令與依賴
```

## API

目前路由定義在 `src/routes/index.ts` 與 `src/routes/authRoutes.ts`。

- `GET /health`
- `POST /auth/nonce`
- `POST /auth/login`
- `GET /player`
- `GET /resources`
- `GET /materials/backpack`
- `POST /start-expedition`
- `POST /claim-reward`
- `GET /expedition/logs`
- `GET /market/listings`
- `POST /market/listings`
- `POST /market/cancel-listing`
- `POST /market/buy-listing`
- `GET /transactions`
- `POST /add-friend`
- `GET /friends`

## 遠征紀錄

遠征紀錄由後端寫入 Supabase `expedition_logs`，前端只透過 `GET /expedition/logs` 讀取對應玩家的紀錄，不再自行產生或保存正式遠征 log。

- 開始遠征時，後端依遠征劇本、隊伍寵物與劇本事件寫入多筆排程紀錄。
- 查詢紀錄時，只回傳 `occurred_at <= now()` 的可見紀錄，避免未發生事件提前出現在前端。
- 領取獎勵時，後端追加一筆 `notice` 紀錄，說明已確認的 Sepolia 測試幣提示、EXP 與素材。測試階段只顯示 Sepolia 數值，不發起任何轉帳。
- API 回傳使用 `camelCase`，資料庫欄位使用 `snake_case`；訊息同時保存 `zh` 與 `en` 版本，前端依語系顯示。

## 市場與素材餘額

MVP 階段市場完全透過 Supabase 運作：

- 上架素材：從賣家的 `inventory` 扣除素材，新增 `market_listings`，寫入 `transactions`。
- 取消上架：將 `market_listings.status` 改為 `cancelled`，素材加回賣家 `inventory`。
- 購買素材：掛單價格由上架者自行輸入 Sepolia 測試幣數值；測試階段不扣款、不轉帳，只把掛單改為 `sold`、把素材加到買家背包，並寫入雙方 `transactions`。

目前 `currencies.coins` 與 `transactions.coin_amount` 是資料庫相容欄位，不代表專案仍使用舊版內部幣別經濟。對外 API 以 `sepoliaBalance`、`sepoliaAmount` 命名；測試階段固定不進行 Sepolia 扣款或轉帳。

素材餘額的讀取與增減集中在 `src/services/materialBalanceProvider.ts`：

- `MaterialBalanceProvider` 定義素材餘額介面。
- `SupabaseMaterialBalanceProvider` 是目前 MVP 實作，包住 Supabase `inventory`。
- 未來接鏈時可新增 `IndexedMaterialBalanceProvider` 或 `ChainMaterialBalanceProvider`，避免市場與遠征邏輯直接依賴 `inventory` 資料表。

## 命名與資料格式規則

- API 回應使用 `camelCase`。
- Supabase 資料庫欄位使用 `snake_case`。
- 錢包地址應正規化為小寫 `0x` 地址。
- Material ID 沿用 `game-content` 的 `MAT-{element}{grade}` 格式。
- API 路徑沿用現有命名，本次文件工作不改路由。

## 環境變數

請參考 `backend/.env.example` 建立 `backend/.env`。如果要跑完整串接測試，可以改填 `backend/.env.e2e`，並且只使用測試 Supabase 專案、測試 RPC、測試合約與測試密鑰。

```text
NODE_ENV=development
PORT=3400
CORS_ORIGIN=http://localhost:5400
JWT_SECRET=replace-with-a-long-random-secret

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

WEB3_LOGIN_DOMAIN=localhost:5400
WEB3_LOGIN_STATEMENT=Sign in to CryptoPets

RPC_URL=https://mainnet.infura.io/v3/your-key
NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
MATERIAL_BACKPACK_SOURCE=local-db
MATERIAL_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
CHAIN_ID=1
```

後端密鑰只能放在後端環境變數，不可暴露到前端。

| 變數 | 用途 | 取得方式 |
| --- | --- | --- |
| `NODE_ENV` | 後端執行環境。 | 本機開發用 `development`，自動化或完整串接測試可用 `test`。 |
| `PORT` | 後端 API 監聽 port。 | 本機預設 `3400`；若 port 被占用可改其他值，前端 `VITE_API_BASE_URL` 要同步更新。 |
| `CORS_ORIGIN` | 允許呼叫後端的前端網址。 | 本機前端預設 `http://localhost:5400`；部署後填正式或測試前端網址。 |
| `JWT_SECRET` | 簽發與驗證登入 JWT。 | 自行產生長隨機字串。測試、staging、production 應使用不同值。 |
| `SUPABASE_URL` | Supabase 專案 URL。 | 到 Supabase 專案的 Project Settings > API 複製 Project URL。 |
| `SUPABASE_SERVICE_ROLE_KEY` | 後端操作 Supabase 的高權限 key。 | 到 Supabase 專案的 Project Settings > API 複製 service_role key。只能放後端，不可放前端或提交到版本控制。 |
| `WEB3_LOGIN_DOMAIN` | 錢包簽名登入訊息綁定的 domain。 | 本機可填 `localhost:5400`；部署後填前端網域，不含 `https://`。 |
| `WEB3_LOGIN_STATEMENT` | 錢包簽名視窗顯示的登入說明。 | 自訂文字，例如 `Sign in to CryptoPets`；測試環境可加上 `test` 方便辨識。 |
| `RPC_URL` | 後端讀取鏈上資料使用的 RPC endpoint。 | 從 Infura、Alchemy、QuickNode 或自架節點取得。測試請使用測試鏈 RPC，不建議用正式主網 RPC 做開發測試。 |
| `NFT_CONTRACT_ADDRESS` | Pet ERC-721 合約地址。 | 合約部署完成後由部署輸出、區塊鏈瀏覽器或合約管理平台取得；尚未部署可暫填全 0 地址。 |
| `MATERIAL_BACKPACK_SOURCE` | 素材背包資料來源。 | 目前 MVP 使用 `local-db` 讀 Supabase `inventory`；接入 ERC-1155 或索引器後再改 `chain-db`。 |
| `MATERIAL_CONTRACT_ADDRESS` | Material ERC-1155 合約地址。 | 合約部署完成後由部署輸出、區塊鏈瀏覽器或合約管理平台取得；尚未部署可暫填全 0 地址。 |
| `CHAIN_ID` | 後端驗證與鏈上讀取使用的 chain id。 | 依目標鏈填入，例如 Ethereum mainnet 是 `1`；測試鏈請填該測試鏈 chain id。 |

產生 `JWT_SECRET` 時，可以使用密碼管理器產生長隨機字串，或在本機用 Node 產生：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 資料庫 Migration 與 Seed

資料庫流程說明在 `backend/supabase/README.md`。

- `supabase/schema.sql` 是完整資料庫結構快照，適合重建本機或 staging 資料庫。
- `supabase/migrations/` 是正式 migration 流程，檔名使用 `NNNN_description.sql`，依字典序套用。
- `supabase/seed_game_data.sql` 建立可登入玩家、初始寵物、素材餘額、市場掛單與好友資料。
- `supabase/clear_game_data.sql` 可清除遊戲狀態，預設保留 users 與登入 nonce 歷史。

新環境建議順序：

1. 執行 `supabase/schema.sql`。
2. 依序執行 `supabase/migrations/*.sql`。
3. 開發或 staging 需要測試資料時執行 `supabase/seed_game_data.sql`。

## 後續缺口二次確認

- `GET /player` 已可回傳玩家、寵物與 active expedition，但正式 Pet NFT ownership 尚未接入。
- `GET /materials/backpack` 已可回傳 `local-db` 背包，但正式 ERC-1155 或 indexer balance 尚未接入。
- 市場流程已完成 DB 掛單、購買、取消與交易紀錄，但測試階段不做 Sepolia 轉帳；正式轉帳合約與後端交易確認流程尚未完成。
- 遠征紀錄已由後端寫入 `expedition_logs`，但 production logging、監控、rate limit 與安全 header 尚未完成。
- `API_ERRORS.md` 已列出目前 API 錯誤碼；若新增鏈上合約流程，需要同步新增鏈上錯誤碼與前端轉譯。

## 開發指令

```bash
npm run dev:backend
npm run build:backend
npm --workspace backend run type-check
npm --workspace backend run start
```
