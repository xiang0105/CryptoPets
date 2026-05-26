# CryptoPets 後端說明

後端使用 Express 與 TypeScript，負責錢包登入、玩家資料、素材背包、市場、遠征、好友與交易 API。資料庫使用 Supabase PostgreSQL。

## 資料來源策略

- 測試階段：使用資料庫資料，素材背包來源為 `local-db`。
- 正式階段：使用鏈上資料加資料庫資料，素材背包來源可切換為 `chain-db`。
- 鏈上資料負責資產 ownership 與 material balance；資料庫負責玩家狀態、交易紀錄與快取。

## 環境變數

請參考 `backend/.env.example` 建立 `backend/.env`。

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

## API

- `GET /health`
- `POST /auth/nonce`
- `POST /auth/login`
- `GET /player`
- `GET /resources`
- `GET /materials/backpack`
- `POST /start-expedition`
- `POST /claim-reward`
- `GET /market/listings`
- `POST /market/listings`
- `POST /market/cancel-listing`
- `POST /market/buy-listing`
- `GET /transactions`
- `POST /add-friend`
- `GET /friends`

## 素材背包

`GET /materials/backpack` 回傳 `MaterialBackpack`：

- `coins`：玩家金幣。
- `inventory`：素材數量資料。
- `source`：`local-db` 或 `chain-db`。
- `syncedAt`：資料同步時間。
- `chain`：chain id、素材合約地址與鏈上來源是否啟用。

## 指令

```bash
npm run dev:backend
npm run build:backend
npm --workspace backend run type-check
npm --workspace backend run start
```
