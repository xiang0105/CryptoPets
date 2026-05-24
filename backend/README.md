# CryptoPets Backend

後端是 Express + TypeScript API server，負責玩家驗證、資料庫讀寫、遊戲機制、市場、遠征、好友流程，以及未來上鏈接口。前端只能透過後端 API 取得授權後的玩家資料。

## 職責

- MetaMask nonce、signature 驗證與 JWT 發放。
- Supabase PostgreSQL 資料讀寫。
- 玩家初始化、寵物快取、素材庫存、貨幣、市場、交易、遠征與好友流程。
- 遠征獎勵、商品市場結算等遊戲邏輯。
- 未來串接 RPC、合約、indexer、relayer 與 token metadata service。

## Env

請從 `backend/.env.example` 建立 `backend/.env`。

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
CHAIN_ID=1
```

變數說明：

- `NODE_ENV`：執行環境，常用值為 `development` 或 `production`。
- `PORT`：後端 HTTP server port。本地預設 `3400`。
- `CORS_ORIGIN`：允許呼叫 API 的前端來源。本地預設 `http://localhost:5400`。
- `JWT_SECRET`：簽發登入 JWT 的密鑰，正式環境必須使用長且不可預測的字串。
- `SUPABASE_URL`：Supabase 專案 URL。
- `SUPABASE_SERVICE_ROLE_KEY`：後端專用 service role key。只能放後端，不能放前端或任何 `VITE_` 變數。
- `WEB3_LOGIN_DOMAIN`：錢包簽名訊息中的 domain，需與前端網域一致。
- `WEB3_LOGIN_STATEMENT`：錢包簽名訊息中的登入說明。
- `RPC_URL`：未來讀取鏈上資料或送交易用 RPC endpoint。目前上鏈未實作，可先保留範本。
- `NFT_CONTRACT_ADDRESS`：未來水豚 NFT 合約位址。目前上鏈未實作，可先保留零地址。
- `CHAIN_ID`：目標鏈 ID，用於簽名驗證、合約讀取或鏈上資料同步。

## 資料庫使用方式

資料庫使用 Supabase PostgreSQL。Schema 位於：

```text
backend/supabase/schema.sql
```

開發或重置測試資料用 SQL：

```text
backend/supabase/clear_game_data.sql
```

建立資料庫：

1. 建立 Supabase project。
2. 到 Supabase SQL Editor。
3. 貼上並執行 `backend/supabase/schema.sql`。
4. 將 Supabase project URL 填入 `SUPABASE_URL`。
5. 將 service role key 填入 `SUPABASE_SERVICE_ROLE_KEY`。
6. 啟動後端，透過 API 讀寫資料。

資料庫目前保存遊戲機制資料，例如：

- `users`：錢包 address 對應的玩家帳號。
- `auth_nonces`：MetaMask 登入簽名用 nonce。
- `pets`：目前測試用或未來鏈上同步後的水豚快取。
- `pet_teams`：玩家隊伍配置。
- `currencies`：遊戲內金幣。
- `inventory`：素材庫存快取。
- `market_listings`：商品市場上架資料。
- `transactions`：市場、獎勵、升級等交易紀錄。
- `expeditions`：遠征開始、完成、獎勵領取紀錄。
- `friends`、`friend_requests`：好友與邀請資料。

資料庫與鏈上分工：

- 鏈上最終會提供玩家 address、水豚 NFT ownership、素材或道具 ownership。
- 資料庫保存遊戲流程與查詢友善資料，例如市場上架、遠征紀錄、交易紀錄、好友關係、快取與索引。
- 因為上鏈尚未實作，目前水豚與素材會先用本地測試資料或資料庫快取代替。
- 未來接上鏈上資料後，後端會改成由合約或 indexer 抓取 ownership，再同步或快取到資料庫。

`clear_game_data.sql` 只適合開發環境，執行前請確認要清除的表與資料範圍。

## API

- `GET /health`
- `POST /auth/nonce`
- `POST /auth/login`
- `GET /player`
- `GET /resources`
- `POST /start-expedition`
- `POST /claim-reward`
- `GET /market/listings`
- `POST /market/listings`
- `POST /market/cancel-listing`
- `POST /market/buy-listing`
- `GET /transactions`
- `POST /add-friend`
- `GET /friends`

## 指令

```bash
npm run dev:backend
npm run build:backend
npm --workspace backend run type-check
npm --workspace backend run start
```
